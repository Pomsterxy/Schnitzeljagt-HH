import type { Category, DistrictId, LatLng, Poi, Station } from '../data/types';
import { DETOUR, distance, walkDistance, walkMinutes } from './geo';

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
  /** Längste erlaubte Etappe in Metern (Luftlinie); Standard 500, Infinity = egal */
  maxLeg?: number;
}

export type RouteStop =
  | { kind: 'station'; station: Station }
  | { kind: 'pause'; poi: Poi }
  | { kind: 'waypoint'; poi: Poi }
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
/** Längste Etappe zwischen zwei Zielpunkten (Luftlinie) */
export const MAX_LEG = 500;
/** Ein Weg über Zwischenziele darf höchstens so viel länger sein als die Luftlinie */
export const MAX_DETOUR = 1.3;
/** Kurzer Halt an einem Zwischenziel */
export const WAYPOINT_MINUTES = 1;
/** Koordinaten berechnen + Schatz suchen */
export const FINAL_MINUTES = 10;

function stopCoords(s: RouteStop): LatLng {
  return s.kind === 'station' ? s.station.coords : s.poi.coords;
}
function stopDwell(s: RouteStop): number {
  return s.kind === 'station' ? s.station.dwell : s.kind === 'pause' ? PAUSE_MINUTES : s.kind === 'waypoint' ? WAYPOINT_MINUTES : FINAL_MINUTES;
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

/** Ein Knoten im Wegenetz: Start, Station oder Zwischenziel (Spielplatz, Eisdiele, WC …) */
interface Node {
  coords: LatLng;
  station?: Station;
  poi?: Poi;
}

/** Weg zwischen zwei Stationen: Zwischenziele dazwischen, Meter (geschätzter Fußweg) und Minuten */
interface Leg {
  via: Poi[];
  meters: number;
  minutes: number;
}

/** Aufschlag pro Zwischenziel, damit Etappen eher lang (bis 500 m) statt kleinteilig werden */
const HOP_PENALTY = 140;

/**
 * Wegenetz: Kanten nur zwischen Punkten, die höchstens MAX_LEG auseinander liegen.
 * Dijkstra liefert pro Station die kürzeste Kette von Zwischenzielen.
 */
class Network {
  nodes: Node[];
  private adj: { to: number; d: number }[][];
  private cache = new Map<number, { dist: number[]; prev: number[] }>();

  constructor(start: LatLng, stations: Station[], pois: Poi[], maxLeg: number) {
    this.nodes = [{ coords: start }, ...stations.map((station) => ({ coords: station.coords, station })), ...pois.map((poi) => ({ coords: poi.coords, poi }))];
    const n = this.nodes.length;
    this.adj = this.nodes.map(() => []);
    for (let i = 0; i < n; i++) {
      for (let k = i + 1; k < n; k++) {
        const d = distance(this.nodes[i].coords, this.nodes[k].coords);
        if (d <= maxLeg) {
          this.adj[i].push({ to: k, d });
          this.adj[k].push({ to: i, d });
        }
      }
    }
    // Liegt der Start abseits (z. B. GPS oder eine Haltestelle am Rand), darf der erste Weg
    // länger sein. Diese Kanten sind "teuer" und werden nur genommen, wenn es anders nicht geht.
    for (let i = 1; i < n; i++) {
      const d = distance(start, this.nodes[i].coords);
      if (d > maxLeg && d < 2500) this.adj[0].push({ to: i, d: d * 4 });
    }
    if (!this.adj[0].length) {
      const near = this.nodes
        .map((nd, i) => ({ i, d: distance(start, nd.coords) }))
        .filter((x) => x.i > 0)
        .sort((a, b) => a.d - b.d)
        .slice(0, 6);
      for (const x of near) this.adj[0].push({ to: x.i, d: x.d * 4 });
    }
  }

  private run(src: number) {
    let r = this.cache.get(src);
    if (r) return r;
    const n = this.nodes.length;
    const dist = new Array<number>(n).fill(Infinity);
    const prev = new Array<number>(n).fill(-1);
    const done = new Uint8Array(n);
    dist[src] = 0;
    for (;;) {
      let u = -1;
      for (let i = 0; i < n; i++) if (!done[i] && dist[i] < Infinity && (u < 0 || dist[i] < dist[u])) u = i;
      if (u < 0) break;
      done[u] = 1;
      // Start und Stationen sind keine Durchgangspunkte, nur Zwischenziele (POIs)
      if (u !== src && (u === 0 || this.nodes[u].station)) continue;
      for (const e of this.adj[u]) {
        const w = dist[u] + e.d + HOP_PENALTY;
        if (w < dist[e.to]) {
          dist[e.to] = w;
          prev[e.to] = u;
        }
      }
    }
    r = { dist, prev };
    this.cache.set(src, r);
    return r;
  }

  /** Weg von Knoten a nach b oder null, wenn kein direkter Weg mit kurzen Etappen existiert */
  leg(a: number, b: number, kmh: number): Leg | null {
    const { dist, prev } = this.run(a);
    if (dist[b] === Infinity) return null;
    const chain: number[] = [];
    for (let v = b; v !== a; v = prev[v]) chain.unshift(v);
    let straight = 0;
    let p = this.nodes[a].coords;
    for (const v of chain) {
      straight += distance(p, this.nodes[v].coords);
      p = this.nodes[v].coords;
    }
    const direct = distance(this.nodes[a].coords, this.nodes[b].coords);
    // "Direkt": kein Zickzack über Zwischenziele (der Start darf weiter weg liegen)
    if (chain.length > 1 && a !== 0 && straight > direct * MAX_DETOUR + 60) return null;
    const via = chain.slice(0, -1).map((v) => this.nodes[v].poi!);
    const meters = straight * DETOUR;
    return { via, meters, minutes: walkMinutes(meters, kmh) + via.length * WAYPOINT_MINUTES };
  }
}

/**
 * Routenplanung mit kurzen Etappen: Stationen werden nach "Spannung pro Zusatzminute"
 * eingefügt, bis das Zeitbudget voll ist. Liegen zwei Ziele weiter als 500 m auseinander,
 * führt der Weg über Zwischenziele, sodass keine Etappe länger als 500 m ist.
 */
export function generateRoute(all: Station[], pois: Poi[], opt: RouteOptions): Route {
  const r = planRoute(all, pois, opt);
  const count = (x: Route) => x.stops.filter((s) => s.kind === 'station').length;
  // Ließ sich keine Pause einplanen, die reservierte Zeit lieber für Stationen nutzen
  if (opt.includePause && !r.stops.some((s) => s.kind === 'pause')) {
    const r2 = planRoute(all, pois, { ...opt, includePause: false });
    if (count(r2) > count(r)) return r2;
  }
  return r;
}

function planRoute(all: Station[], pois: Poi[], opt: RouteOptions): Route {
  const rand = rng(opt.seed);
  const pauseBudget = opt.includePause && opt.minutes >= 60 ? PAUSE_MINUTES : 0;
  // Finale: Rechnen/Suchen + ca. 250 m Weg zum Schatz
  const finalBudget = opt.cache ? FINAL_MINUTES + walkMinutes(250 * DETOUR, opt.kmh) : 0;
  const budget = opt.minutes - pauseBudget - finalBudget;

  const pool = all.filter((s) => opt.districts.includes(s.district) && (opt.includeQuiet || s.mode === 'normal'));
  const maxLeg = opt.maxLeg ?? MAX_LEG;
  const net = new Network(opt.start, pool, pois, maxLeg);
  const idx = new Map(pool.map((s, i) => [s.id, i + 1]));
  const legCache = new Map<string, Leg | null>();
  const leg = (a: number, b: number): Leg | null => {
    const k = a + '>' + b;
    if (!legCache.has(k)) legCache.set(k, net.leg(a, b, opt.kmh));
    return legCache.get(k)!;
  };

  const jitter = new Map(pool.map((s) => [s.id, 0.6 + rand() * 0.8]));
  const themed = opt.theme && opt.theme !== 'mix' ? opt.theme : null;
  const value = (s: Station) => s.appeal * (jitter.get(s.id) ?? 1) * (themed ? (s.categories.includes(themed) ? 4 : 0.35) : 1);

  /** Dauer einer Stationsfolge (Infinity, wenn ein Weg nicht mit kurzen Etappen geht) */
  const cost = (list: Station[]): number => {
    let m = 0;
    let prev = 0;
    for (const s of list) {
      const l = leg(prev, idx.get(s.id)!);
      if (!l) return Infinity;
      m += l.minutes + s.dwell;
      prev = idx.get(s.id)!;
    }
    return m;
  };

  /** Gierig auffüllen, ausgehend von einer ersten Station */
  const greedy = (first: Station | null): Station[] => {
    let list: Station[] = first ? [first] : [];
    const remaining = new Set(pool.filter((s) => s !== first));
    for (;;) {
      let best: { list: Station[]; ratio: number; s: Station } | null = null;
      const base = cost(list);
      for (const s of remaining) {
        for (let pos = 0; pos <= list.length; pos++) {
          const cand = list.slice(0, pos).concat([s], list.slice(pos));
          const c = cost(cand);
          if (c > budget) continue;
          const ratio = value(s) / Math.max(c - base, 1);
          if (!best || ratio > best.ratio) best = { list: cand, ratio, s };
        }
      }
      if (!best) break;
      list = best.list;
      remaining.delete(best.s);
    }
    return list;
  };
  // Mehrere Anfänge probieren, damit die Route nicht in einer Sackgasse endet
  const total = (l: Station[]) => l.reduce((a, s) => a + value(s), 0);
  let chosen = greedy(null);
  const firsts = pool
    .filter((s) => cost([s]) <= budget)
    .sort((a, b) => value(b) / cost([b]) - value(a) / cost([a]))
    .slice(0, 8);
  for (const f of firsts) {
    const l = greedy(f);
    if (total(l) > total(chosen) + 0.01) chosen = l;
  }

  // 2-opt: Teilstücke umdrehen, solange es kürzer wird
  let improved = true;
  let guard = 0;
  while (improved && guard++ < 50) {
    improved = false;
    for (let i = 0; i < chosen.length - 1; i++) {
      for (let k = i + 1; k < chosen.length; k++) {
        const cand = chosen.slice(0, i).concat(chosen.slice(i, k + 1).reverse(), chosen.slice(k + 1));
        if (cost(cand) + 0.05 < cost(chosen)) {
          chosen = cand;
          improved = true;
        }
      }
    }
  }

  // Zwei Gedenkorte nicht direkt hintereinander, wenn es sich vermeiden lässt
  for (let i = 1; i < chosen.length; i++) {
    if (chosen[i].mode === 'quiet' && chosen[i - 1].mode === 'quiet') {
      const j = chosen.findIndex((s, n) => n > i && s.mode !== 'quiet');
      if (j > 0) {
        const cand = chosen.slice();
        const [s] = cand.splice(j, 1);
        cand.splice(i, 0, s);
        if (cost(cand) <= budget) chosen = cand;
      }
    }
  }

  const candidates = pois.filter((p) => opt.districts.includes(p.district) && p.kind !== 'wc');
  const pauseList = candidates.length ? candidates : pois.filter((p) => p.kind !== 'wc');

  /** Ziel-Folge (Stationen + Pause + Finale) zu fertigen Stopps mit Zwischenzielen ausbauen */
  type Target = { kind: 'station'; station: Station } | { kind: 'pause' | 'final'; poi: Poi };
  const coordsOf = (t: Target) => (t.kind === 'station' ? t.station.coords : t.poi.coords);
  const expand = (targets: Target[]): RouteStop[] | null => {
    const out: RouteStop[] = [];
    let prevNode = 0;
    let prevCoords = opt.start;
    let afterPoi = false;
    for (const t of targets) {
      if (t.kind === 'station') {
        const to = idx.get(t.station.id)!;
        if (afterPoi) {
          // nach einer Pause: die liegt höchstens 500 m vor der Station
          if (distance(prevCoords, t.station.coords) > maxLeg) return null;
        } else {
          const l = leg(prevNode, to);
          if (!l) return null;
          for (const p of l.via) out.push({ kind: 'waypoint', poi: p });
        }
        out.push(t);
        prevNode = to;
        afterPoi = false;
      } else {
        // Pause und Schatz liegen höchstens eine Etappe vom vorigen Ziel entfernt
        if (distance(prevCoords, t.poi.coords) > maxLeg) return null;
        out.push(t);
        afterPoi = true;
      }
      prevCoords = coordsOf(t);
    }
    return out;
  };

  // Pause: Ort, der von einer Station aus höchstens 500 m entfernt liegt und vom dem es
  // höchstens 500 m zur nächsten Station sind – möglichst in der Mitte der Tour
  const withPause = (base: Target[]): Target[] => {
    if (!pauseBudget || base.length < 2 || !pauseList.length) return base;
    const order = base.map((_, i) => i).sort((a, b) => Math.abs(a - base.length / 2) - Math.abs(b - base.length / 2));
    for (const i of order) {
      if (i === 0) continue;
      const a = coordsOf(base[i - 1]);
      const b = coordsOf(base[i]);
      let bestPoi: Poi | null = null;
      let bestScore = Infinity;
      for (const p of pauseList) {
        const da = distance(a, p.coords);
        const db = distance(p.coords, b);
        if (da > maxLeg || db > maxLeg) continue;
        const score = da + db - distance(a, b) - (p.kind === 'eis' ? 60 : 0) - (p.kind === 'spielplatz' && p.title !== 'Spielplatz' ? 40 : 0);
        if (score < bestScore) {
          bestScore = score;
          bestPoi = p;
        }
      }
      if (bestPoi) {
        const out = base.slice();
        out.splice(i, 0, { kind: 'pause', poi: bestPoi });
        return out;
      }
    }
    return base;
  };

  // Schatz-Finale: ein öffentlicher Spielplatz 100–500 m nach dem letzten Ziel (ideal ~250 m)
  const withFinal = (base: Target[]): Target[] => {
    if (!opt.cache || !base.length) return base;
    const last = coordsOf(base[base.length - 1]);
    const used = new Set(base.map((s) => (s.kind === 'station' ? s.station.id : s.poi.id)));
    let best: Poi | null = null;
    let bestScore = Infinity;
    for (const p of pauseList) {
      if (p.kind !== 'spielplatz' || used.has(p.id)) continue;
      const d = distance(last, p.coords);
      if (d < 100 || d > Math.min(maxLeg, 800)) continue;
      const score = Math.abs(d - 250) + rand() * 60;
      if (score < bestScore) {
        bestScore = score;
        best = p;
      }
    }
    return best ? [...base, { kind: 'final', poi: best }] : base;
  };

  const build = (stations: Station[], pause: boolean, fin: boolean): RouteStop[] => {
    let t: Target[] = stations.map((station) => ({ kind: 'station', station }));
    if (pause) t = withPause(t);
    if (fin) t = withFinal(t);
    const r = expand(t) ?? expand(stations.map((station) => ({ kind: 'station', station })))!;
    // Keine Pause zwischen zwei Stationen möglich? Dann wird ein Zwischenziel zur Pause.
    if (pause && pauseBudget && !r.some((x) => x.kind === 'pause')) {
      const mid = r.length / 2;
      let bi = -1;
      r.forEach((x, i) => {
        if (x.kind === 'waypoint' && x.poi.kind !== 'wc' && (bi < 0 || Math.abs(i - mid) < Math.abs(bi - mid))) bi = i;
      });
      if (bi >= 0) r[bi] = { kind: 'pause', poi: (r[bi] as { poi: Poi }).poi };
    }
    return r;
  };
  const fits = (r: RouteStop[]) => measure(opt.start, r, opt.kmh).minutes <= opt.minutes;

  // Wenn Pause oder Finale das Budget sprengen: Station streichen (die Kette muss dabei erhalten bleiben)
  const base = chosen.slice();
  let result = build(base, true, true);
  while (!fits(result) && base.length > 1) {
    let drop = base.length - 1;
    let worst = Infinity;
    base.forEach((s, i) => {
      const cand = base.slice(0, i).concat(base.slice(i + 1));
      if (cost(cand) < Infinity && value(s) < worst) {
        worst = value(s);
        drop = i;
      }
    });
    base.splice(drop, 1);
    result = build(base, true, true);
  }
  if (!fits(result)) result = build(base, false, true);
  if (!fits(result)) result = build(base, false, false);

  const m = measure(opt.start, result, opt.kmh);
  return { stops: result, meters: m.meters, minutes: m.minutes };
}
