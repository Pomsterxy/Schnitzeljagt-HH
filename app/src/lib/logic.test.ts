import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { STATIONS_WINTERHUDE } from '../data/stations-winterhude';
import { STATIONS_ALSTERDORF, STATIONS_BARMBEK } from '../data/stations-barmbek-alsterdorf';
import { STATIONS_ARCHITEKTUR } from '../data/stations-architektur';
import { CACHE_CLUES } from '../data/cache-clues';
import { buildFormula, checkCoords, fromDegMin, toDegMin } from './cache';
import { START_POINTS } from '../data/districts';
import pois from '../data/pois.json';
import credits from '../../public/img/credits.json';
import type { Poi, Station } from '../data/types';
import { distance, isWithinUnlock, temperature } from './geo';
import { generateRoute, measure } from './route';
import { evaluate, normalize, scoreTask, tasksFor } from './scoring';

const RAW: Station[] = [...STATIONS_WINTERHUDE, ...STATIONS_BARMBEK, ...STATIONS_ALSTERDORF, ...STATIONS_ARCHITEKTUR];
const STATIONS = RAW.map((s) => ({ ...s, images: s.images.length ? s.images : [s.id] }));
const POIS = pois as Poi[];

describe('Stationsdaten', () => {
  it('haben eindeutige IDs und Aufgaben-IDs', () => {
    expect(new Set(STATIONS.map((s) => s.id)).size).toBe(STATIONS.length);
    const taskIds = STATIONS.flatMap((s) => s.tasks.map((t) => t.id));
    expect(new Set(taskIds).size).toBe(taskIds.length);
  });

  it('liegen im Spielgebiet und haben sinnvolle Radien', () => {
    for (const s of STATIONS) {
      expect(s.coords[0]).toBeGreaterThan(53.575);
      expect(s.coords[0]).toBeLessThan(53.625);
      expect(s.coords[1]).toBeGreaterThan(9.99);
      expect(s.coords[1]).toBeLessThan(10.06);
      expect(s.radius).toBeGreaterThanOrEqual(30);
      expect(s.radius).toBeLessThanOrEqual(100);
    }
  });

  it('haben Bilder mit Lizenzangaben', () => {
    for (const s of STATIONS) {
      expect(s.images.length).toBeGreaterThan(0);
      for (const id of s.images) {
        expect(existsSync(resolve(__dirname, '../../public/img/stations', id + '.jpg')), id).toBe(true);
        expect((credits as Record<string, unknown>)[id], id).toBeTruthy();
      }
    }
  });

  it('haben gültige Aufgaben', () => {
    for (const s of STATIONS) {
      expect(s.tasks.length, s.id).toBeGreaterThan(0);
      for (const t of s.tasks) {
        if (t.type === 'quiz') {
          expect(t.correct).toBeGreaterThanOrEqual(0);
          expect(t.correct).toBeLessThan(t.options.length);
          expect(new Set(t.options).size).toBe(t.options.length);
        }
        if (t.type === 'estimate') {
          expect(t.answer).toBeGreaterThanOrEqual(t.min);
          expect(t.answer).toBeLessThanOrEqual(t.max);
        }
        if (t.type === 'text') expect(t.accept.length).toBeGreaterThan(0);
      }
      // Jede Altersstufe hat mindestens eine Aufgabe
      for (const age of ['kids', 'tweens', 'adults'] as const) expect(tasksFor(s, age).length, `${s.id}/${age}`).toBeGreaterThan(0);
    }
  });

  it('Gedenkorte enthalten keine Punkte-Aufgaben außer Beobachtungen', () => {
    for (const s of STATIONS.filter((x) => x.mode === 'quiet')) {
      for (const t of s.tasks) expect(['reflection', 'text', 'number']).toContain(t.type);
      expect(s.categories).toContain('erinnern');
    }
  });

  it('hat für jeden Stadtteil Stationen, Startpunkte und Pausenorte', () => {
    for (const d of ['winterhude', 'barmbek-nord', 'alsterdorf']) {
      expect(STATIONS.filter((s) => s.district === d).length).toBeGreaterThanOrEqual(7);
      expect(START_POINTS.some((s) => s.district === d)).toBe(true);
      expect(POIS.some((p) => p.district === d && p.kind === 'spielplatz')).toBe(true);
    }
  });
});

