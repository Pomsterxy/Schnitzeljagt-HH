import type { Category, DistrictId, LatLng, Poi, Station } from '../data/types';
import { walkDistance, walkMinutes } from './geo';

export interface RouteOptions {
  districts: DistrictId[];
  start: LatLng;
  /** Gesamtdauer in Minuten */
  minutes: number;
  /** Gehtempo in km/h (Familien mit kleinen Kindern langsamer) */
  kmh: number;
  includeQuiet: boolean;
  includePause: boolean;
  /** Zufallssamen für "Neu würfeln" */
  seed: number;
  /** Themen-Tour: Stationen dieser Kategorie werden stark bevorzugt */
  theme?: Category | 'mix';
  /** Multi-Cache-Finale (Schatz) am Ende einplanen */
  cache?: boolean;
}

export type RouteStop =
  | { kind: 'station'; station: Station }
  | { kind: 'pause'; poi: Poi }
  | { kind: 'final'; poi: Poi };

export interface Route {
  stops: RouteStop[];
  meters: number;
  minutes: number;
}

/** Kleiner deterministischer Zufallsgenerator (mulberry32) */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const PAUSE_MINUTES = 15;
/** Koordinaten berechnen + Schatz suchen */
export const FINAL_MINUTES = 10;

function stopCoords(s: RouteStop): LatLng {
  return s.kind === 'station' ? s.station.coords : s.poi.coords;
}
function stopDwell(s: RouteStop): number {
  return s.kind === 'station' ? s.station.dwell : s.kind === 'pause' ? PAUSE_MINUTES : FINAL_MINUTES;
}

export function measure(start: LatLng, stops: RouteStop[], kmh: number): { meters: number; minutes: number } {
  let meters = 0;
  let dwell = 0;
  let prev = start;
  for (const s of stops) {
    const c = stopCoords(s);
    meters += walkDistance(prev, c);
    dwell += stopDwell(s);
    prev = c;
  }
  return { meters, minutes: walkMinutes(meters, kmh) + dwell };
}

function pathMeters(start: LatLng, pts: LatLng[]): number {
  let m = 0;
  let prev = start;
  for (const p of pts) {
    m += walkDistance(prev, p);
    prev = p;
  }
  return m;
}

/** 2-opt: dreht Teilstücke um, solange die Strecke kürzer wird (offener Weg ab Start) */
function twoOpt(start: LatLng, list: Station[]): Station[] {
  let best = list.slice();
  let improved = true;
  let guard = 0;
  while (improved && guard++ < 50) {
    improved = false;
    for (let i = 0; i < best.length - 1; i++) {
      for (let k = i + 1; k < best.length; k++) {
        const cand = best.slice(0, i).concat(best.slice(i, k + 1).reverse(), best.slice(k + 1));
        if (
          pathMeters(start, cand.map((s) => s.coords)) + 0.5 <
          pathMeters(start, best.map((s) => s.coords))
        ) {
          best = cand;
          improved = true;
        }
      }
    }
  }
  return best;
}

/** Zwei Gedenkorte nicht direkt hintereinander, wenn es sich vermeiden lässt */
function spreadQuiet(list: Station[]): Station[] {
  const out = list.slice();
  for (let i = 1; i < out.length; i++) {
    if (out[i].mode === 'quiet' && out[i - 1].mode === 'quiet') {
      const j = out.findIndex((s, idx) => idx > i && s.mode !== 'quiet');
      if (j > 0) {
        const [s] = out.splice(j, 1);
        out.splice(i, 0, s);
      }
    }
  }
  return out;
}

/**
 * Orienteering-Heuristik: Stationen werden nach "Spannung pro Zusatzminute"
 * eingefügt, bis das Zeitbudget voll ist. Danach wird die Reihenfolge optimiert.
 */
