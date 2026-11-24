import { describe, expect, it } from 'vitest';
import { POIS, ROUTE_STATIONS } from '../data';
import { generateRoute } from './route';
import { seasonFor, seasonNote, WET_PLAYGROUNDS } from './season';

const start: [number, number] = [53.59078, 10.01519];
const base = { districts: ['winterhude' as const, 'barmbek-nord' as const], start, minutes: 150, kmh: 3.5, includeQuiet: false, includePause: true, cache: false };

describe('Jahreszeiten', () => {
  it('erkennt Winter, Sommer und Dunkelheit', () => {
    const jan = seasonFor(new Date('2026-01-10T15:30:00+01:00'), 120, start);
    expect(jan.winter).toBe(true);
    expect(jan.dark).toBe(true); // Sonnenuntergang gegen 16:20
    const jul = seasonFor(new Date('2026-07-10T11:00:00+02:00'), 120, start);
    expect(jul.summer).toBe(true);
    expect(jul.dark).toBe(false);
    expect(seasonNote(jul)).toMatch(/Planschbecken/);
    expect(seasonNote(seasonFor(new Date('2026-05-10T11:00:00+02:00'), 120, start))).toBeNull();
    expect(WET_PLAYGROUNDS.length).toBeGreaterThan(0);
  });
  it('plant im Winter keine Eis-Pause und im Dunkeln weniger Park-Stationen', () => {
    const winter = seasonFor(new Date('2026-01-10T15:30:00+01:00'), 150, start);
    let natureDay = 0;
    let natureDark = 0;
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const r = generateRoute(ROUTE_STATIONS, POIS, { ...base, seed, season: winter });
      for (const s of r.stops) if (s.kind === 'pause') expect(s.poi.kind).not.toBe('eis');
      natureDark += r.stops.filter((s) => s.kind === 'station' && s.station.categories.includes('natur')).length;
      const d = generateRoute(ROUTE_STATIONS, POIS, { ...base, seed });
      natureDay += d.stops.filter((s) => s.kind === 'station' && s.station.categories.includes('natur')).length;
    }
    expect(natureDark).toBeLessThan(natureDay);
  });
  it('bevorzugt im Sommer Wasser-Stationen', () => {
    const summer = seasonFor(new Date('2026-07-10T11:00:00+02:00'), 150, start);
    let wetSummer = 0;
    let wetNormal = 0;
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      wetSummer += generateRoute(ROUTE_STATIONS, POIS, { ...base, seed, season: summer }).stops.filter((s) => s.kind === 'station' && s.station.categories.includes('wasser')).length;
      wetNormal += generateRoute(ROUTE_STATIONS, POIS, { ...base, seed }).stops.filter((s) => s.kind === 'station' && s.station.categories.includes('wasser')).length;
    }
    expect(wetSummer).toBeGreaterThanOrEqual(wetNormal);
  });
});
