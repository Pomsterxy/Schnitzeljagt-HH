import type { Poi, Station } from './types';
import { STATIONS_WINTERHUDE } from './stations-winterhude';
import { STATIONS_ALSTERDORF, STATIONS_BARMBEK } from './stations-barmbek-alsterdorf';
import poisJson from './pois.json';
import creditsJson from '../../public/img/credits.json';

export const STATIONS: Station[] = [...STATIONS_WINTERHUDE, ...STATIONS_BARMBEK, ...STATIONS_ALSTERDORF].map((s) => ({
  ...s,
  // Stolperstein-Stationen haben ein Foto unter ihrer eigenen ID
  images: s.images.length ? s.images : [s.id],
}));

export const STATION_BY_ID = new Map(STATIONS.map((s) => [s.id, s]));

export const POIS: Poi[] = poisJson as Poi[];
export const POI_BY_ID = new Map(POIS.map((p) => [p.id, p]));

/** Pausenorte für die Route: Spielplätze und Eisdielen */
export const PAUSE_POIS: Poi[] = POIS.filter((p) => p.kind === 'eis' || p.kind === 'spielplatz');

export interface Credit {
  file: string;
  author: string;
  license: string;
  source: string;
}
export const CREDITS: Record<string, Credit> = creditsJson as Record<string, Credit>;

export function imageUrl(id: string): string {
  return `${import.meta.env.BASE_URL}img/stations/${id}.jpg`;
}