describe('Geo', () => {
  it('berechnet Entfernungen', () => {
    // Planetarium → Pinguinbrunnen ca. 1,3 km
    const d = distance([53.59722, 10.00889], [53.595083, 10.028486]);
    expect(d).toBeGreaterThan(1200);
    expect(d).toBeLessThan(1400);
  });
  it('schaltet im Radius frei, aber nicht aus großer Entfernung bei schlechtem GPS', () => {
    expect(isWithinUnlock(30, 40, 10)).toBe(true);
    expect(isWithinUnlock(55, 40, 30)).toBe(true);
    expect(isWithinUnlock(90, 40, 200)).toBe(false);
  });
  it('heiß/kalt', () => {
    expect(temperature(20)).toBe('kochend');
    expect(temperature(2000)).toBe('eiskalt');
  });
});

describe('Routengenerator', () => {
  const base = {
    districts: ['winterhude' as const],
    start: [53.59078, 10.01519] as [number, number],
    kmh: 3.5,
    includeQuiet: true,
    includePause: true,
    seed: 1,
  };
  it('hält das Zeitbudget ein und wird mit mehr Zeit länger', () => {
    const short = generateRoute(STATIONS, POIS, { ...base, minutes: 45 });
    const long = generateRoute(STATIONS, POIS, { ...base, minutes: 180 });
    expect(short.minutes).toBeLessThanOrEqual(45 + 0.01);
    for (const mins of [30, 60, 90, 120, 150, 240]) for (const seed of [1, 2, 3]) expect(generateRoute(STATIONS, POIS, { ...base, minutes: mins, seed }).minutes).toBeLessThanOrEqual(mins + 0.01);
    expect(long.minutes).toBeLessThanOrEqual(180 + 0.01);
    const count = (r: typeof short) => r.stops.filter((s) => s.kind === 'station').length;
    expect(count(short)).toBeGreaterThan(0);
    expect(count(long)).toBeGreaterThan(count(short));
  });
  it('nimmt nur gewählte Stadtteile und respektiert den Gedenkort-Filter', () => {
    const r = generateRoute(STATIONS, POIS, { ...base, districts: ['alsterdorf'], minutes: 240, includeQuiet: false });
    for (const s of r.stops) if (s.kind === 'station') {
      expect(s.station.district).toBe('alsterdorf');
      expect(s.station.mode).toBe('normal');
    }
  });
  it('plant ab 60 Minuten genau eine Pause ein', () => {
    const r = generateRoute(STATIONS, POIS, { ...base, minutes: 120 });
    expect(r.stops.filter((s) => s.kind === 'pause').length).toBe(1);
    const r2 = generateRoute(STATIONS, POIS, { ...base, minutes: 120, includePause: false });
    expect(r2.stops.filter((s) => s.kind === 'pause').length).toBe(0);
  });
  it('liefert mit anderem Seed eine andere Route', () => {
    const sig = (seed: number) =>
      generateRoute(STATIONS, POIS, { ...base, districts: ['winterhude', 'barmbek-nord'], minutes: 120, seed })
        .stops.map((s) => (s.kind === 'station' ? s.station.id : s.poi.id))
        .join();
    const sigs = new Set([1, 2, 3, 4, 5].map(sig));
    expect(sigs.size).toBeGreaterThan(1);
  });
  it('misst konsistent', () => {
    const r = generateRoute(STATIONS, POIS, { ...base, minutes: 90 });
    const m = measure(base.start, r.stops, base.kmh);
    expect(Math.round(m.minutes)).toBe(Math.round(r.minutes));
  });
});

