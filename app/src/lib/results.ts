/**
 * Team-Vergleich ohne Server: Ein Team schickt sein Ergebnis als Link. Der Link enthält auch die Tour,
 * sodass andere sie genau so nachspielen können. Ergebnisse derselben Tour (gleiche Stopps)
 * werden auf dem Handy gesammelt und als Rangliste gezeigt.
 */
import { useMemo, useSyncExternalStore } from 'react';
import { hashString } from '../data/util';
import type { RouteStop } from './route';
import { b64url, KIND, unb64url } from './share';
import { loadJSON, saveJSON } from './storage';

export interface TeamResult {
  /** Fingerabdruck der Tour (Stopps in Reihenfolge) */
  fp: string;
  team: string;
  avatar: string;
  points: number;
  stations: number;
  total: number;
  meters: number;
  ms: number;
  treasure: boolean;
  at: number;
  /** Ergebnis von diesem Handy */
  mine?: boolean;
}

const KEY = 'hh-hunt:results';
let results: TeamResult[] = loadJSON<TeamResult[]>(KEY, []);
const listeners = new Set<() => void>();
function commit() {
  saveJSON(KEY, results);
  listeners.forEach((l) => l());
}

/** Fingerabdruck aus den Stopps ([Art, ID]), unabhängig von der Darstellung */
export function tourFingerprint(stops: { kind: RouteStop['kind']; id: string }[]): string {
  return hashString(stops.map((x) => `${KIND[x.kind]}:${x.id}`).join('|')).toString(36) + stops.length.toString(36);
}

export function saveResult(r: TeamResult): void {
  const same = (x: TeamResult) => x.fp === r.fp && x.team === r.team && Math.abs(x.at - r.at) < 60000;
  results = [...results.filter((x) => !same(x)), r].slice(-100);
  commit();
}

export function useResults(fp: string | null): TeamResult[] {
  const all = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => results,
  );
  return useMemo(() => (fp ? all.filter((r) => r.fp === fp).sort((a, b) => b.points - a.points || a.ms - b.ms) : []), [all, fp]);
}

export function hasOwnResult(fp: string): boolean {
  return results.some((r) => r.fp === fp && r.mine);
}

/** Link-Inhalt: Ergebnis + Tour-Code */
export function encodeResult(r: TeamResult, tourCode: string): string {
  return b64url(JSON.stringify({ v: 1, r: { ...r, mine: undefined }, t: tourCode }));
}

export function decodeResult(code: string): { result: TeamResult; tourCode: string } | null {
  try {
    const d = JSON.parse(unb64url(code)) as { v: number; r: TeamResult; t: string };
    const r = d.r;
    if (d.v !== 1 || typeof r?.fp !== 'string' || typeof r.points !== 'number' || typeof d.t !== 'string') return null;
    // Nur erwartete Felder übernehmen, Texte begrenzen
    const result: TeamResult = {
      fp: r.fp.slice(0, 20),
      team: String(r.team ?? 'Team').slice(0, 40),
      avatar: String(r.avatar ?? '⭐').slice(0, 8),
      points: Math.max(0, Math.min(5000, Math.round(r.points))),
      stations: Math.max(0, Math.round(Number(r.stations) || 0)),
      total: Math.max(0, Math.round(Number(r.total) || 0)),
      meters: Math.max(0, Math.round(Number(r.meters) || 0)),
      ms: Math.max(0, Math.round(Number(r.ms) || 0)),
      treasure: !!r.treasure,
      at: Number(r.at) || Date.now(),
    };
    return { result, tourCode: d.t };
  } catch {
    return null;
  }
}

export function resultLink(code: string): string {
  return `${location.origin}${location.pathname}?result=${code}`;
}
