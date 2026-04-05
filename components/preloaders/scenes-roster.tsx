/** Szatnia: koszulki na wieszakach — lista piłkarzy */
export function PilkarzeLockerPreloader() {
  return (
    <svg
      className="awp-locker-svg h-auto w-full max-w-full overflow-visible drop-shadow-md"
      viewBox="0 0 380 220"
      role="img"
      aria-hidden
    >
      <defs>
        <linearGradient id="awp-lk-metal" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#94a3b8" />
          <stop offset="50%" stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#64748b" />
        </linearGradient>
        <linearGradient id="awp-lk-j1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
        <linearGradient id="awp-lk-j2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6ee7b7" />
          <stop offset="100%" stopColor="#065f46" />
        </linearGradient>
        <linearGradient id="awp-lk-j3" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a7f3d0" />
          <stop offset="100%" stopColor="#0d9488" />
        </linearGradient>
      </defs>

      <rect width="380" height="220" rx="14" fill="#1e293b" />
      <rect x="10" y="10" width="360" height="200" rx="10" fill="#0f172a" stroke="rgba(148,163,184,0.2)" />

      {/* Szafki w tle */}
      <g opacity="0.35">
        {Array.from({ length: 8 }).map((_, i) => (
          <g key={i} transform={`translate(${22 + i * 42}, 24)`}>
            <rect width="36" height="168" rx="3" fill="#1e293b" stroke="#334155" strokeWidth="1" />
            <line x1="6" y1="40" x2="30" y2="40" stroke="#334155" strokeWidth="0.8" />
            <line x1="6" y1="72" x2="30" y2="72" stroke="#334155" strokeWidth="0.8" />
            <rect x="10" y="86" width="16" height="5" rx="1" fill="#475569" />
          </g>
        ))}
      </g>

      {/* Ławka */}
      <rect x="24" y="168" width="332" height="14" rx="3" fill="url(#awp-lk-metal)" opacity="0.9" />
      <rect x="20" y="178" width="340" height="8" rx="2" fill="#334155" />

      {/* Buty */}
      <g transform="translate(52, 182)">
        <ellipse cx="8" cy="6" rx="10" ry="6" fill="#0f172a" />
        <ellipse cx="26" cy="6" rx="10" ry="6" fill="#1e293b" />
        <path d="M 2 6 Q 8 0 14 6" fill="none" stroke="#64748b" strokeWidth="1" />
      </g>

      {/* 3 koszulki */}
      {[
        { x: 88, grad: "url(#awp-lk-j1)", num: "10", delay: "0s" },
        { x: 168, grad: "url(#awp-lk-j2)", num: "7", delay: "0.25s" },
        { x: 248, grad: "url(#awp-lk-j3)", num: "9", delay: "0.5s" },
      ].map((j) => (
        <g key={j.x} transform={`translate(${j.x}, 42)`} className="awp-locker__jersey" style={{ animationDelay: j.delay }}>
          <path d="M -28 -8 Q 0 -18 28 -8 L 32 12 L 28 88 L -28 88 L -32 12 Z" fill={j.grad} stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
          <path d="M -12 -6 L 0 8 L 12 -6" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2" strokeLinejoin="round" />
          <rect x="-22" y="22" width="44" height="3" rx="1" fill="rgba(255,255,255,0.2)" />
          <rect x="-18" y="30" width="36" height="2" rx="1" fill="rgba(0,0,0,0.12)" />
          <text x="0" y="72" textAnchor="middle" fill="rgba(255,255,255,0.9)" style={{ fontSize: "22px", fontWeight: 800 }}>
            {j.num}
          </text>
          {/* Wieszak */}
          <path d="M -20 -8 Q 0 -22 20 -8" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" />
          <circle cy="-20" r="3" fill="#cbd5e1" />
        </g>
      ))}

      <text x="190" y="208" textAnchor="middle" fill="rgba(148,163,184,0.85)" style={{ fontSize: "10px", fontWeight: 600 }}>
        Ładujemy kartę zawodników…
      </text>
    </svg>
  );
}

