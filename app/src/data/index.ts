import type { Poi, Station } from './types';
import { STATIONS_WINTERHUDE } from './stations-winterhude';
import { STATIONS_ALSTERDORF, STATIONS_BARMBEK } from './stations-barmbek-alsterdorf';
import { STATIONS_ARCHITEKTUR } from './stations-architektur';
import poisJson from './pois.json';
import { OPEN_POIS, OPEN_STATIONS } from './open';
import creditsJson from '../../public/img/credits.json';

export const STATIONS: Station[] = [...STATIONS_WINTERHUDE, ...STATIONS_BARMBEK, ...STATIONS_ALSTERDORF, ...STATIONS_ARCHITEKTUR].map((s) => ({
  ...s,
  // Stolperstein-Stationen haben ein Foto unter ihrer eigenen ID
  images: s.images.length ? s.images : [s.id],
}));

/** Alle Stationen für die Routenplanung: handverlesene + aus offenen Daten (Denkmaltafeln, Stolpersteine) */
export const ROUTE_STATIONS: Station[] = [...STATIONS, ...OPEN_STATIONS];
export const STATION_BY_ID = new Map(ROUTE_STATIONS.map((s) => [s.id, s]));
/** Nur handverlesene Stationen zählen fürs Album */
export const ALBUM_IDS = new Set(STATIONS.map((s) => s.id));

export const POIS: Poi[] = [...(poisJson as Poi[]), ...OPEN_POIS];
export const POI_BY_ID = new Map(POIS.map((p) => [p.id, p]));

/** Pausenorte für die Route: Spielplätze und Eisdielen */
export const PAUSE_POIS: Poi[] = POIS.filter((p) => p.kind === 'eis' || p.kind === 'spielplatz');

export const POI_EMOJI: Record<Poi['kind'], string> = { spielplatz: '🛝', eis: '🍦', wc: '🚻', cafe: '☕', kunst: '🗿', trinkwasser: '🚰' };

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