describe('Auswertung', () => {
  it('normalisiert Umlaute', () => {
    expect(normalize('  Ziehharmonika! ')).toBe('ziehharmonika');
    expect(normalize('Hüte')).toBe('huete');
  });
  it('bewertet Text, Zahl, Quiz und Schätzung', () => {
    expect(evaluate({ id: 'a', type: 'text', question: '', accept: ['Hammer'] }, 'ein hammer').correct).toBe(true);
    expect(evaluate({ id: 'a', type: 'text', question: '', accept: ['Enten'] }, 'Ente').correct).toBe(false);
    expect(evaluate({ id: 'b', type: 'number', question: '', answer: 6 }, '6').correct).toBe(true);
    expect(evaluate({ id: 'c', type: 'quiz', question: '', options: ['x', 'y'], correct: 1 }, 1).correct).toBe(true);
    const est = { id: 'd', type: 'estimate' as const, question: '', answer: 65, unit: 'm', min: 1, max: 200, tolerance: 10 };
    expect(evaluate(est, 66).quality).toBe(1);
    expect(evaluate(est, 100).quality).toBeLessThan(1);
    expect(evaluate(est, 1000).quality).toBeGreaterThan(0);
  });
  it('vergibt Punkte mit Abzügen', () => {
    const q = { id: 'c', type: 'quiz' as const, question: '', options: ['x', 'y'], correct: 1 };
    expect(scoreTask(q, 1, 1, 0)).toBe(10);
    expect(scoreTask(q, 1, 2, 0)).toBe(5);
    expect(scoreTask(q, 1, 1, 1)).toBe(7);
  });
});

describe('Geocaching-Finale', () => {
  it('jede normale Station hat eine Cache-Zahl 0–9, Gedenkorte keine', () => {
    for (const s of STATIONS) {
      const c = CACHE_CLUES[s.id];
      if (s.mode === 'quiet') expect(c, s.id).toBeUndefined();
      else {
        expect(c, s.id).toBeTruthy();
        expect(c.value).toBeGreaterThanOrEqual(0);
        expect(c.value).toBeLessThanOrEqual(9);
      }
    }
    for (const id of Object.keys(CACHE_CLUES)) expect(STATIONS.some((s) => s.id === id), id).toBe(true);
  });
  it('rechnet Grad/Minuten hin und zurück', () => {
    const d = toDegMin(53.59078);
    expect(d.deg).toBe(53);
    expect(d.min).toBe(35);
    const back = fromDegMin(d.deg, d.min, d.digits[0] * 100 + d.digits[1] * 10 + d.digits[2]);
    expect(Math.abs(back - 53.59078)).toBeLessThan(0.00002);
  });
  it('die Formel ergibt genau die Zielkoordinaten', () => {
    const target: [number, number] = [53.597361, 10.021583];
    const letters = [
      { letter: 'A', value: 6, label: '', stationId: 'a' },
      { letter: 'B', value: 3, label: '', stationId: 'b' },
      { letter: 'C', value: 9, label: '', stationId: 'c' },
    ];
    const vals: Record<string, number> = { A: 6, B: 3, C: 9 };
    for (const hard of [false, true]) {
      const f = buildFormula(target, letters, hard, 42);
      const evalExpr = (t: string) => {
        // "A + B − 3" auswerten
        return t
          .replace(/−/g, '-')
          .split(/\s+/)
          .reduce((acc, tok, i, arr) => {
            if (tok === '+' || tok === '-') return acc;
            const v = vals[tok] ?? Number(tok);
            const op = i === 0 ? '+' : arr[i - 1];
            return op === '-' ? acc - v : acc + v;
          }, 0);
      };
      const n = f.north.exprs.map((e) => evalExpr(e.text)).join('');
      const e = f.east.exprs.map((x) => evalExpr(x.text)).join('');
      for (const x of [...f.north.exprs, ...f.east.exprs]) {
        expect(x.value).toBeGreaterThanOrEqual(0);
        expect(x.value).toBeLessThanOrEqual(9);
      }
      expect(checkCoords(target, n, e)).toEqual({ north: true, east: true });
    }
    expect(checkCoords(target, '000', '000').north).toBe(false);
  });
});

