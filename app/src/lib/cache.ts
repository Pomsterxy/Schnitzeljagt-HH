import type { LatLng } from '../data/types';
import { rng } from './route';

/** Koordinate im Geocaching-Format: N 53° 35.447' */
export interface DegMin {
  deg: number;
  min: number;
  /** drei Nachkommastellen der Minuten, als Ziffern */
  digits: [number, number, number];
}

export function toDegMin(v: number): DegMin {
  const deg = Math.floor(v);
  const totalThousandths = Math.round((v - deg) * 60 * 1000);
  const min = Math.floor(totalThousandths / 1000);
  const rest = totalThousandths % 1000;
  return { deg, min, digits: [Math.floor(rest / 100), Math.floor(rest / 10) % 10, rest % 10] };
}

export function fromDegMin(deg: number, min: number, thousandths: number): number {
  return deg + (min + thousandths / 1000) / 60;
}

export function formatDegMin(c: LatLng): string {
  const n = toDegMin(c[0]);
  const e = toDegMin(c[1]);
  const f = (d: DegMin, w: number) =>
    `${String(d.deg).padStart(w, '0')}° ${String(d.min).padStart(2, '0')}.${d.digits.join('')}`;
  return `N ${f(n, 2)}  E ${f(e, 3)}`;
}

export interface CacheLetter {
  letter: string;
  value: number;
  label: string;
  stationId: string;
}

export const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** Ein Ausdruck wie "A + 3" oder "B + C − 4", der eine Zielziffer ergibt */
export interface DigitExpr {
  text: string;
  value: number;
}

function sign(n: number) {
  return n === 0 ? '' : n > 0 ? ` + ${n}` : ` − ${-n}`;
}

/**
 * Baut für jede der 6 Ziffern einen Rechenausdruck aus den gesammelten Buchstaben.
 * Einfach: "A + 2"; schwer: "A + B − 3" (für ältere Kinder/Erwachsene).
 */
export function buildFormula(target: LatLng, letters: CacheLetter[], hard: boolean, seed: number) {
  const n = toDegMin(target[0]);
  const e = toDegMin(target[1]);
  const rand = rng(seed);
  const digits = [...n.digits, ...e.digits];
  const exprs: DigitExpr[] = digits.map((d, i) => {
    if (!letters.length) return { text: String(d), value: d };
    const a = letters[i % letters.length];
    if (hard && letters.length >= 2) {
      const b = letters[(i + 1 + Math.floor(rand() * (letters.length - 1))) % letters.length];
      if (b.letter !== a.letter) return { text: `${a.letter} + ${b.letter}${sign(d - a.value - b.value)}`, value: d };
    }
    return { text: `${a.letter}${sign(d - a.value)}`, value: d };
  });
  return {
    north: { deg: n.deg, min: n.min, exprs: exprs.slice(0, 3) },
    east: { deg: e.deg, min: e.min, exprs: exprs.slice(3) },
  };
}

/** Prüft die eingegebenen Nachkommastellen (je 3 Ziffern) */
export function checkCoords(target: LatLng, north: string, east: string): { north: boolean; east: boolean } {
  const n = toDegMin(target[0]).digits.join('');
  const e = toDegMin(target[1]).digits.join('');
  return { north: north.trim() === n, east: east.trim() === e };
}

/** Exakte Zielkoordinate aus den Gradminuten (so wie das Team sie berechnet) */
export function solvedTarget(target: LatLng): LatLng {
  const n = toDegMin(target[0]);
  const e = toDegMin(target[1]);
  return [
    fromDegMin(n.deg, n.min, n.digits[0] * 100 + n.digits[1] * 10 + n.digits[2]),
    fromDegMin(e.deg, e.min, e.digits[0] * 100 + e.digits[1] * 10 + e.digits[2]),
  ];
}
