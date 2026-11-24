import type { DistrictId, LatLng, Category } from '../data/types';
import { POI_BY_ID, STATION_BY_ID } from '../data';
import type { RouteStop } from './route';
import type { NavMode } from '../state/game';

/** Eine geplante Tour als Link: genau dieselben Stationen in derselben Reihenfolge */
export interface SharedTour {
  v: 1;
  /** Stadtteile */
  d: DistrictId[];
  /** Minuten */
  m: number;
  /** Start: Name und Koordinaten */
  s: string;
  c: LatLng;
  /** Stopps: [Art, ID] – s=Station, w=Zwischenziel, p=Pause, f=Schatz */
  st: [string, string][];
  n: NavMode;
  sd: number;
  t: Category | 'mix';
  ml: number;
}

const KIND: Record<RouteStop['kind'], string> = { station: 's', waypoint: 'w', pause: 'p', final: 'f' };

function b64url(s: string): string {
  return btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function unb64url(s: string): string {
  const b = s.replace(/-/g, '+').replace(/_/g, '/');
  return decodeURIComponent(escape(atob(b + '='.repeat((4 - (b.length % 4)) % 4))));
}

export function encodeTour(t: Omit<SharedTour, 'v' | 'st'> & { stops: RouteStop[] }): string {
  const data: SharedTour = {
    v: 1,
    d: t.d,
    m: t.m,
    s: t.s,
    c: [Number(t.c[0].toFixed(5)), Number(t.c[1].toFixed(5))],
    st: t.stops.map((x) => [KIND[x.kind], x.kind === 'station' ? x.station.id : x.poi.id]),
    n: t.n,
    sd: t.sd,
    t: t.t,
    ml: t.ml,
  };
  return b64url(JSON.stringify(data));
}

/** Link zur Tour (bleibt auf der eigenen Seite, egal unter welchem Pfad die App liegt) */
export function tourLink(code: string): string {
  return `${location.origin}${location.pathname}?tour=${code}`;
}

export function decodeTour(code: string): { tour: SharedTour; stops: RouteStop[] } | null {
  try {
    const t = JSON.parse(unb64url(code)) as SharedTour;
    if (t.v !== 1 || !Array.isArray(t.st) || !Array.isArray(t.c)) return null;
    const stops: RouteStop[] = [];
    for (const [k, id] of t.st) {
      if (k === 's') {
        const station = STATION_BY_ID.get(id);
        if (!station) return null;
        stops.push({ kind: 'station', station });
      } else {
        const poi = POI_BY_ID.get(id);
        if (!poi) return null;
        stops.push({ kind: k === 'w' ? 'waypoint' : k === 'p' ? 'pause' : 'final', poi });
      }
    }
    if (!stops.some((s) => s.kind === 'station')) return null;
    return { tour: t, stops };
  } catch {
    return null;
  }
}

/** Teilen über das Teilen-Menü des Handys, sonst in die Zwischenablage */
export async function shareLink(url: string, text: string): Promise<'shared' | 'copied' | 'failed'> {
  try {
    if (navigator.share) {
      await navigator.share({ title: 'Schnitzeljagd Hamburg', text, url });
      return 'shared';
    }
  } catch (e) {
    if ((e as Error).name === 'AbortError') return 'failed';
  }
  try {
    await navigator.clipboard.writeText(`${text} ${url}`);
    return 'copied';
  } catch {
    return 'failed';
  }
}
