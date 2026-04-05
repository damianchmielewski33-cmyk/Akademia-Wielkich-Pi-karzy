/** Kalendarz, gwizdek, zegar — terminarz */
export function TerminarzCalendarPreloader() {
  return (
    <svg
      className="awp-calendar-svg h-auto w-full max-w-full overflow-visible drop-shadow-md"
      viewBox="0 0 360 220"
      role="img"
      aria-hidden
    >
      <defs>
        <linearGradient id="awp-cal-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ecfdf5" />
          <stop offset="100%" stopColor="#d1fae5" />
        </linearGradient>
        <linearGradient id="awp-cal-page" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#f0fdf4" />
        </linearGradient>
      </defs>

      <rect width="360" height="220" rx="16" fill="url(#awp-cal-wall)" />
      <rect x="16" y="16" width="328" height="188" rx="12" fill="rgba(255,255,255,0.5)" stroke="rgba(6,95,70,0.15)" />

      {/* Kalendarz */}
      <g transform="translate(42, 38)">
        <rect x="0" y="8" width="168" height="152" rx="8" fill="#047857" opacity="0.12" />
        <rect x="4" y="12" width="160" height="144" rx="6" fill="url(#awp-cal-page)" stroke="rgba(5,80,60,0.25)" strokeWidth="1.2" />
        {/* Spiralne ringi */}
        {[0, 1, 2].map((i) => (
          <g key={i} transform={`translate(${28 + i * 52}, 0)`}>
            <circle cx="0" cy="8" r="5" fill="none" stroke="#64748b" strokeWidth="2" />
            <rect x="-1" y="8" width="2" height="10" fill="#64748b" />
          </g>
        ))}
        <rect x="12" y="26" width="136" height="28" rx="4" fill="#059669" opacity="0.9" />
        <text x="80" y="45" textAnchor="middle" fill="white" style={{ fontSize: "13px", fontWeight: 700 }}>
          MECZ
        </text>
        {/* Siatka dni */}
        <g fill="none" stroke="rgba(5,80,60,0.12)" strokeWidth="0.8">
          <line x1="12" y1="62" x2="148" y2="62" />
          <line x1="12" y1="86" x2="148" y2="86" />
          <line x1="12" y1="110" x2="148" y2="110" />
          <line x1="52" y1="58" x2="52" y2="138" />
          <line x1="92" y1="58" x2="92" y2="138" />
          <line x1="132" y1="58" x2="132" y2="138" />
        </g>
        <g fill="#0f766e" style={{ fontSize: "10px", fontWeight: 600 }} opacity="0.55">
          <text x="32" y="78" textAnchor="middle">
            1
          </text>
          <text x="72" y="78" textAnchor="middle">
            2
          </text>
          <text x="112" y="78" textAnchor="middle">
            3
          </text>
          <text x="32" y="102" textAnchor="middle">
            4
          </text>
          <text x="72" y="102" textAnchor="middle">
            5
          </text>
          <text x="112" y="102" textAnchor="middle">
            6
          </text>
        </g>
        {/* Karta meczu — lekki ruch */}
        <g className="awp-cal__flip" transform="translate(80, 92)">
          <rect x="-36" y="-18" width="72" height="52" rx="6" fill="#10b981" opacity="0.92" stroke="rgba(255,255,255,0.4)" />
          <text x="0" y="8" textAnchor="middle" fill="white" style={{ fontSize: "11px", fontWeight: 700 }}>
            vs
          </text>
          <circle cx="-18" cy="-6" r="4" fill="rgba(255,255,255,0.35)" />
          <circle cx="18" cy="-6" r="4" fill="rgba(255,255,255,0.35)" />
        </g>
      </g>

      {/* Zegar analogowy */}
      <g transform="translate(268, 118)">
        <circle r="46" fill="#fff" stroke="rgba(5,80,60,0.2)" strokeWidth="2" />
        <circle r="42" fill="none" stroke="rgba(5,80,60,0.08)" strokeWidth="1" />
        {[0, 30, 60, 90, 120, 150].map((deg) => (
          <line
            key={deg}
            x1="0"
            y1="-38"
            x2="0"
            y2="-32"
            stroke="#065f46"
            strokeWidth="1.5"
            strokeLinecap="round"
            transform={`rotate(${deg})`}
          />
        ))}
        <g className="awp-cal__hand-min">
          <line x1="0" y1="0" x2="0" y2="-22" stroke="#047857" strokeWidth="2.5" strokeLinecap="round" />
        </g>
        <g className="awp-cal__hand-hour">
          <line x1="0" y1="0" x2="16" y2="-6" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
        </g>
        <circle r="3.5" fill="#047857" />
      </g>

      {/* Gwizdek */}
      <g transform="translate(258, 52)" className="awp-cal__whistle">
        <ellipse cx="0" cy="0" rx="22" ry="14" fill="#1e293b" />
        <ellipse cx="-6" cy="0" rx="8" ry="10" fill="#334155" />
        <rect x="18" y="-3" width="28" height="6" rx="2" fill="#ca8a04" />
        <path d="M 46 0 Q 54 -8 58 0 Q 54 8 46 0" fill="none" stroke="#92400e" strokeWidth="1.5" />
        <path
          d="M -4 12 Q 8 28 20 38"
          fill="none"
          stroke="#64748b"
          strokeWidth="1.2"
          strokeDasharray="3 2"
          className="awp-cal__cord"
        />
      </g>

      <text x="180" y="206" textAnchor="middle" fill="rgba(6,78,59,0.55)" style={{ fontSize: "10px", fontWeight: 600 }}>
        Sprawdzamy terminy i boiska…
      </text>
    </svg>
  );
}
