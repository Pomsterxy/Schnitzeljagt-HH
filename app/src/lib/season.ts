import type { LatLng } from '../data/types';
import { POI_INFO } from '../data/open';
import { sunset } from './daylight';

/** Jahreszeit und Tageslicht: beeinflussen, welche Orte die Route bevorzugt */
export interface Season {
  /** November bis März: Eisdielen haben oft zu */
  winter: boolean;
  /** Juni bis August: Wasser und Planschbecken sind ein Gewinn */
  summer: boolean;
  /** Ein Teil der Tour liegt nach Sonnenuntergang: unbeleuchtete Parks meiden */
  dark: boolean;
  /** Spielplätze mit Planschbecken oder Wasserspiel */
  wetIds: string[];
}

const WET = /Plansch|Wasserspiel|Wassermatsch|Matschanlage|Wasserpumpe/i;
export const WET_PLAYGROUNDS: string[] = Object.entries(POI_INFO)
  .filter(([, v]) => v.playground && WET.test(v.playground.text + ' ' + v.playground.name))
  .map(([id]) => id);

export function seasonFor(now: Date, minutes: number, at: LatLng): Season {
  const m = now.getMonth() + 1;
  const end = now.valueOf() + minutes * 60000;
  // dunkel, wenn mehr als ein Viertel der Tour nach Sonnenuntergang liegt
  const set = sunset(now, at).valueOf();
  const darkPart = Math.max(0, end - Math.max(set, now.valueOf())) / (minutes * 60000);
  return { winter: m >= 11 || m <= 3, summer: m >= 6 && m <= 8, dark: darkPart > 0.25, wetIds: WET_PLAYGROUNDS };
}

/** Kurzer Hinweis für die Planung (oder null) */
export function seasonNote(s: Season): string | null {
  const parts: string[] = [];
  if (s.dark) parts.push('Es wird während der Tour dunkel: Die Route meidet Parkwege ohne Laternen. Nehmt eine Taschenlampe mit.');
  if (s.winter) parts.push('Im Winter haben Eisdielen oft zu, die Pause ist deshalb auf einem Spielplatz geplant. Ein warmes Getränk in der Thermoskanne hilft.');
  if (s.summer) parts.push('Sommer-Tour: Wasser-Stationen werden bevorzugt, und wenn es passt, liegt die Pause an einem Planschbecken. Badesachen und Handtuch einpacken!');
  return parts.length ? parts.join(' ') : null;
}
