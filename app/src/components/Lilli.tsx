import { useId } from 'react';

/** Lilli, die Möwe – Begleiterin durch die Tour (im Glanz-Stil des App-Symbols) */
export type LilliMood = 'happy' | 'excited' | 'quiet' | 'night';

const PALETTE = {
  happy: { cap1: '#2B4C73', cap2: '#0F1A24', band: '#FF7A1A', beak1: '#FFD35A', beak2: '#F59E0B', wing1: '#CBD4DC', wing2: '#8C99A5', cheek: '#FF8FA3' },
  excited: { cap1: '#2B4C73', cap2: '#0F1A24', band: '#FF7A1A', beak1: '#FFD35A', beak2: '#F59E0B', wing1: '#CBD4DC', wing2: '#8C99A5', cheek: '#FF7D94' },
  night: { cap1: '#2B4C73', cap2: '#0F1A24', band: '#FFB020', beak1: '#FFD35A', beak2: '#F59E0B', wing1: '#C3CCD6', wing2: '#7F8C99', cheek: '#FF8FA3' },
  quiet: { cap1: '#6B737B', cap2: '#4A5158', band: '#B7BEC3', beak1: '#E6D5AE', beak2: '#CDB98C', wing1: '#C9CFD4', wing2: '#9AA2A9', cheek: 'transparent' },
};

