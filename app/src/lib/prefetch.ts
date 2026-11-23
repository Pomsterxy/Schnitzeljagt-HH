import { useSyncExternalStore } from 'react';
import type { LatLng } from '../data/types';
import { distance } from './geo';
import { loadJSON, saveJSON } from './storage';

/**
 * Kartenausschnitte einer Tour vorab laden, damit die Karte auch ohne Netz funktioniert.
 * Bewusst sparsam (Nutzungsregeln von OpenStreetMap): nur ein schmaler Streifen entlang der Route,
 * Zoomstufen 15–17, höchstens MAX_TILES Kacheln, nacheinander mit wenigen gleichzeitigen Anfragen.
 * Gespeichert werden sie vom Service Worker (Cache "osm-tiles").
 */
const MAX_TILES = 260;
const URL_TEMPLATE = (z: number, x: number, y: number) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;

export function tileOf(p: LatLng, z: number): [number, number] {
  const n = 2 ** z;
  const lat = (p[0] * Math.PI) / 180;
  const x = Math.floor(((p[1] + 180) / 360) * n);
  const y = Math.floor(((1 - Math.log(Math.tan(lat) + 1 / Math.cos(lat)) / Math.PI) / 2) * n);
  return [x, y];
}

/** Kachel-Adressen für eine Route: Wege abtasten, an Zielen etwas großzügiger */
export function tilesForRoute(start: LatLng, stops: LatLng[]): string[] {
  const set = new Set<string>();
  const add = (z: number, x: number, y: number) => set.add(`${z}/${x}/${y}`);
  const around = (p: LatLng, z: number, r: number) => {
    const [x, y] = tileOf(p, z);
    for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) add(z, x + dx, y + dy);
  };
  let prev = start;
  around(start, 15, 1);
  for (const p of stops) {
    // Weg dazwischen alle ~60 m abtasten
    const steps = Math.max(1, Math.ceil(distance(prev, p) / 60));
    for (let i = 0; i <= steps; i++) {
      const q: LatLng = [prev[0] + ((p[0] - prev[0]) * i) / steps, prev[1] + ((p[1] - prev[1]) * i) / steps];
      for (const z of [15, 16]) around(q, z, 0);
    }
    around(p, 15, 1);
    around(p, 16, 1);
    around(p, 17, 1);
    prev = p;
  }
  // Wichtigstes zuerst: grobe Zoomstufen, dann feinere
  return [...set]
    .sort((a, b) => Number(a.split('/')[0]) - Number(b.split('/')[0]))
    .slice(0, MAX_TILES)
    .map((k) => {
      const [z, x, y] = k.split('/').map(Number);
      return URL_TEMPLATE(z, x, y);
    });
}

interface Progress {
  id: string;
  done: number;
  total: number;
  running: boolean;
}
let progress: Progress | null = null;
const listeners = new Set<() => void>();
function emit(p: Progress | null) {
  progress = p;
  listeners.forEach((l) => l());
}
export function useTilePrefetch(): Progress | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => progress,
  );
}

const DONE_KEY = 'hh-hunt:tilesDone';

/** Startet das Vorladen für eine Tour (einmal pro Tour-ID) */
export async function prefetchTour(id: string, start: LatLng, stops: LatLng[]): Promise<void> {
  if (typeof fetch === 'undefined' || !('serviceWorker' in navigator)) return;
  if (loadJSON<string | null>(DONE_KEY, null) === id) {
    emit({ id, done: 1, total: 1, running: false });
    return;
  }
  if (progress?.running && progress.id === id) return;
  if (navigator.onLine === false) return;
  const urls = tilesForRoute(start, stops);
  let done = 0;
  emit({ id, done, total: urls.length, running: true });
  const queue = urls.slice();
  const worker = async () => {
    for (;;) {
      const u = queue.shift();
      if (!u) return;
      try {
        // wie die Kartenbilder selbst (no-cors), damit der Service Worker dieselben Einträge nutzt
        await fetch(u, { mode: 'no-cors', credentials: 'omit' });
      } catch {
        /* kein Netz: dann eben ohne */
      }
      done++;
      if (done % 5 === 0 || done === urls.length) emit({ id, done, total: urls.length, running: done < urls.length });
    }
  };
  await Promise.all([worker(), worker(), worker()]);
  saveJSON(DONE_KEY, id);
  emit({ id, done: urls.length, total: urls.length, running: false });
}