describe('Themen & Finale in der Route', () => {
  const opt = {
    districts: ['winterhude' as const, 'barmbek-nord' as const],
    start: [53.59078, 10.01519] as [number, number],
    kmh: 3.5,
    includeQuiet: true,
    includePause: true,
    seed: 3,
    minutes: 150,
  };
  it('Architektur-Thema bevorzugt Architektur-Stationen', () => {
    const share = (theme?: 'architektur') => {
      const st = generateRoute(STATIONS, POIS, { ...opt, theme }).stops.filter((s) => s.kind === 'station');
      return st.filter((s) => s.kind === 'station' && s.station.categories.includes('architektur')).length / st.length;
    };
    expect(share('architektur')).toBeGreaterThan(0.8);
    expect(share('architektur')).toBeGreaterThan(share());
  });
  it('plant das Schatz-Finale als letzten Stopp an einem Spielplatz ein und bleibt im Zeitbudget', () => {
    for (const minutes of [45, 90, 180]) {
      for (const d of ['winterhude', 'barmbek-nord', 'alsterdorf'] as const) {
        const start = START_POINTS.find((x) => x.district === d)!.coords;
        const r = generateRoute(STATIONS, POIS, { ...opt, districts: [d], start, minutes, cache: true });
        const last = r.stops[r.stops.length - 1];
        expect(last.kind, `${d}/${minutes}`).toBe('final');
        if (last.kind === 'final') expect(last.poi.kind).toBe('spielplatz');
        expect(r.minutes).toBeLessThanOrEqual(minutes + 0.01);
        expect(r.stops.filter((s) => s.kind === 'station').length).toBeGreaterThan(0);
      }
    }
  });
});

describe('Schrittzähler', () => {
  it('zählt Schritte in einem gleichmäßigen Gangmuster', async () => {
    const { StepDetector } = await import('./pedometer');
    const det = new StepDetector();
    let steps = 0;
    // 30 s Gehen mit 1,8 Schritten/s bei 50 Hz Abtastung
    for (let i = 0; i < 1500; i++) {
      const t = i * 20;
      const z = 9.81 + 2.5 * Math.sin((2 * Math.PI * 1.8 * t) / 1000);
      if (det.push(t, 0.3, 0.2, z)) steps++;
    }
    expect(steps).toBeGreaterThan(48);
    expect(steps).toBeLessThan(58);
  });
  it('zählt im Stillstand (nur Rauschen) keine Schritte', async () => {
    const { StepDetector } = await import('./pedometer');
    const det = new StepDetector();
    let steps = 0;
    for (let i = 0; i < 1500; i++) if (det.push(i * 20, 0.1, 0.1, 9.81 + Math.sin(i * 7.3) * 0.2)) steps++;
    expect(steps).toBe(0);
  });
  it('schätzt und formatiert', async () => {
    const { estimateSteps, formatDuration, strideFor } = await import('./pedometer');
    expect(estimateSteps(1000, strideFor('kids'))).toBe(2000);
    expect(formatDuration(95 * 60000)).toBe('1 h 35 min');
    expect(formatDuration(42 * 60000)).toBe('42 min');
  });
});

describe('Familien-Momente', () => {
  it('verteilt etwa jede dritte Station, ohne Doppelte', async () => {
    const { assignFamilyGames } = await import('./family');
    const ids = Array.from({ length: 9 }, (_, i) => `s${i}`);
    for (const seed of [1, 2, 3, 99]) {
      const a = assignFamilyGames(ids, seed);
      const n = Object.keys(a).length;
      expect(n).toBeGreaterThanOrEqual(2);
      expect(n).toBeLessThanOrEqual(3);
      expect(new Set(Object.values(a)).size).toBe(n);
      expect(a.s0).toBeUndefined();
    }
    expect(Object.keys(assignFamilyGames(['a'], 1)).length).toBe(0);
    expect(Object.keys(assignFamilyGames(['a', 'b', 'c'], 1)).length).toBe(1);
  });
});