export function Lilli({ size = 56, mood = 'happy', label }: { size?: number; mood?: LilliMood; label?: string }) {
  const uid = useId().replace(/:/g, '');
  const id = (n: string) => `${n}-${uid}`;
  const c = PALETTE[mood];
  const quiet = mood === 'quiet';
  const excited = mood === 'excited';
  return (
    <svg
      className={`lilli${quiet ? ' lilli-quiet' : ' bob'}`}
      width={size}
      height={(size * 140) / 160}
      viewBox="0 0 160 140"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <defs>
        <linearGradient id={id('body')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor={quiet ? '#E2E5E8' : '#DCE4EB'} />
        </linearGradient>
        <linearGradient id={id('wing')} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor={c.wing1} />
          <stop offset="1" stopColor={c.wing2} />
        </linearGradient>
        <linearGradient id={id('beak')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c.beak1} />
          <stop offset="1" stopColor={c.beak2} />
        </linearGradient>
        <linearGradient id={id('cap')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c.cap1} />
          <stop offset="1" stopColor={c.cap2} />
        </linearGradient>
        <radialGradient id={id('eye')} cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#3A4A5C" />
          <stop offset="1" stopColor="#0E1720" />
        </radialGradient>
      </defs>

      {/* Bodenschatten */}
      <ellipse cx="74" cy="133" rx="36" ry="5" fill="#000" opacity="0.10" />

      {/* Beine */}
      <g stroke="#FF9F43" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M64 108 L62 126 M56 128 L62 126 L68 128" />
        <path d="M82 110 L84 127 M78 129 L84 127 L90 129" />
      </g>

      {/* Schwanz */}
      <path d="M34 80 L8 68 Q12 82 9 96 Z" fill={`url(#${id('wing')})`} />
      <path d="M8 68 L17 72 L14 92 L9 96 Q12 82 8 68 Z" fill="#2B3238" opacity={quiet ? 0.5 : 0.9} />

      {/* Körper */}
      <ellipse cx="70" cy="86" rx="44" ry="31" fill={`url(#${id('body')})`} stroke="#1E3442" strokeOpacity="0.12" strokeWidth="2" />
      <ellipse cx="98" cy="68" rx="22" ry="20" fill={`url(#${id('body')})`} />
      <ellipse cx="76" cy="98" rx="27" ry="13" fill="#FFFFFF" opacity="0.75" />

      {/* Flügel */}
      <g className={excited ? 'flap fast' : quiet ? '' : 'flap'}>
        <g transform={excited ? 'rotate(32 92 78)' : undefined}>
          <path d="M38 78 Q66 52 98 76 Q84 104 46 99 Q35 90 38 78 Z" fill={`url(#${id('wing')})`} stroke="#1E3442" strokeOpacity="0.1" strokeWidth="1.5" />
          <path d="M38 78 Q45 73 54 75 Q46 90 46 99 Q35 90 38 78 Z" fill="#2B3238" opacity={quiet ? 0.5 : 1} />
          <path d="M58 84 Q70 78 84 82 M56 92 Q68 87 80 90" stroke="#FFFFFF" strokeOpacity="0.45" strokeWidth="2" fill="none" strokeLinecap="round" />
        </g>
      </g>

      {/* Glanz auf dem Rücken */}
      <ellipse cx="56" cy="64" rx="14" ry="5" fill="#FFFFFF" opacity="0.8" transform="rotate(-12 56 64)" />

      {/* Kopf */}
      <circle cx="108" cy={quiet ? 52 : 48} r="29" fill={`url(#${id('body')})`} stroke="#1E3442" strokeOpacity="0.12" strokeWidth="2" />

      {/* Schnabel */}
      <g transform={quiet ? 'translate(0 5)' : undefined}>
        <path d="M131 48 Q150 49 159 56 Q150 64 131 63 Z" fill={`url(#${id('beak')})`} />
        <path d="M133 56 Q147 57 157 56.5" stroke="#B45309" strokeOpacity="0.55" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        {!quiet && <circle cx="149" cy="60" r="2.6" fill="#E5484D" />}
        <ellipse cx="141" cy="51" rx="6" ry="1.8" fill="#FFFFFF" opacity="0.65" />
      </g>

      {/* Bäckchen */}
      <ellipse cx="117" cy={quiet ? 66 : 62} rx="8" ry="5" fill={c.cheek} opacity="0.55" />

      {/* Auge */}
      {quiet ? (
        <path d="M110 50 Q116 55 122 50" stroke="#2B3036" strokeWidth="3.2" fill="none" strokeLinecap="round" />
      ) : (
        <>
          <ellipse cx="116" cy="46" rx={excited ? 7.5 : 6.5} ry={excited ? 8.5 : 7.5} fill={`url(#${id('eye')})`} />
          <circle cx="118.5" cy="42.5" r={excited ? 2.8 : 2.4} fill="#FFFFFF" />
          <circle cx="113.5" cy="49.5" r="1.2" fill="#FFFFFF" opacity="0.9" />
          {mood === 'happy' && <path d="M108 37 Q116 33 124 37" stroke="#0F1A24" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.35" />}
        </>
      )}

      {/* Elbsegler-Mütze */}
      <g transform={quiet ? 'translate(0 4)' : undefined}>
        <path d="M82 34 Q106 2 134 30 Q108 26 82 34 Z" fill={`url(#${id('cap')})`} />
        <path d="M81 34 Q108 25 135 30 L136 37 Q108 31 80 41 Z" fill={c.band} />
        <path d="M121 33 Q138 30 146 37 Q135 40 122 39 Z" fill={c.cap2} />
        <ellipse cx="100" cy="17" rx="9" ry="4" fill="#FFFFFF" opacity="0.35" transform="rotate(-24 100 17)" />
      </g>

      {/* Funkeln bei Begeisterung, Stern bei Nacht */}
      {excited && (
        <g stroke="#F5B000" strokeWidth="3" strokeLinecap="round" className="sparkle">
          <path d="M146 18 L146 28 M141 23 L151 23" />
          <path d="M154 38 L158 42" />
          <path d="M136 10 L139 14" />
        </g>
      )}
      {mood === 'night' && <path d="M150 14 l2.4 5 5.4.7 -4 3.7 1 5.4 -4.8 -2.6 -4.8 2.6 1 -5.4 -4 -3.7 5.4 -.7z" fill="#FFD35A" className="sparkle" />}
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