export function generateRoute(all: Station[], pois: Poi[], opt: RouteOptions): Route {
  const rand = rng(opt.seed);
  const pauseBudget = opt.includePause && opt.minutes >= 60 ? PAUSE_MINUTES : 0;
  // Finale: Rechnen/Suchen + ca. 250 m Weg zum Schatz
  const finalBudget = opt.cache ? FINAL_MINUTES + walkMinutes(250 * 1.3, opt.kmh) : 0;
  const budget = opt.minutes - pauseBudget - finalBudget;

  const pool = all.filter(
    (s) => opt.districts.includes(s.district) && (opt.includeQuiet || s.mode === 'normal'),
  );
  const jitter = new Map(pool.map((s) => [s.id, 0.6 + rand() * 0.8]));
  const themed = opt.theme && opt.theme !== 'mix' ? opt.theme : null;
  const value = (s: Station) =>
    s.appeal * (jitter.get(s.id) ?? 1) * (themed ? (s.categories.includes(themed) ? 4 : 0.35) : 1);

  let chosen: Station[] = [];
  const cost = (list: Station[]) =>
    walkMinutes(pathMeters(opt.start, list.map((s) => s.coords)), opt.kmh) +
    list.reduce((a, s) => a + s.dwell, 0);

  const remaining = new Set(pool);
  for (;;) {
    let best: { list: Station[]; ratio: number; s: Station } | null = null;
    const base = cost(chosen);
    for (const s of remaining) {
      // günstigste Einfügeposition
      for (let pos = 0; pos <= chosen.length; pos++) {
        const list = chosen.slice(0, pos).concat([s], chosen.slice(pos));
        const c = cost(list);
        if (c > budget) continue;
        const ratio = value(s) / Math.max(c - base, 1);
        if (!best || ratio > best.ratio) best = { list, ratio, s };
      }
    }
    if (!best) break;
    chosen = best.list;
    remaining.delete(best.s);
  }

  chosen = spreadQuiet(twoOpt(opt.start, chosen));

  const stops: RouteStop[] = chosen.map((station) => ({ kind: 'station', station }));

  const candidates = pois.filter((p) => opt.districts.includes(p.district));
  const list = candidates.length ? candidates : pois;

  // Pause etwa in der Mitte: Ort mit dem kleinsten Umweg zwischen zwei Stationen
  const insertPause = (base: RouteStop[]): RouteStop[] => {
    if (!pauseBudget || base.length < 2 || !list.length) return base;
    const mid = Math.floor(base.length / 2);
    const a = stopCoords(base[mid - 1]);
    const b = stopCoords(base[mid]);
    let bestPoi = list[0];
    let bestScore = Infinity;
    for (const p of list) {
      const d = walkDistance(a, p.coords) + walkDistance(p.coords, b) - walkDistance(a, b);
      // Eisdielen und Spielplätze mit Namen leicht bevorzugen
      const score = d - (p.kind === 'eis' ? 60 : 0) - (p.kind === 'spielplatz' && p.title !== 'Spielplatz' ? 40 : 0);
      if (score < bestScore) {
        bestScore = score;
        bestPoi = p;
      }
    }
    const out = base.slice();
    out.splice(mid, 0, { kind: 'pause', poi: bestPoi });
    return out;
  };

  // Schatz-Finale: ein öffentlicher Spielplatz 100–800 m nach der letzten Station (ideal ~250 m)
  const addFinal = (base: RouteStop[]): RouteStop[] => {
    if (!opt.cache || !base.length) return base;
    const last = stopCoords(base[base.length - 1]);
    const used = new Set(base.map((s) => (s.kind === 'station' ? s.station.id : s.poi.id)));
    const spots = list.filter((p) => p.kind === 'spielplatz' && !used.has(p.id));
    let best: Poi | null = null;
    let bestScore = Infinity;
    for (const p of spots) {
      const d = walkDistance(last, p.coords);
      if (d < 100) continue;
      const score = Math.abs(d - 250) + rand() * 60;
      if (d < 800 && score < bestScore) {
        bestScore = score;
        best = p;
      }
    }
    return best ? [...base, { kind: 'final', poi: best }] : base;
  };

  const build = (base: RouteStop[], withPause: boolean, withFinal: boolean) => {
    let r = base;
    if (withPause) r = insertPause(r);
    if (withFinal) r = addFinal(r);
    return r;
  };

  // Wenn Pause oder Finale das Budget sprengen: am wenigsten spannende Station streichen
  const base = stops.slice();
  let result = build(base, true, true);
  while (measure(opt.start, result, opt.kmh).minutes > opt.minutes && base.length > 1) {
    let worst = 0;
    base.forEach((s, i) => {
      if (s.kind === 'station' && value(s.station) < value((base[worst] as { station: Station }).station)) worst = i;
    });
    base.splice(worst, 1);
    result = build(base, true, true);
  }
  if (measure(opt.start, result, opt.kmh).minutes > opt.minutes) result = build(base, false, true);
  if (measure(opt.start, result, opt.kmh).minutes > opt.minutes) result = build(base, false, false);
  stops.splice(0, stops.length, ...result);

  const m = measure(opt.start, stops, opt.kmh);
  return { stops, meters: m.meters, minutes: m.minutes };
}
