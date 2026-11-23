import { Lilli } from './Lilli';

/**
 * Gezeichnete Himmelsszene für den Startbildschirm:
 * warmer Sonnenhimmel, Wolken, Funkeln, Hamburger Silhouetten und Lilli,
 * nach unten in eine dunkle Fläche übergehend.
 */
export function SkyScene({ children }: { children?: React.ReactNode }) {
  return (
    <div className="sky-scene">
      <svg className="sky-svg" viewBox="0 0 390 330" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <defs>
          <linearGradient id="sky-g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FFB547" />
            <stop offset="0.55" stopColor="#FFC97A" />
            <stop offset="1" stopColor="#FFD9A8" />
          </linearGradient>
          <radialGradient id="sun-g" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#FFF3D6" />
            <stop offset="1" stopColor="#FFE3A3" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="390" height="330" fill="url(#sky-g)" />
        <circle cx="195" cy="160" r="150" fill="url(#sun-g)" className="sun-glow" />
        {/* Funkeln */}
        <g fill="#FFFFFF" className="twinkles">
          <path d="M62 52 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3z" />
          <circle cx="110" cy="96" r="3" />
          <path d="M318 70 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" />
          <circle cx="282" cy="40" r="2.5" />
          <circle cx="345" cy="120" r="2" />
        </g>
        {/* Wolken links */}
        <g className="cloud cloud-a">
          <path d="M-40 210 C-30 170 20 160 40 182 C52 150 104 150 116 184 C140 176 164 192 160 214 Z" fill="#FFE1E8" />
          <path d="M-40 226 C-20 196 30 196 48 214 C64 192 110 196 118 224 Z" fill="#FFFFFF" />
        </g>
        {/* Wolken rechts */}
        <g className="cloud cloud-b">
          <path d="M250 196 C258 166 300 160 316 180 C330 150 384 152 398 184 C420 180 440 196 434 218 L250 218 Z" fill="#FFE1E8" />
          <path d="M270 222 C282 198 320 196 334 212 C350 192 396 198 404 226 Z" fill="#FFFFFF" />
        </g>
        {/* Hamburger Silhouetten: Kräne, Turm, Häuser */}
        <g fill="#F4A79A" opacity="0.9">
          <path d="M20 262 V214 H24 V206 H72 V210 H28 V262 Z" />
          <path d="M44 210 L28 222" stroke="#F4A79A" strokeWidth="2" />
          <path d="M300 262 V196 L306 186 L312 196 V262 Z" />
          <rect x="316" y="226" width="26" height="36" rx="2" />
          <rect x="346" y="236" width="22" height="26" rx="2" />
          <path d="M60 262 V232 L74 220 L88 232 V262 Z" />
        </g>
        {/* Horizont-Welle (Elbe) in dunkel */}
        <path d="M0 262 C70 240 130 252 195 250 C260 248 320 236 390 254 V330 H0 Z" fill="#101B33" />
      </svg>
      <div className="sky-lilli">
        <Lilli size={196} mood="happy" label="Lilli, die Möwe" />
      </div>
      {children}
    </div>
  );
}
