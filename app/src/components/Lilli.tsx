import { OutfitLayer, useOutfit, type OutfitId } from './Outfits';
/** Lilli, die Möwe – Begleiterin durch die Tour (Sticker-Stil: klare Konturen, großer Kopf) */
export type LilliMood = 'happy' | 'excited' | 'quiet' | 'night';

const INK = '#1E2A4A';

export function Lilli({ size = 56, mood = 'happy', label, outfit }: { size?: number; mood?: LilliMood; label?: string; outfit?: OutfitId }) {
  const worn = useOutfit();
  // an Gedenkorten ohne Kostüm
  const dress = mood === 'quiet' ? 'none' : (outfit ?? worn);
  const quiet = mood === 'quiet';
  const excited = mood === 'excited';
  const ink = quiet ? '#5A6170' : INK;
  const wing = quiet ? '#D5DAE1' : '#C9D6EA';
  const beak = quiet ? '#E7CF9E' : '#FFB020';
  return (
    <svg
      className={`lilli${quiet ? ' lilli-quiet' : ' bob'}`}
      width={size}
      height={size}
      viewBox="0 0 200 200"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {/* Bodenschatten */}
      <ellipse cx="100" cy="190" rx="46" ry="7" fill={INK} opacity="0.13" />
      {/* Füße */}
      <path d="M84 168 L80 186 L92 186 Z M114 168 L110 186 L122 186 Z" fill="#FF8A1F" stroke={ink} strokeWidth="4" strokeLinejoin="round" />
      {/* Schwanz */}
      <path d="M50 124 L28 112 L36 136 Z" fill="#9FB2CC" stroke={ink} strokeWidth="5" strokeLinejoin="round" />
      {/* Körper */}
      <ellipse cx="100" cy="134" rx="58" ry="46" fill="#FFFFFF" stroke={ink} strokeWidth="5" />
      {/* Flügel: angelegt oder winkend */}
      {excited ? (
        <g className="flap fast">
          <path d="M140 120 C158 104 166 88 176 70 C184 88 178 108 164 120 C156 128 148 132 140 132 Z" fill={wing} stroke={ink} strokeWidth="5" strokeLinejoin="round" />
        </g>
      ) : (
        <g className={quiet ? '' : 'flap'}>
          <ellipse cx="136" cy="136" rx="22" ry="30" fill={wing} stroke={ink} strokeWidth="5" transform="rotate(-24 136 136)" />
          <path d="M126 128 Q138 134 146 128" fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round" />
        </g>
      )}
      {/* Kopf */}
      <circle cx="96" cy="76" r="50" fill="#FFFFFF" stroke={ink} strokeWidth="5" />
      <path d="M88 30 Q90 12 102 24 Q108 10 116 28" fill="none" stroke={ink} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Augen */}
      {quiet ? (
        <g stroke={ink} strokeWidth="5" strokeLinecap="round" fill="none">
          <path d="M66 76 Q76 84 86 76" />
          <path d="M106 76 Q116 84 126 76" />
        </g>
      ) : (
        <>
          <circle cx="76" cy="72" r={excited ? 13 : 12} fill={INK} />
          <circle cx="80" cy="67" r="4.5" fill="#FFFFFF" />
          <circle cx="116" cy="72" r={excited ? 13 : 12} fill={INK} />
          <circle cx="120" cy="67" r="4.5" fill="#FFFFFF" />
        </>
      )}
      {/* Bäckchen */}
      {!quiet && (
        <>
          <ellipse cx="64" cy="94" rx="9" ry="6" fill="#FF9DB0" />
          <ellipse cx="128" cy="94" rx="9" ry="6" fill="#FF9DB0" />
        </>
      )}
      {/* Schnabel mit dem roten Punkt der Silbermöwe */}
      {excited ? (
        <>
          <path d="M82 88 Q96 80 110 88 L96 94 Z" fill={beak} stroke={ink} strokeWidth="4" strokeLinejoin="round" />
          <path d="M84 96 L96 94 L108 96 Q96 112 84 96 Z" fill={beak} stroke={ink} strokeWidth="4" strokeLinejoin="round" />
        </>
      ) : (
        <path d="M82 90 Q96 82 110 90 Q96 110 82 90 Z" fill={beak} stroke={ink} strokeWidth="4" strokeLinejoin="round" />
      )}
      {!quiet && <circle cx="99" cy={excited ? 101 : 97} r="3" fill="#FF4F4F" />}
      <OutfitLayer id={dress} />
      {/* Funkeln bei Begeisterung, Stern bei Nacht */}
      {excited && (
        <g stroke="#F5B000" strokeWidth="5" strokeLinecap="round" className="sparkle">
          <path d="M168 26 L168 42 M160 34 L176 34" />
          <path d="M180 56 L186 62" />
          <path d="M24 40 L30 46" />
        </g>
      )}
      {mood === 'night' && <path d="M172 20 l4 8 9 1.2 -6.6 6.2 1.6 9 -8-4.4 -8 4.4 1.6-9 -6.6-6.2 9-1.2z" fill="#FFD35A" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" className="sparkle" />}
    </svg>
  );
}

/** Lilli mit Sprechblase */
export function LilliSays({
  children,
  mood = 'happy',
  size = 52,
  variant = 'light',
}: {
  children: React.ReactNode;
  mood?: LilliMood;
  size?: number;
  variant?: 'light' | 'dark' | 'quiet';
}) {
  return (
    <div className={`lilli-says ${variant}`}>
      <Lilli size={size} mood={mood} />
      <div className="bubble" aria-live="polite">
        {children}
      </div>
    </div>
  );
}
