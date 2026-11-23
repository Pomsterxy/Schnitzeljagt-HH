import { useSyncExternalStore } from 'react';
import type { LatLng } from '../data/types';
import { loadJSON, saveJSON } from './storage';
import { getPowerSave, subscribePowerSave } from './power';

export interface PositionState {
  coords: LatLng | null;
  /** Genauigkeit in Metern */
  accuracy: number;
  /** Kompassrichtung des Geräts, falls verfügbar */
  heading: number | null;
  status: 'idle' | 'waiting' | 'ok' | 'denied' | 'unavailable';
  simulated: boolean;
  updatedAt: number;
}

let state: PositionState = {
  coords: null,
  accuracy: 0,
  heading: null,
  status: 'idle',
  simulated: loadJSON('sim:on', false),
  updatedAt: 0,
};
const listeners = new Set<() => void>();
let watchId: number | null = null;

function emit(patch: Partial<PositionState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}
export function getPosition(): PositionState {
  return state;
}
export function usePosition(): PositionState {
  return useSyncExternalStore(subscribe, getPosition);
}

export function startTracking(): void {
  if (state.simulated) {
    const last = loadJSON<LatLng | null>('sim:pos', null);
    emit({ status: last ? 'ok' : 'waiting', coords: last ?? state.coords, accuracy: 5 });
    return;
  }
  if (watchId !== null) return;
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    emit({ status: 'unavailable' });
    return;
  }
  emit({ status: state.coords ? 'ok' : 'waiting' });
  watchId = navigator.geolocation.watchPosition(
    (p) => {
      if (state.simulated) return;
      emit({
        coords: [p.coords.latitude, p.coords.longitude],
        accuracy: p.coords.accuracy,
        heading: p.coords.heading ?? state.heading,
        status: 'ok',
        updatedAt: Date.now(),
      });
    },
    (err) => {
      if (state.simulated) return;
      emit({ status: err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable' });
    },
    // Stromsparmodus: ohne Höchstgenauigkeit und mit älteren Werten zufrieden
    getPowerSave() ? { enableHighAccuracy: false, maximumAge: 15000, timeout: 30000 } : { enableHighAccuracy: true, maximumAge: 5000, timeout: 30000 },
  );
}

// Sparmodus umgeschaltet: laufende Ortung mit neuen Einstellungen neu starten
subscribePowerSave(() => {
  if (watchId !== null && !state.simulated) {
    stopTracking();
    startTracking();
  }
});

export function stopTracking(): void {
  if (watchId !== null && typeof navigator !== 'undefined') navigator.geolocation.clearWatch(watchId);
  watchId = null;
}

/** Testmodus: Standort per Hand setzen (Karte antippen / zur Station springen) */
export function setSimulated(on: boolean): void {
  saveJSON('sim:on', on);
  emit({ simulated: on });
  if (on) {
    stopTracking();
    const last = loadJSON<LatLng | null>('sim:pos', null);
    emit({ coords: last ?? state.coords, accuracy: 5, status: last || state.coords ? 'ok' : 'waiting' });
  } else {
    emit({ coords: null, status: 'idle' });
    startTracking();
  }
}

export function setSimulatedPosition(coords: LatLng): void {
  saveJSON('sim:pos', coords);
  emit({ coords, accuracy: 5, status: 'ok', simulated: true, updatedAt: Date.now() });
}

let compassOn = false;

/** Gerätekompass (für den Richtungspfeil), iOS braucht eine Erlaubnis per Tipp */
export async function enableCompass(): Promise<boolean> {
  type DOE = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<string> };
  const D = (typeof DeviceOrientationEvent !== 'undefined' ? DeviceOrientationEvent : undefined) as DOE | undefined;
  if (!D) return false;
  try {
    if (D.requestPermission) {
      const r = await D.requestPermission();
      if (r !== 'granted') return false;
    }
  } catch {
    return false;
  }
  if (compassOn) return true;
  compassOn = true;
  // Android liefert absolute (nordbezogene) und relative Werte: Sobald absolute kommen, die relativen ignorieren
  let absolute = false;
  const handler = (e: DeviceOrientationEvent & { webkitCompassHeading?: number }) => {
    if (e.type === 'deviceorientationabsolute') absolute = true;
    else if (absolute && e.webkitCompassHeading == null) return;
    // iOS: webkitCompassHeading ist bereits nordbezogen. Sonst nur absolute Werte verwenden.
    let h: number | null = null;
    if (e.webkitCompassHeading != null) h = e.webkitCompassHeading;
    else if ((e.absolute || e.type === 'deviceorientationabsolute') && e.alpha != null) h = (360 - e.alpha) % 360;
    if (h != null) emit({ heading: h });
  };
  window.addEventListener('deviceorientationabsolute', handler as EventListener, true);
  window.addEventListener('deviceorientation', handler as EventListener, true);
  return true;
}
