import { useEffect, useRef, useState } from 'react';
import { play } from '../lib/feedback';
import { burst, centerOf, reducedMotion } from '../lib/effects';
import { loadJSON, saveJSON } from '../lib/storage';

/** Drei hüpfende Punkte (Ladeanzeige) */
export function DotLoader() {
  return (
    <span className="dot-loader" aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}

/** Zahl, die beim Ändern nach oben wegrollt (wie ein Zählwerk) */
export function RollingNumber({ value }: { value: number }) {
  const prev = useRef(value);
  const [old, setOld] = useState<number | null>(null);
  useEffect(() => {
    if (prev.current === value) return;
    setOld(prev.current);
    prev.current = value;
    const t = setTimeout(() => setOld(null), 450);
    return () => clearTimeout(t);
  }, [value]);
  return (
    <span className="roll">
      {old !== null && (
        <span key={`o${old}`} className="roll-out" aria-hidden="true">
          {old}
        </span>
      )}
      <span key={`n${value}`} className={old !== null ? 'roll-in' : undefined}>
        {value}
      </span>
    </span>
  );
}

/** Häkchen, das sich selbst zeichnet */
export function CheckDraw({ size = 34 }: { size?: number }) {
  return (
    <svg className="check-draw" width={size} height={size} viewBox="0 0 36 36" aria-hidden="true">
      <circle cx="18" cy="18" r="16" />
      <path d="M10.5 18.5l5 5L26 13" />
    </svg>
  );
}

/** Ripple: Welle beim Antippen von Knöpfen (einmal global eingerichtet) */
export function useRipple() {
  useEffect(() => {
    if (reducedMotion()) return;
    const onDown = (e: PointerEvent) => {
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>('.btn, .chip, .step-pill, .talk-vote, .people-row button, .action, .report-kind');
      if (!el || (el as HTMLButtonElement).disabled) return;
      const r = el.getBoundingClientRect();
      const d = Math.max(r.width, r.height) * 2;
      const s = document.createElement('span');
      s.className = 'ripple';
      s.style.width = s.style.height = `${d}px`;
      s.style.left = `${e.clientX - r.left - d / 2}px`;
      s.style.top = `${e.clientY - r.top - d / 2}px`;
      el.appendChild(s);
      setTimeout(() => s.remove(), 650);
    };
    document.addEventListener('pointerdown', onDown, { passive: true });
    return () => document.removeEventListener('pointerdown', onDown);
  }, []);
}

/** Kleiner Herz-Burst an einem Element (z. B. beim Abstimmen) */
export function heartBurst(el: Element | null) {
  const c = centerOf(el);
  burst({ x: c.x, y: c.y, count: 10, spread: 120, angle: -90, power: 7, emoji: ['💜', '✨', '💛'], scalar: 0.9, gravity: 0.2 });
}

const RATE_KEY = 'hh-hunt:ratings';
const RATE_TEXT = ['', 'Danke! Was können wir besser machen?', 'Danke! Beim nächsten Mal wird es noch besser.', 'Schön, dass es euch gefallen hat!', 'Super, das freut Lilli!', 'Wow, fünf Sterne! Lilli macht einen Freudentanz!'];

/** Sterne-Bewertung am Ende der Tour (bleibt auf dem Handy) */
export function StarRating({ id }: { id: string }) {
  const [stars, setStars] = useState(() => loadJSON<Record<string, number>>(RATE_KEY, {})[id] ?? 0);
  const [anim, setAnim] = useState(0);
  const rate = (n: number, el: Element) => {
    setStars(n);
    setAnim((a) => a + 1);
    const all = loadJSON<Record<string, number>>(RATE_KEY, {});
    saveJSON(RATE_KEY, { ...all, [id]: n });
    play(n >= 4 ? 'correct' : 'select');
    if (n === 5) {
      const c = centerOf(el);
      burst({ x: c.x, y: c.y, count: 30, spread: 360, power: 9, shapes: ['star'], colors: ['#F4B32D', '#FFD35A', '#EF7A2F'], gravity: 0.2 });
    }
  };
  return (
    <section className="card rate rise" data-testid="rating">
      <div className="caption">Wie hat euch die Tour gefallen?</div>
      <div className="stars-row" role="radiogroup" aria-label="Bewertung">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={`${n}-${anim}`}
            type="button"
            role="radio"
            aria-checked={stars === n}
            aria-label={`${n} von 5 Sternen`}
            className={`star${n <= stars ? ' on' : ''}`}
            style={{ animationDelay: `${(n - 1) * 70}ms` }}
            onClick={(e) => rate(n, e.currentTarget)}
          >
            <svg width="38" height="38" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.3l-5.6 2.9 1.1-6.3L2.9 9.5l6.3-.9z" />
            </svg>
          </button>
        ))}
      </div>
      {stars > 0 && (
        <p key={stars} className="muted fade" role="status">
          {RATE_TEXT[stars]}
        </p>
      )}
    </section>
  );
}
