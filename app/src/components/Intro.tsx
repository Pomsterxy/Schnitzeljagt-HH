import { useEffect, useState } from 'react';
import { Lilli } from './Lilli';

const KEY = 'hh-hunt:introSeen';

/** Soll das Intro gezeigt werden? (einmal pro App-Start, nicht in automatisierten Tests, nicht bei "Bewegung reduzieren") */
export function shouldShowIntro(): boolean {
  try {
    if (navigator.webdriver) return false;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false;
    if (sessionStorage.getItem(KEY)) return false;
  } catch {
    return false;
  }
  return true;
}

const PHASES = ['Atme ein', 'Atme aus', 'Moin!'];

/** Ruhiger Einstieg: Lilli steigt mit der Elbwelle auf, wie ein Atemzug */
export function Intro({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState(0);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 2200);
    const t2 = setTimeout(() => setPhase(2), 4400);
    const t3 = setTimeout(() => setLeaving(true), 5600);
    const t4 = setTimeout(finish, 6200);
    return () => [t1, t2, t3, t4].forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function finish() {
    try {
      sessionStorage.setItem(KEY, '1');
    } catch {
      /* egal */
    }
    onDone();
  }

  return (
    <div className={`intro${leaving ? ' leaving' : ''}`} onClick={finish} role="button" tabIndex={0} aria-label="Intro überspringen" onKeyDown={finish}>
      <div key={phase} className="intro-text">
        {PHASES[phase]}
      </div>
      <div className={`intro-hill phase-${phase}`}>
        <div className="intro-lilli">
          <Lilli size={150} mood={phase === 2 ? 'excited' : 'happy'} />
        </div>
        <svg viewBox="0 0 390 400" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="intro-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#FFB547" />
              <stop offset="0.45" stopColor="#FF5E3A" />
              <stop offset="1" stopColor="#E8457C" />
            </linearGradient>
          </defs>
          <path d="M0 80 C80 20 150 0 195 0 C240 0 310 20 390 80 V400 H0 Z" fill="url(#intro-grad)" />
        </svg>
      </div>
      <div className="intro-skip">Tippen zum Überspringen</div>
    </div>
  );
}
