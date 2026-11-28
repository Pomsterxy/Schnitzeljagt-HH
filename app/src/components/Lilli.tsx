import { useId } from 'react';
import { OutfitLayer, useOutfit, type OutfitId } from './Outfits';
import { LILLI } from './lilli-colors';
export { LILLI };

/** Lilli, die Füchsin – Begleiterin durch die Tour (weiche Bilderbuch-Illustration, großer Kopf, Rucksack mit Schatzkarte) */
export type LilliMood = 'happy' | 'excited' | 'quiet' | 'night';

export function Lilli({ size = 56, mood = 'happy', label, outfit }: { size?: number; mood?: LilliMood; label?: string; outfit?: OutfitId }) {
  const worn = useOutfit();
  const quiet = mood === 'quiet';
  const excited = mood === 'excited';
  // an Gedenkorten ohne Kostüm und ohne Rucksack
  const dress = quiet ? 'none' : (outfit ?? worn);
  const ink = quiet ? LILLI.quietInk : LILLI.ink;
  const fur = quiet ? LILLI.quietFur : LILLI.fur;
  const furDeep = quiet ? LILLI.quietFurDeep : LILLI.furDeep;
  // eindeutige ID für den Farbverlauf (mehrere Lillis auf einer Seite)
  const grad = `lilli-fur-${useId().replace(/:/g, '')}`;
  const furFill = `url(#${grad})`;
  const sw = 3;
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
      <defs>
        <linearGradient id={grad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={fur} />
          <stop offset="1" stopColor={furDeep} />
        </linearGradient>
      </defs>
      {/* Bodenschatten */}
      <ellipse cx="100" cy="191" rx="52" ry="6" fill={LILLI.ink} opacity="0.12" />
      {/* Schwanz */}
      <g className={quiet ? '' : 'wag'}>
        <path d="M128 176 C168 182 186 150 176 118 C170 100 154 98 150 112 C160 120 162 140 150 152 C140 162 128 160 124 168 Z" fill={furFill} stroke={ink} strokeWidth={sw} strokeLinejoin="round" />
        <path d="M176 118 C170 100 154 98 150 112 C156 116 160 124 161 132 C168 128 174 124 176 118 Z" fill={LILLI.cream} stroke={ink} strokeWidth={sw} strokeLinejoin="round" />
      </g>
      {/* Rucksack mit Schatzkarte */}
      {!quiet && (
        <>
          <rect x="56" y="118" width="88" height="56" rx="18" fill={LILLI.pack} stroke={ink} strokeWidth={sw} />
          <g transform="rotate(-18 62 112)">
            <rect x="50" y="92" width="16" height="40" rx="5" fill={LILLI.map} stroke={ink} strokeWidth="2.5" />
            <path d="M54 100 L62 108 M62 100 L54 108" stroke={LILLI.mapX} strokeWidth="2.5" strokeLinecap="round" />
          </g>
        </>
      )}
      {/* Körper mit heller Brust */}
      <path d="M64 176 C58 150 70 122 100 122 C130 122 142 150 136 176 Z" fill={furFill} stroke={ink} strokeWidth={sw} strokeLinejoin="round" />
      <path d="M82 176 C78 156 86 138 100 138 C114 138 122 156 118 176 Z" fill={LILLI.cream} />
      {/* Rucksack-Gurte */}
      {!quiet && (
        <>
          <path d="M78 126 C80 140 80 152 78 166" stroke={LILLI.pack} strokeWidth="8" fill="none" strokeLinecap="round" />
          <path d="M122 126 C120 140 120 152 122 166" stroke={LILLI.pack} strokeWidth="8" fill="none" strokeLinecap="round" />
          <circle cx="79" cy="148" r="3.5" fill={LILLI.buckle} stroke={ink} strokeWidth="1.5" />
          <circle cx="121" cy="148" r="3.5" fill={LILLI.buckle} stroke={ink} strokeWidth="1.5" />
        </>
      )}
      {/* Pfoten */}
      <ellipse cx="82" cy="178" rx="14" ry="8" fill={LILLI.paw} />
      <ellipse cx="118" cy="178" rx="14" ry="8" fill={LILLI.paw} />
      <ellipse cx="70" cy="158" rx="8" ry="12" fill={LILLI.paw} transform="rotate(12 70 158)" />
      {excited ? (
        <g className="flap fast">
          <path d="M128 138 C140 128 146 116 150 102" stroke={ink} strokeWidth="16" fill="none" strokeLinecap="round" />
          <path d="M128 138 C140 128 146 116 150 102" stroke={fur} strokeWidth="11" fill="none" strokeLinecap="round" />
          <circle cx="151" cy="98" r="9" fill={LILLI.paw} />
        </g>
      ) : (
        <ellipse cx="130" cy="158" rx="8" ry="12" fill={LILLI.paw} transform="rotate(-12 130 158)" />
      )}
      {/* Ohren */}
      <path d="M58 58 L52 14 C66 16 82 30 88 44 Z" fill={furFill} stroke={ink} strokeWidth={sw} strokeLinejoin="round" />
      <path d="M62 50 L58 22 C68 26 76 34 80 42 Z" fill={LILLI.earInner} />
      <path d="M52 14 C56 15 60 17 63 19 L58 28 Z" fill={LILLI.paw} />
      <path d="M142 58 L148 14 C134 16 118 30 112 44 Z" fill={furFill} stroke={ink} strokeWidth={sw} strokeLinejoin="round" />
      <path d="M138 50 L142 22 C132 26 124 34 120 42 Z" fill={LILLI.earInner} />
      <path d="M148 14 C144 15 140 17 137 19 L142 28 Z" fill={LILLI.paw} />
      {/* Kopf mit Wangenfell */}
      <path
        d="M100 30 C136 30 154 54 152 80 C162 88 158 100 146 102 C138 116 122 124 100 124 C78 124 62 116 54 102 C42 100 38 88 48 80 C46 54 64 30 100 30 Z"
        fill={furFill}
        stroke={ink}
        strokeWidth={sw}
        strokeLinejoin="round"
      />
      {/* helle Gesichtsmaske */}
      <path d="M50 88 C60 84 76 84 86 90 C92 80 96 74 100 74 C104 74 108 80 114 90 C124 84 140 84 150 88 C146 104 132 122 100 122 C68 122 54 104 50 88 Z" fill={LILLI.cream} />
      <path d="M92 40 Q100 34 108 40 Q100 46 92 40 Z" fill={LILLI.furShade} opacity={quiet ? 0.25 : 0.5} />
      {/* Augen */}
      {quiet ? (
        <g stroke={ink} strokeWidth="4" strokeLinecap="round" fill="none">
          <path d="M71 80 Q80 87 89 80" />
          <path d="M111 80 Q120 87 129 80" />
        </g>
      ) : excited ? (
        <g stroke={LILLI.eye} strokeWidth="5" strokeLinecap="round" fill="none">
          <path d="M70 82 Q80 70 90 82" />
          <path d="M110 82 Q120 70 130 82" />
        </g>
      ) : (
        <>
          <ellipse cx="80" cy="78" rx="9" ry="10.5" fill={LILLI.eye} />
          <circle cx="83" cy="74" r="3.4" fill="#fff" />
          <ellipse cx="120" cy="78" rx="9" ry="10.5" fill={LILLI.eye} />
          <circle cx="123" cy="74" r="3.4" fill="#fff" />
        </>
      )}
      {/* Nase, Mund, Bäckchen */}
      <path d="M93 96 Q100 92 107 96 Q104 103 100 104 Q96 103 93 96 Z" fill={LILLI.nose} />
      {excited ? (
        <path d="M90 106 Q100 118 110 106 Q100 110 90 106 Z" fill={LILLI.mapX} stroke={ink} strokeWidth="2.4" strokeLinejoin="round" />
      ) : (
        <path d="M100 104 L100 108 M100 108 Q95 112 91 109 M100 108 Q105 112 109 109" stroke={ink} strokeWidth="2.4" fill="none" strokeLinecap="round" />
      )}
      {!quiet && (
        <>
          <ellipse cx="68" cy="98" rx="8" ry="5" fill={LILLI.cheek} opacity="0.8" />
          <ellipse cx="132" cy="98" rx="8" ry="5" fill={LILLI.cheek} opacity="0.8" />
        </>
      )}
      <g transform="translate(4 5)">
        <OutfitLayer id={dress} />
      </g>
      {/* Funkeln bei Begeisterung, Stern bei Nacht */}
      {excited && (
        <g stroke={LILLI.sparkle} strokeWidth="5" strokeLinecap="round" className="sparkle">
          <path d="M172 62 L172 78 M164 70 L180 70" />
          <path d="M184 92 L190 98" />
          <path d="M22 40 L28 46" />
        </g>
      )}
      {mood === 'night' && (
        <path d="M172 20 l4 8 9 1.2 -6.6 6.2 1.6 9 -8-4.4 -8 4.4 1.6-9 -6.6-6.2 9-1.2z" fill={LILLI.sparkle} stroke={LILLI.ink} strokeWidth="2.5" strokeLinejoin="round" className="sparkle" />
      )}
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
