import { describe, expect, it } from 'vitest';
import { OPEN_POIS, OPEN_STATIONS, POI_INFO } from '../data/open';
import { POIS, ROUTE_STATIONS, STATIONS, STATION_BY_ID } from '../data';
import { START_POINTS } from '../data/districts';
import { distance } from './geo';
import { generateRoute, MAX_LEG, MAX_QUIET } from './route';

describe('Offene Daten', () => {
  it('liefern Stationen mit gültigen Aufgaben und eindeutigen IDs', () => {
    expect(OPEN_STATIONS.some((s) => s.origin === 'tafel')).toBe(true);
    expect(OPEN_STATIONS.some((s) => s.origin === 'stolperstein')).toBe(true);
    const ids = ROUTE_STATIONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    const taskIds = ROUTE_STATIONS.flatMap((s) => s.tasks.map((t) => t.id));
    expect(new Set(taskIds).size).toBe(taskIds.length);
    for (const s of OPEN_STATIONS) {
      expect(s.tasks.length, s.id).toBeGreaterThan(0);
      expect(s.snack.length, s.id).toBeGreaterThan(20);
      expect(STATION_BY_ID.get(s.id)).toBe(s);
      for (const t of s.tasks) {
        if (t.type === 'quiz') {
          expect(t.options[t.correct], t.id).toBeDefined();
          expect(new Set(t.options).size, t.id).toBe(t.options.length);
        }
        if (t.type === 'estimate') expect(t.answer).toBeGreaterThan(0);
      }
      // keine englische Übersetzung, keine Silbentrennung im Tafeltext
      if (s.origin === 'tafel') {
        expect(s.snack).not.toMatch(/\bBuilt\b|\bthe\b/);
        expect(s.snack).not.toMatch(/\p{Ll}- (?!und\b|oder\b|bzw\b)\p{Ll}/u);
      }
    }
    // Album zählt nur handverlesene Stationen
    expect(STATIONS.some((s) => s.origin)).toBe(false);
  });
  it('liefert Kunstwerke und Trinkbrunnen als Zwischenziele', () => {
    expect(OPEN_POIS.filter((p) => p.kind === 'kunst').length).toBeGreaterThan(20);
    expect(POIS.some((p) => p.kind === 'trinkwasser')).toBe(true);
    expect(Object.keys(POI_INFO).every((id) => POIS.some((p) => p.id === id))).toBe(true);
  });
  it('plant mit allen Daten weiter kurze Etappen, wenige Gedenkorte und Pausen nur an Spielplatz/Eis/Café', () => {
    let artSeen = 0;
    for (const sp of START_POINTS) {
      for (const seed of [1, 2]) {
        const t0 = Date.now();
        const r = generateRoute(ROUTE_STATIONS, POIS, { districts: [sp.district], start: sp.coords, minutes: 180, kmh: 3.5, includeQuiet: true, includePause: true, seed, cache: true });
        expect(Date.now() - t0, 'Planung dauert zu lange').toBeLessThan(4000);
        expect(r.stops.filter((s) => s.kind === 'station' && s.station.mode === 'quiet').length).toBeLessThanOrEqual(MAX_QUIET);
        for (const s of r.stops) if (s.kind === 'pause' || s.kind === 'final') expect(['spielplatz', 'eis', 'cafe']).toContain(s.poi.kind);
        artSeen += r.stops.filter((s) => s.kind === 'waypoint' && s.poi.kind === 'kunst').length;
        let prev: [number, number] | null = null;
        for (const s of r.stops) {
          const c = s.kind === 'station' ? s.station.coords : s.poi.coords;
          if (prev) expect(distance(prev, c)).toBeLessThanOrEqual(MAX_LEG + 0.5);
          prev = c;
        }
      }
    }
    expect(artSeen).toBeGreaterThan(0);
  });
  it('gibt an jeder normalen Station etwas für die Jüngsten', () => {
    for (const s of ROUTE_STATIONS.filter((x) => x.mode === 'normal')) expect(s.tasks.some((t) => t.level === 'kids'), s.id).toBe(true);
  });
});
