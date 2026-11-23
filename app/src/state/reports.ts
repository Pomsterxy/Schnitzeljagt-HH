import { useSyncExternalStore } from 'react';
import { loadJSON, mirrorState, saveJSON } from '../lib/storage';
import type { LatLng } from '../data/types';

/** Meldung: "Hier stimmt etwas nicht" – bleibt auf dem Handy, kann geteilt werden */
export interface Report {
  id: string;
  at: number;
  stationId: string;
  stationTitle: string;
  kind: string;
  text: string;
  coords?: LatLng;
  accuracy?: number;
}

const KEY = 'hh-hunt:reports';
let reports: Report[] = loadJSON<Report[]>(KEY, []);
const listeners = new Set<() => void>();

function commit() {
  saveJSON(KEY, reports);
  mirrorState();
  listeners.forEach((l) => l());
}

export function addReport(r: Omit<Report, 'id' | 'at'>) {
  reports = [...reports, { ...r, id: Math.random().toString(36).slice(2, 9), at: Date.now() }];
  commit();
}

export function clearReports() {
  reports = [];
  commit();
}

export function useReports(): Report[] {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => reports,
  );
}

/** Als Text zum Teilen (WhatsApp, Mail …) */
export function reportsText(list: Report[]): string {
  const lines = list.map((r) => {
    const when = new Date(r.at).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });
    const where = r.coords ? ` · GPS ${r.coords[0].toFixed(5)}, ${r.coords[1].toFixed(5)} (±${Math.round(r.accuracy ?? 0)} m)` : '';
    return `• ${r.stationTitle} [${r.stationId}] – ${r.kind}${r.text ? `: ${r.text}` : ''} (${when}${where})`;
  });
  return `Schnitzeljagd Hamburg – Meldungen (${list.length})\n\n${lines.join('\n')}`;
}