/** Tablica taktyczna — składy meczowe */
export function SkladyTacticsPreloader() {
  return (
    <svg
      className="awp-tactics-svg h-auto w-full max-w-full overflow-visible drop-shadow-lg"
      viewBox="0 0 400 230"
      role="img"
      aria-hidden
    >
      <defs>
        <linearGradient id="awp-tk-board" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ecfdf5" />
          <stop offset="100%" stopColor="#d1fae5" />
        </linearGradient>
        <linearGradient id="awp-tk-pitch" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
      </defs>

      <rect width="400" height="230" rx="14" fill="#78716c" />
      <rect x="12" y="12" width="376" height="206" rx="10" fill="url(#awp-tk-board)" stroke="rgba(6,78,59,0.2)" />

      {/* Spinacz + clipboard */}
      <g transform="translate(318, 28)">
        <rect x="0" y="0" width="58" height="74" rx="4" fill="#fff" stroke="rgba(100,100,100,0.25)" />
        <rect x="-4" y="-6" width="66" height="10" rx="2" fill="#a8a29e" />
        <rect x="18" y="-10" width="22" height="14" rx="2" fill="#d6d3d1" stroke="#a8a29e" />
        <g stroke="rgba(5,80,60,0.35)" strokeWidth="1" fill="none">
          <path d="M 10 18 H 48 M 10 28 H 42 M 10 38 H 46" />
          <circle cx="18" cy="52" r="5" fill="#0ea5e9" stroke="none" opacity="0.5" className="awp-tactics__dot" />
          <circle cx="38" cy="58" r="5" fill="#f97316" stroke="none" opacity="0.5" className="awp-tactics__dot" style={{ animationDelay: "0.2s" }} />
          <path d="M 18 52 Q 28 40 38 58" stroke="#059669" strokeDasharray="3 2" className="awp-tactics__arrow" />
        </g>
      </g>

      {/* Boisko z góry */}
      <g transform="translate(24, 36)">
        <rect width="270" height="170" rx="8" fill="url(#awp-tk-pitch)" />
        <rect x="6" y="6" width="258" height="158" rx="5" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.2" />
        <line x1="135" y1="6" x2="135" y2="164" stroke="rgba(255,255,255,0.35)" strokeWidth="1.2" />
        <circle cx="135" cy="85" r="24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.1" />
        <circle cx="135" cy="85" r="2.5" fill="rgba(255,255,255,0.5)" />
        <rect x="6" y="58" width="36" height="54" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
        <rect x="228" y="58" width="36" height="54" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
        <path d="M 6 72 H 20 M 6 98 H 20" stroke="rgba(255,255,255,0.2)" strokeWidth="0.8" />
        <path d="M 250 72 H 264 M 250 98 H 264" stroke="rgba(255,255,255,0.2)" strokeWidth="0.8" />

        {/* Pozycje gospodarze (niebieskie) */}
        {[
          [42, 85],
          [72, 42],
          [72, 128],
          [102, 64],
          [102, 106],
          [115, 85],
        ].map(([x, y], i) => (
          <circle
            key={`h-${i}`}
            cx={x}
            cy={y}
            r="7"
            fill="#0ea5e9"
            stroke="rgba(255,255,255,0.5)"
            strokeWidth="1"
            className="awp-tactics__marker"
            style={{ animationDelay: `${i * 0.08}s` }}
          />
        ))}
        {/* Goście (pomarańcz) */}
        {[
          [228, 85],
          [198, 42],
          [198, 128],
          [168, 64],
          [168, 106],
          [155, 85],
        ].map(([x, y], i) => (
          <circle
            key={`a-${i}`}
            cx={x}
            cy={y}
            r="7"
            fill="#f97316"
            stroke="rgba(255,255,255,0.5)"
            strokeWidth="1"
            className="awp-tactics__marker awp-tactics__marker--away"
            style={{ animationDelay: `${0.35 + i * 0.08}s` }}
          />
        ))}
      </g>

      <text x="200" y="218" textAnchor="middle" fill="rgba(6,78,59,0.55)" style={{ fontSize: "10px", fontWeight: 600 }}>
        Ustawiamy formacje i ławki…
      </text>
    </svg>
  );
}
