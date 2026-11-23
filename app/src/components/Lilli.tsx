/** Lilli, die Möwe – Begleiterin durch die Tour */
export type LilliMood = 'happy' | 'excited' | 'quiet' | 'night';

export function Lilli({ size = 56, mood = 'happy', label }: { size?: number; mood?: LilliMood; label?: string }) {
  const quiet = mood === 'quiet';
  const body = quiet ? '#F7F6F3' : '#FFFFFF';
  const wing = quiet ? '#B7BEC3' : '#A7B1BA';
  return (
    <svg
      className={quiet ? 'lilli lilli-quiet' : 'lilli bob'}
      width={size}
      height={(size * 104) / 120}
      viewBox="0 0 120 104"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <path d="M30 60 L8 50 L14 70 Z" fill={quiet ? '#9AA2A9' : '#8E99A3'} />
      <ellipse cx="58" cy="62" rx="33" ry="23" fill={body} />
      <path d="M30 66 Q58 92 90 66 Q60 80 30 66 Z" fill="#E6EAEE" />
      <g className={mood === 'excited' ? 'flap fast' : quiet ? '' : 'flap'}>
        <path d={quiet ? 'M34 60 Q58 46 84 60 Q62 74 34 66 Z' : 'M34 58 Q58 36 84 58 Q62 76 34 66 Z'} fill={wing} />
        {!quiet && <path d="M34 58 Q41 53 47 56 L39 66 Z" fill="#3A4249" />}
      </g>
      <circle cx="88" cy={quiet ? 42 : 40} r="17" fill={body} />
      {!quiet && (
        <>
          <path d="M72 32 Q88 15 104 32 Z" fill={mood === 'night' ? '#F97316' : '#0F1A24'} />
          {mood !== 'night' && <rect x="71" y="30" width="34" height="5" rx="2.5" fill="#F97316" />}
        </>
      )}
      <path d={quiet ? 'M104 44 L116 47 L104 50 Z' : 'M104 40 L118 44 L104 48 Z'} fill={quiet ? '#D9C49A' : '#FFB020'} />
      {!quiet && <circle cx="111" cy="46" r="1.8" fill="#E5484D" />}
      {quiet ? (
        <path d="M90 41 q4 3 8 0" fill="none" stroke="#2B3036" strokeWidth="3" strokeLinecap="round" />
      ) : (
        <>
          <circle cx="94" cy="39" r="3.2" fill="#1C1C1E" />
          <circle cx="95" cy="38" r="1" fill="#FFFFFF" />
        </>
      )}
      {!quiet && <path d="M52 84 L50 98 M66 84 L68 98" stroke="#FF9F43" strokeWidth="3.5" strokeLinecap="round" />}
    </svg>
  );
}

/** Lilli mit Sprechblase */
export function LilliSays({
  children,
  mood = 'happy',
  size = 48,
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
