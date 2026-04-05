/** Stadion nocą: reflektory, trybuny, murawa, piłka — strona główna / globalny loading */
export function HomeStadiumPreloader() {
  return (
    <svg
      className="awp-stadium-svg h-auto w-full max-w-full overflow-visible drop-shadow-lg"
      viewBox="0 0 400 240"
      role="img"
      aria-hidden
    >
      <defs>
        <linearGradient id="awp-st-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0c1929" />
          <stop offset="55%" stopColor="#1e3a4f" />
          <stop offset="100%" stopColor="#134e4a" />
        </linearGradient>
        <radialGradient id="awp-st-beam" cx="50%" cy="100%" r="70%">
          <stop offset="0%" stopColor="rgba(250, 250, 220, 0.55)" />
          <stop offset="45%" stopColor="rgba(250, 240, 180, 0.12)" />
          <stop offset="100%" stopColor="rgba(250, 240, 180, 0)" />
        </radialGradient>
        <linearGradient id="awp-st-pitch" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0f766e" />
          <stop offset="100%" stopColor="#065f46" />
        </linearGradient>
        <pattern id="awp-st-stripes" width="20" height="240" patternUnits="userSpaceOnUse">
          <rect width="10" height="240" fill="rgba(255,255,255,0.04)" />
          <rect x="10" width="10" height="240" fill="rgba(0,0,0,0.03)" />
        </pattern>
        <filter id="awp-st-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect width="400" height="240" rx="14" fill="url(#awp-st-sky)" />

      {/* Reflektory / maszty */}
      <g fill="rgba(15,23,42,0.85)">
        <rect x="48" y="28" width="6" height="44" rx="1" />
        <rect x="346" y="28" width="6" height="44" rx="1" />
        <rect x="118" y="22" width="5" height="38" rx="1" />
        <rect x="277" y="22" width="5" height="38" rx="1" />
      </g>
      <g className="awp-stadium__beams" opacity="0.95">
        <path d="M 51 28 L 20 118 L 82 118 Z" fill="url(#awp-st-beam)" className="awp-stadium__beam awp-stadium__beam--a" />
        <path d="M 349 28 L 318 118 L 380 118 Z" fill="url(#awp-st-beam)" className="awp-stadium__beam awp-stadium__beam--b" />
        <ellipse cx="120" cy="24" rx="28" ry="8" fill="rgba(254,252,232,0.75)" filter="url(#awp-st-glow)" className="awp-stadium__lamp" />
        <ellipse cx="280" cy="24" rx="28" ry="8" fill="rgba(254,252,232,0.75)" filter="url(#awp-st-glow)" className="awp-stadium__lamp awp-stadium__lamp--delay" />
      </g>

      {/* Trybuny — tłum z detalami */}
      <g className="awp-stadium__crowd-row awp-stadium__crowd-row--1" transform="translate(0, 72)">
        {Array.from({ length: 52 }).map((_, i) => {
          const x = 14 + i * 7.2;
          const h = 4 + (i % 5);
          const colors = ["#1e293b", "#334155", "#0f172a", "#475569", "#164e63"];
          return (
            <rect
              key={i}
              x={x}
              y={22 - h}
              width="5.5"
              height={h}
              rx="0.8"
              fill={colors[i % colors.length]}
              opacity={0.85 + (i % 3) * 0.05}
            />
          );
        })}
      </g>
      <g className="awp-stadium__crowd-row awp-stadium__crowd-row--2" transform="translate(0, 78)">
        {Array.from({ length: 48 }).map((_, i) => {
          const x = 18 + i * 7.6;
          const colors = ["#0c4a6e", "#155e75", "#1e3a8a", "#312e81"];
          return (
            <circle key={i} cx={x + 2.5} cy="14" r="2.8" fill={colors[i % colors.length]} opacity="0.9" />
          );
        })}
      </g>
      <path
        d="M 12 96 Q 200 88 388 96"
        fill="none"
        stroke="rgba(15,23,42,0.45)"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* Boisko */}
      <g transform="translate(20, 102)">
        <rect width="360" height="118" rx="10" fill="url(#awp-st-pitch)" />
        <rect width="360" height="118" rx="10" fill="url(#awp-st-stripes)" opacity="0.85" />
        <rect
          x="8"
          y="8"
          width="344"
          height="102"
          rx="6"
          fill="none"
          stroke="rgba(255,255,255,0.35)"
          strokeWidth="1.5"
        />
        <line x1="180" y1="8" x2="180" y2="110" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
        <circle cx="180" cy="59" r="22" fill="none" stroke="rgba(255,255,255,0.32)" strokeWidth="1.4" />
        <circle cx="180" cy="59" r="2.2" fill="rgba(255,255,255,0.5)" />
        <path d="M 8 36 H 52 Q 62 59 52 82 H 8" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="1.2" />
        <path d="M 352 36 H 308 Q 298 59 308 82 H 352" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="1.2" />
        <rect x="8" y="40" width="12" height="38" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="1" />
        <rect x="340" y="40" width="12" height="38" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="1" />
        {/* Chorągiewki narożne */}
        <g stroke="rgba(255,255,255,0.5)" strokeWidth="1">
          <line x1="14" y1="8" x2="14" y2="-10" />
          <polygon points="14,-10 26,-6 14,-2" fill="#fbbf24" className="awp-stadium__flag" />
          <line x1="346" y1="8" x2="346" y2="-10" />
          <polygon points="346,-10 334,-6 346,-2" fill="#f87171" className="awp-stadium__flag awp-stadium__flag--b" />
        </g>
      </g>

      {/* Piłka + cień */}
      <ellipse cx="198" cy="214" rx="14" ry="4" fill="rgba(0,0,0,0.25)" className="awp-stadium__ball-shadow" />
      <g className="awp-stadium__ball">
        <circle cx="186" cy="168" r="9" fill="#fafafa" stroke="#0f172a" strokeWidth="1.3" />
        <path d="M 182 166 A 5 5 0 0 1 190 166" fill="none" stroke="rgba(15,23,42,0.2)" strokeWidth="0.9" />
        <polygon points="186,162 189,168 183,168" fill="rgba(15,23,42,0.08)" />
      </g>

      <text
        x="200"
        y="232"
        textAnchor="middle"
        fill="rgba(209,250,229,0.75)"
        style={{ fontSize: "7px", fontWeight: 600, letterSpacing: "0.18em" }}
      >
        AKADEMIA WIELKICH PIŁKARZY
      </text>
    </svg>
  );
}
