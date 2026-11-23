import { useEffect, useState } from 'react';
import { Lilli } from './Lilli';

/** Geführte Atemübung: Lilli hebt und senkt sich mit dem Hügel (5 s ein, 5 s aus) */
export function Breath() {
  const [inhale, setInhale] = useState(true);
  useEffect(() => {
    const t = setInterval(() => setInhale((v) => !v), 5000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="breath" role="img" aria-label="Atemübung">
      <div key={String(inhale)} className="breath-text fade" aria-live="polite">
        {inhale ? 'Atme ein' : 'Atme aus'}
      </div>
      <div className="breath-hill">
        <div className="breath-lilli">
          <Lilli size={110} mood="quiet" />
        </div>
        <svg viewBox="0 0 390 240" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 60 C80 15 150 0 195 0 C240 0 310 15 390 60 V240 H0 Z" fill="#8A8F98" />
        </svg>
      </div>
    </div>
  );
}
