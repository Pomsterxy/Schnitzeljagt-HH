import type { LatLng } from '../data/types';

const R = 6371000;
const toRad = (d: number) => (d * Math.PI) / 180;

/** Luftlinie in Metern */
export function distance(a: LatLng, b: LatLng): number {
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Kompassrichtung von a nach b in Grad (0 = Norden) */
export function bearing(a: LatLng, b: LatLng): number {
  const φ1 = toRad(a[0]);
  const φ2 = toRad(b[0]);
  const Δλ = toRad(b[1] - a[1]);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** Stadtstraßen sind nicht gerade: Umwegfaktor für geschätzte Fußwege */
export const DETOUR = 1.3;

export function walkDistance(a: LatLng, b: LatLng): number {
  return distance(a, b) * DETOUR;
}

/** Gehzeit in Minuten bei km/h */
export function walkMinutes(meters: number, kmh: number): number {
  return meters / ((kmh * 1000) / 60);
}

export function formatDistance(m: number): string {
  if (m < 1000) return `${Math.round(m / 5) * 5} m`;
  return `${(m / 1000).toFixed(1).replace('.', ',')} km`;
}

const DIRS = ['Norden', 'Nordosten', 'Osten', 'Südosten', 'Süden', 'Südwesten', 'Westen', 'Nordwesten'];
export function compassWord(deg: number): string {
  return DIRS[Math.round(deg / 45) % 8];
}

/**
 * Freischaltung: Man ist "da", wenn die Entfernung kleiner ist als der Radius
 * plus ein Teil der GPS-Ungenauigkeit (gedeckelt, damit man nicht aus 100 m freischaltet).
 */
export function isWithinUnlock(dist: number, radius: number, accuracy: number): boolean {
  return dist <= radius + Math.min(Math.max(accuracy, 0), 20);
}

export type Temperature = 'eiskalt' | 'kalt' | 'lauwarm' | 'warm' | 'heiß' | 'kochend';

/** Heiß/Kalt anhand Entfernung und ob man sich nähert */
export function temperature(dist: number): Temperature {
  if (dist < 40) return 'kochend';
  if (dist < 100) return 'heiß';
  if (dist < 250) return 'warm';
  if (dist < 500) return 'lauwarm';
  if (dist < 1000) return 'kalt';
  return 'eiskalt';
}
