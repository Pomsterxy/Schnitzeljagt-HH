import { useEffect, useRef, useState } from 'react';
import { compassWord, formatDistance } from '../lib/geo';
import { enableCompassResult } from '../lib/location';
import { play } from '../lib/feedback';
import { DotLoader } from './Micro';

/** Großer Kompass mit Entfernung; Antippen schaltet den Kompass des Handys ein */
export function Compass({ dist, brg, heading }: { dist: number; brg: number; heading: number | null }) {
  const arrow = heading != null ? brg - heading : brg;
  // Antippen schaltet den Kompass des Handys ein (iPhone fragt dabei um Erlaubnis)
  const [compass, setCompass] = useState<'off' | 'asking' | 'waiting' | 'denied' | 'none'>('off');
  useEffect(() => {
    if (compass !== 'waiting' || heading != null) return;
    const t = setTimeout(() => setCompass(denied.current ? 'denied' : 'none'), 4000);
    return () => clearTimeout(t);
  }, [compass, heading]);
  const denied = useRef(false);
  const turnOn = async () => {
    if (heading != null) return;
    play('tap');
    setCompass('asking');
    const r = await enableCompassResult();
    if (r === 'unsupported') setCompass('none');
    else {
      denied.current = r === 'denied';
      setCompass('waiting');
    }
  };
  const hint =
    heading != null
      ? null
      : compass === 'off'
        ? 'Antippen: Handy-Kompass einschalten'
        : compass === 'asking' || compass === 'waiting'
          ? 'Kompass wird eingeschaltet'
          : compass === 'denied'
            ? 'Kompass nicht erlaubt. Norden ist oben, dreht euch mit der Karte.'
            : 'Dieses Gerät hat keinen Kompass. Norden ist oben.';
  return (
    <div className="compass-wrap rise" aria-label={`Noch ${formatDistance(dist)} Richtung ${compassWord(brg)}`}>
      <button
        type="button"
        className={`compass-btn${heading != null ? ' live' : ''}`}
        data-testid="compass-tap"
        aria-label={heading != null ? 'Kompass des Handys ist an' : 'Kompass des Handys einschalten'}
        onClick={() => void turnOn()}
      >
      <svg className="compass-svg" width="220" height="220" viewBox="0 0 260 260" aria-hidden="true">
        <circle className="ping" cx="130" cy="130" r="120" fill="#C2410C" fillOpacity="0.1" />
        <circle className="ping b" cx="130" cy="130" r="120" fill="#C2410C" fillOpacity="0.1" />
        <circle cx="130" cy="130" r="100" fill="#FFFFFF" style={{ filter: 'drop-shadow(0 8px 20px rgba(0,0,0,0.10))' }} />
        <circle cx="130" cy="130" r="84" fill="none" stroke="#F2F2F7" strokeWidth="2" />
        <g transform={heading != null ? `rotate(${-heading} 130 130)` : undefined}>
          <path d="M130 36 V48 M130 212 V224 M36 130 H48 M212 130 H224" stroke="#1C1C1E" strokeWidth="3" strokeLinecap="round" />
          <text x="130" y="66" textAnchor="middle" fontWeight="800" fontSize="16" fill="#C2410C">N</text>
          <text x="200" y="135" textAnchor="middle" fontWeight="600" fontSize="13" fill="#8E8E93">O</text>
          <text x="130" y="204" textAnchor="middle" fontWeight="600" fontSize="13" fill="#8E8E93">S</text>
          <text x="60" y="135" textAnchor="middle" fontWeight="600" fontSize="13" fill="#8E8E93">W</text>
        </g>
        <g className="needle" style={{ transform: `rotate(${arrow}deg)` }}>
          <path d="M130 62 L142 130 L130 124 L118 130 Z" fill="#C2410C" />
          <path d="M130 198 L142 130 L130 136 L118 130 Z" fill="#D1D1D6" />
        </g>
        <circle cx="130" cy="130" r="7" fill="#1C1C1E" />
      </svg>
      </button>
      {hint && (
        <p className={`compass-hint${compass === 'off' ? ' pulse' : ''}`} data-testid="compass-hint" role="status">
          {compass === 'off' && (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 11V5a2 2 0 1 1 4 0v6" />
              <path d="M13 9a2 2 0 1 1 4 0v3a6 6 0 0 1-6 6h-.5A5.5 5.5 0 0 1 5 13.5V12a2 2 0 1 1 4 0" />
            </svg>
          )}
          {hint}
          {(compass === 'asking' || compass === 'waiting') && <DotLoader />}
        </p>
      )}
      <div className="big-dist" data-testid="distance">
        {formatDistance(dist)}
      </div>
      <div className="dir">
        Richtung {compassWord(brg)}
        {heading == null ? ' · Norden ist oben' : ''}
      </div>
    </div>
  );
}
