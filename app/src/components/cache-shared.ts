import { loadJSON } from '../lib/storage';

/** Symbole je Cache-Typ */
export const TYPE_ICON: Record<string, string> = {
  Traditional: '📦',
  Multi: '🧩',
  Quiz: '❓',
  Virtual: '👻',
  Event: '🎉',
  Webcam: '📷',
  Moving: '🚲',
  Math: '🧮',
  Drive_In: '🚗',
  Other: '📍',
};

export const FOUND_KEY = 'hh-hunt:foundCaches';
export function foundCaches(): string[] {
  return loadJSON<string[]>(FOUND_KEY, []);
}
