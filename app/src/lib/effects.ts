/**
 * Effekte für Erfolgsmomente: Konfetti mit Physik, Sterne, Emoji-Regen und fliegende Punkte.
 * Jede Komponente kann sie auslösen; gezeichnet wird von einer einzigen Ebene (EffectsLayer).
 */

export type Shape = 'rect' | 'circle' | 'star' | 'ribbon';

export interface BurstOptions {
  /** Ursprung in Pixeln (Viewport); Standard: Bildschirmmitte, etwas oberhalb */
  x?: number;
  y?: number;
  count?: number;
  /** Streuung in Grad */
  spread?: number;
  /** Abschussrichtung in Grad (-90 = nach oben) */
  angle?: number;
  /** Anfangsgeschwindigkeit in px/Frame */
  power?: number;
  colors?: string[];
  shapes?: Shape[];
  /** Emojis statt Papierschnipseln */
  emoji?: string[];
  gravity?: number;
  /** Größe der Teilchen */
  scalar?: number;
}

export interface FloatOptions {
  text: string;
  x: number;
  y: number;
  color?: string;
}

type Listener = { burst: (o: BurstOptions) => void; float: (o: FloatOptions) => void; flash: (color: string) => void; clear: () => void };
let listener: Listener | null = null;

export function registerEffects(l: Listener | null) {
  listener = l;
}

export function reducedMotion(): boolean {
  try {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  } catch {
    return false;
  }
}

export const PARTY = ['#FF6A1F', '#FFB547', '#F5B000', '#0F766E', '#0A84FF', '#7C3AED', '#34C759', '#FF4F8B'];
export const GOLD = ['#FFD35A', '#F5B000', '#FFE9A3', '#E8A33D', '#FFFFFF'];

/** Mitte eines Elements als Ursprung */
export function centerOf(el: Element | null | undefined): { x: number; y: number } {
  if (!el) return { x: window.innerWidth / 2, y: window.innerHeight * 0.35 };
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

/** Alle laufenden Effekte sofort beenden (z. B. beim Wechsel auf einen anderen Bildschirm) */
export function clearEffects() {
  listener?.clear();
}

export function burst(o: BurstOptions = {}) {
  if (reducedMotion()) return;
  listener?.burst(o);
}

export function floatPoints(text: string, at: { x: number; y: number }, color?: string) {
  if (reducedMotion()) return;
  listener?.float({ text, x: at.x, y: at.y, color });
}

export function flash(color = 'rgba(255, 211, 90, 0.35)') {
  if (reducedMotion()) return;
  listener?.flash(color);
}

// ---------- fertige Feiern ----------

/** Station gefunden: zwei Kanonen von unten links/rechts + Regen von oben */
export function celebrateArrival() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  flash('rgba(255, 181, 71, 0.28)');
  burst({ x: 0, y: h * 0.75, angle: -60, spread: 40, power: 20, count: 70 });
  burst({ x: w, y: h * 0.75, angle: -120, spread: 40, power: 20, count: 70 });
  setTimeout(() => burst({ x: w / 2, y: -20, angle: 90, spread: 160, power: 4, count: 60, gravity: 0.12 }), 250);
}

/** Richtige Antwort: kleiner Knall am Element */
export function celebrateCorrect(el: Element | null, points: number) {
  const c = centerOf(el);
  burst({ x: c.x, y: c.y, count: 36, spread: 360, power: 9, scalar: 0.8, gravity: 0.28 });
  if (points > 0) floatPoints(`+${points}`, c);
}

/** Zwischenziel erreicht */
export function celebrateWaypoint(el: Element | null, points: number) {
  const c = centerOf(el);
  burst({ x: c.x, y: c.y, count: 50, spread: 360, power: 11, shapes: ['star', 'circle'], gravity: 0.25 });
  floatPoints(`+${points}`, c);
}

/** Familien-Moment geschafft: Herzen */
export function celebrateFamily(el: Element | null) {
  const c = centerOf(el);
  burst({ x: c.x, y: c.y, count: 22, spread: 120, angle: -90, power: 12, emoji: ['💛', '🧡', '💜', '⭐', '🎉'], scalar: 1.4, gravity: 0.22 });
  burst({ x: c.x, y: c.y, count: 30, spread: 360, power: 8, scalar: 0.8 });
}

/** Pause erreicht */
export function celebratePause(el: Element | null) {
  const c = centerOf(el);
  burst({ x: c.x, y: c.y, count: 16, spread: 140, angle: -90, power: 11, emoji: ['🍦', '🛝', '☀️', '🎈'], scalar: 1.5, gravity: 0.25 });
}

/** Zahlenschloss geknackt */
export function celebrateUnlock(el: Element | null) {
  const c = centerOf(el);
  flash('rgba(255, 211, 90, 0.4)');
  burst({ x: c.x, y: c.y, count: 80, spread: 360, power: 13, colors: GOLD, shapes: ['star', 'circle', 'rect'] });
}

/** Schatz gefunden: Goldregen in Wellen */
export function celebrateTreasure() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  flash('rgba(255, 211, 90, 0.5)');
  burst({ x: w / 2, y: h * 0.4, count: 120, spread: 360, power: 16, colors: GOLD, shapes: ['star', 'circle', 'ribbon'] });
  for (let i = 1; i <= 3; i++) {
    setTimeout(() => {
      burst({ x: w * (0.2 + 0.3 * (i - 1)), y: -20, angle: 90, spread: 120, power: 4, count: 50, colors: GOLD, shapes: ['star', 'rect'], gravity: 0.1 });
      burst({ x: w / 2, y: h * 0.4, count: 8, spread: 360, power: 9, emoji: ['💎', '🪙', '✨'], scalar: 1.6, gravity: 0.2 });
    }, i * 450);
  }
}

/** Tour geschafft: großes Finale */
export function celebrateFinish() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  for (let i = 0; i < 4; i++) {
    setTimeout(() => {
      burst({ x: 0, y: h * 0.8, angle: -55, spread: 35, power: 22, count: 60 });
      burst({ x: w, y: h * 0.8, angle: -125, spread: 35, power: 22, count: 60 });
    }, i * 600);
  }
  setTimeout(() => burst({ x: w / 2, y: -20, angle: 90, spread: 170, power: 4, count: 90, gravity: 0.1 }), 900);
}

/** Kleines Feuerwerk (z. B. Route fertig geplant) */
export function sparkle(el: Element | null) {
  const c = centerOf(el);
  burst({ x: c.x, y: c.y, count: 30, spread: 360, power: 7, shapes: ['star'], colors: ['#FFD35A', '#FFFFFF', '#FF8A3D'], scalar: 0.9, gravity: 0.15 });
}
