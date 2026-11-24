import { useSyncExternalStore } from 'react';
import { loadJSON, saveJSON } from '../lib/storage';

/** Lillis Kleiderschrank: Kostüme als Belohnung für Touren und Abzeichen */
export type OutfitId = 'none' | 'schal' | 'kapitaen' | 'sonnenbrille' | 'blume' | 'piratentuch' | 'krone';

export const OUTFITS: { id: OutfitId; name: string; tours?: number; badges?: number }[] = [
  { id: 'none', name: 'Ganz natürlich' },
  { id: 'schal', name: 'Hamburger Halstuch', tours: 1 },
  { id: 'blume', name: 'Gänseblümchen', badges: 3 },
  { id: 'kapitaen', name: 'Kapitänsmütze', tours: 2 },
  { id: 'sonnenbrille', name: 'Sonnenbrille', badges: 6 },
  { id: 'piratentuch', name: 'Piratentuch', tours: 4 },
  { id: 'krone', name: 'Goldene Krone', badges: 12 },
];

export function outfitUnlocked(o: (typeof OUTFITS)[number], career: { tours: number; badges: string[] }): boolean {
  return (o.tours === undefined || career.tours >= o.tours) && (o.badges === undefined || career.badges.length >= o.badges);
}
export function unlockText(o: (typeof OUTFITS)[number]): string {
  if (o.tours) return `ab ${o.tours} ${o.tours === 1 ? 'Tour' : 'Touren'}`;
  if (o.badges) return `ab ${o.badges} Abzeichen`;
  return '';
}

const KEY = 'hh-hunt:outfit';
let current = loadJSON<OutfitId>(KEY, 'none');
const listeners = new Set<() => void>();
export function setOutfit(id: OutfitId) {
  current = id;
  saveJSON(KEY, id);
  listeners.forEach((l) => l());
}
export function useOutfit(): OutfitId {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
  );
}

const INK = '#1E2A4A';

/** Kostüm über Lilli zeichnen (gleiches Koordinatensystem wie Lilli: 200×200) */
export function OutfitLayer({ id }: { id: OutfitId }) {
  switch (id) {
    case 'schal':
      return (
        <g>
          <path d="M50 112 Q96 134 142 112 L142 126 Q96 148 50 126 Z" fill="#E63946" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
          <path d="M66 119 L66 133 M86 124 L86 138 M106 124 L106 138 M126 119 L126 133" stroke="#FFFFFF" strokeWidth="6" />
          <path d="M60 124 L50 156 L68 152 L72 128 Z" fill="#E63946" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
        </g>
      );
    case 'kapitaen':
      return (
        <g>
          <path d="M50 46 Q96 -16 142 46 Z" fill="#FFFFFF" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
          <rect x="47" y="38" width="98" height="15" rx="7" fill={INK} />
          <path d="M80 50 Q110 47 140 56 Q112 64 82 58 Z" fill={INK} />
          <circle cx="96" cy="30" r="7" fill="#FFC83D" stroke={INK} strokeWidth="3" />
        </g>
      );
    case 'sonnenbrille':
      return (
        <g>
          <rect x="58" y="60" width="34" height="24" rx="11" fill={INK} />
          <rect x="100" y="60" width="34" height="24" rx="11" fill={INK} />
          <path d="M92 70 Q96 66 100 70" stroke={INK} strokeWidth="4" fill="none" />
          <path d="M64 66 L74 66 M106 66 L116 66" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
        </g>
      );
    case 'blume':
      return (
        <g transform="translate(132 34)">
          {[0, 72, 144, 216, 288].map((r) => (
            <ellipse key={r} cx="0" cy="-11" rx="7" ry="11" fill="#FFFFFF" stroke={INK} strokeWidth="3" transform={`rotate(${r})`} />
          ))}
          <circle r="7" fill="#FFC83D" stroke={INK} strokeWidth="3" />
        </g>
      );
    case 'piratentuch':
      return (
        <g>
          <path d="M46 60 Q96 6 146 60 Q96 44 46 60 Z" fill="#E63946" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
          <circle cx="78" cy="36" r="3.5" fill="#FFFFFF" />
          <circle cx="100" cy="28" r="3.5" fill="#FFFFFF" />
          <circle cx="120" cy="38" r="3.5" fill="#FFFFFF" />
          <path d="M144 56 L164 48 L160 66 Z M144 58 L166 70 L150 74 Z" fill="#E63946" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
        </g>
      );
    case 'krone':
      return (
        <g>
          <path d="M62 36 L68 6 L84 24 L96 2 L108 24 L124 6 L130 36 Z" fill="#FFC83D" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
          <circle cx="96" cy="26" r="4.5" fill="#E63946" />
          <circle cx="76" cy="29" r="3.5" fill="#3B8BFF" />
          <circle cx="116" cy="29" r="3.5" fill="#12B5A8" />
        </g>
      );
    default:
      return null;
  }
}
