import { useSyncExternalStore } from 'react';
import { loadJSON, saveJSON } from './storage';

/** Stromsparmodus: Bildschirm darf ausgehen, GPS etwas seltener und ohne Höchstgenauigkeit */
const KEY = 'hh-hunt:powerSave';
let on = loadJSON<boolean>(KEY, false);
const listeners = new Set<() => void>();

export function getPowerSave(): boolean {
  return on;
}
export function setPowerSave(v: boolean): void {
  on = v;
  saveJSON(KEY, v);
  listeners.forEach((l) => l());
}
export function subscribePowerSave(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}
export function usePowerSave(): boolean {
  return useSyncExternalStore(subscribePowerSave, getPowerSave);
}

interface BatteryLike {
  level: number;
  charging: boolean;
  addEventListener: (t: string, f: () => void) => void;
  removeEventListener: (t: string, f: () => void) => void;
}

/** Akkustand beobachten (nur wo der Browser es erlaubt, z. B. Android/Chrome; iPhones melden ihn nicht) */
export function watchBattery(cb: (level: number, charging: boolean) => void): () => void {
  const nav = navigator as Navigator & { getBattery?: () => Promise<BatteryLike> };
  if (!nav.getBattery) return () => {};
  let bat: BatteryLike | null = null;
  const update = () => bat && cb(bat.level, bat.charging);
  let stopped = false;
  nav
    .getBattery()
    .then((b) => {
      if (stopped) return;
      bat = b;
      update();
      b.addEventListener('levelchange', update);
      b.addEventListener('chargingchange', update);
    })
    .catch(() => {});
  return () => {
    stopped = true;
    bat?.removeEventListener('levelchange', update);
    bat?.removeEventListener('chargingchange', update);
  };
}
