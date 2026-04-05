/** Wykres słupkowy — statystyki */
export function StatystykiBarsPreloader() {
  const bars = [
    { x: 48, h: 72, label: "G", delay: "0s", fill: "#059669" },
    { x: 108, h: 98, label: "A", delay: "0.12s", fill: "#10b981" },
    { x: 168, h: 56, label: "km", delay: "0.24s", fill: "#0d9488" },
    { x: 228, h: 44, label: "O", delay: "0.36s", fill: "#14b8a6" },
  ];
  return (
    <svg
      className="awp-statbars-svg h-auto w-full max-w-full overflow-visible drop-shadow-md"
      viewBox="0 0 320 220"
      role="img"
      aria-hidden
    >
      <defs>
        <linearGradient id="awp-sb-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f0fdf4" />
          <stop offset="100%" stopColor="#ecfdf5" />
        </linearGradient>
      </defs>
      <rect width="320" height="220" rx="14" fill="url(#awp-sb-bg)" />
      <rect x="16" y="16" width="288" height="188" rx="10" fill="#fff" stroke="rgba(6,95,70,0.12)" />

      <text x="160" y="42" textAnchor="middle" fill="#065f46" style={{ fontSize: "13px", fontWeight: 700 }}>
        Twoje liczby z boiska
      </text>

      <g transform="translate(32, 58)">
        {/* Oś i siatka */}
        <line x1="0" y1="120" x2="248" y2="120" stroke="rgba(6,78,59,0.35)" strokeWidth="1.5" />
        <line x1="0" y1="120" x2="0" y2="8" stroke="rgba(6,78,59,0.35)" strokeWidth="1.5" />
        {[0, 1, 2, 3].map((i) => (
          <line
            key={i}
            x1="0"
            y1={32 + i * 28}
            x2="248"
            y2={32 + i * 28}
            stroke="rgba(6,78,59,0.08)"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
        ))}
        {/* Słupki */}
        {bars.map((b) => (
          <g key={b.x}>
            <rect
              x={b.x}
              y={120 - b.h}
              width="36"
              height={b.h}
              rx="4"
              fill={b.fill}
              opacity="0.92"
              className="awp-statbars__bar"
              style={{ animationDelay: b.delay }}
            />
            <text x={b.x + 18} y="138" textAnchor="middle" fill="#64748b" style={{ fontSize: "9px", fontWeight: 600 }}>
              {b.label}
            </text>
          </g>
        ))}
        <circle cx="220" cy="24" r="10" fill="#fafafa" stroke="#0f172a" strokeWidth="1.2" className="awp-statbars__mini-ball" />
      </g>

      <text x="160" y="200" textAnchor="middle" fill="rgba(6,78,59,0.5)" style={{ fontSize: "10px", fontWeight: 600 }}>
        Zbieramy gole, asysty i kilometry…
      </text>
    </svg>
  );
}

/** Podium — rankingi */
export function RankingPodiumPreloader() {
  return (
    <svg
      className="awp-podium-svg h-auto w-full max-w-full overflow-visible drop-shadow-lg"
      viewBox="0 0 360 230"
      role="img"
      aria-hidden
    >
      <defs>
        <linearGradient id="awp-pd-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <linearGradient id="awp-pd-silver" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f1f5f9" />
          <stop offset="100%" stopColor="#94a3b8" />
        </linearGradient>
        <linearGradient id="awp-pd-bronze" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fdba74" />
          <stop offset="100%" stopColor="#c2410c" />
        </linearGradient>
      </defs>

      <rect width="360" height="230" rx="14" fill="#0f172a" />
      <g opacity="0.15" fill="#fff">
        {Array.from({ length: 40 }).map((_, i) => (
          <circle key={i} cx={(i * 37) % 360} cy={(i * 23) % 200} r="1.2" />
        ))}
      </g>

      <text x="180" y="36" textAnchor="middle" fill="#a7f3d0" style={{ fontSize: "13px", fontWeight: 700 }}>
        Kto dziś rządzi tabelą?
      </text>

      {/* Podium */}
      <g transform="translate(180, 178)">
        {/* 2 miejsce */}
        <g transform="translate(-92, 0)">
          <rect x="-38" y="-52" width="76" height="52" rx="4" fill="url(#awp-pd-silver)" stroke="rgba(255,255,255,0.35)" />
          <text x="0" y="-22" textAnchor="middle" fill="#0f172a" style={{ fontSize: "20px", fontWeight: 800 }}>
            2
          </text>
          <circle cx="0" cy="-72" r="14" fill="#cbd5e1" stroke="#fff" strokeWidth="2" className="awp-podium__medal" />
        </g>
        {/* 1 miejsce */}
        <g className="awp-podium__first">
          <rect x="-44" y="-86" width="88" height="86" rx="6" fill="url(#awp-pd-gold)" stroke="rgba(255,255,255,0.45)" />
          <text x="0" y="-48" textAnchor="middle" fill="#422006" style={{ fontSize: "26px", fontWeight: 900 }}>
            1
          </text>
          <path d="M -18 -98 L 0 -118 L 18 -98 L 12 -88 L 0 -94 L -12 -88 Z" fill="#fef08a" stroke="#ca8a04" strokeWidth="1" />
          <circle cx="0" cy="-108" r="5" fill="#facc15" className="awp-podium__crown-jewel" />
        </g>
        {/* 3 miejsce */}
        <g transform="translate(92, 0)">
          <rect x="-38" y="-38" width="76" height="38" rx="4" fill="url(#awp-pd-bronze)" stroke="rgba(255,255,255,0.25)" />
          <text x="0" y="-12" textAnchor="middle" fill="#fff" style={{ fontSize: "18px", fontWeight: 800 }}>
            3
          </text>
          <circle cx="0" cy="-58" r="12" fill="#ea580c" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
        </g>
      </g>

      {/* Laurki */}
      <path
        d="M 52 168 Q 72 148 92 168 Q 72 188 52 168"
        fill="none"
        stroke="rgba(52,211,153,0.45)"
        strokeWidth="2"
        className="awp-podium__laurel"
      />
      <path
        d="M 308 168 Q 288 148 268 168 Q 288 188 308 168"
        fill="none"
        stroke="rgba(52,211,153,0.45)"
        strokeWidth="2"
        className="awp-podium__laurel awp-podium__laurel--r"
      />

      <text x="180" y="218" textAnchor="middle" fill="rgba(148,163,184,0.85)" style={{ fontSize: "10px", fontWeight: 600 }}>
        Porządkujemy kolejność punktów…
      </text>
    </svg>
  );
}

/** Odznaka / legitymacja — profil */
export function ProfilBadgePreloader() {
  return (
    <svg
      className="awp-badge-svg h-auto w-full max-w-full overflow-visible drop-shadow-md"
      viewBox="0 0 340 220"
      role="img"
      aria-hidden
    >
      <defs>
        <linearGradient id="awp-bd-card" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#ecfdf5" />
        </linearGradient>
        <linearGradient id="awp-bd-shield" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
      </defs>

      <rect width="340" height="220" rx="14" fill="#f1f5f9" />
      <g className="awp-badge__lanyard" transform="translate(170, 28)">
        <path d="M -100 -8 Q 0 48 100 -8" fill="none" stroke="#64748b" strokeWidth="8" strokeLinecap="round" />
        <path d="M -100 -8 Q 0 48 100 -8" fill="none" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
        <rect x="-14" y="-18" width="28" height="16" rx="3" fill="#475569" stroke="#334155" />
      </g>

      <g transform="translate(170, 118)">
        <rect x="-118" y="-78" width="236" height="156" rx="14" fill="url(#awp-bd-card)" stroke="rgba(6,95,70,0.2)" strokeWidth="2" />
        <rect x="-102" y="-62" width="204" height="124" rx="10" fill="rgba(240,253,244,0.6)" stroke="rgba(5,80,60,0.1)" />

        <path
          d="M -70 -40 L -40 -52 L 0 -58 L 40 -52 L 70 -40 L 70 20 Q 0 52 -70 20 Z"
          fill="url(#awp-bd-shield)"
          stroke="rgba(255,255,255,0.35)"
          strokeWidth="1.2"
          className="awp-badge__shield"
        />
        <circle cx="0" cy="-12" r="22" fill="#e2e8f0" stroke="rgba(255,255,255,0.6)" strokeWidth="2" />
        <path d="M -8 -18 L -8 -6 L 8 -6 L 8 -18 M -12 2 H 12" stroke="#64748b" strokeWidth="2" strokeLinecap="round" fill="none" />

        <g stroke="#059669" strokeWidth="1.2" fill="none" className="awp-badge__signature">
          <path d="M -85 38 Q -40 28 0 38 T 85 36" strokeDasharray="180" />
        </g>
        <text x="0" y="58" textAnchor="middle" fill="#065f46" style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.12em" }}>
          ZAWODNIK AKADEMII
        </text>
      </g>

      <text x="170" y="206" textAnchor="middle" fill="rgba(100,116,139,0.9)" style={{ fontSize: "10px", fontWeight: 600 }}>
        Otwieramy Twoją kartę…
      </text>
    </svg>
  );
}

/** Panel sterowania — admin */
export function AdminConsolePreloader() {
  return (
    <svg
      className="awp-admin-svg h-auto w-full max-w-full overflow-visible drop-shadow-lg"
      viewBox="0 0 400 240"
      role="img"
      aria-hidden
    >
      <defs>
        <linearGradient id="awp-ad-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
      </defs>
      <rect width="400" height="240" rx="14" fill="url(#awp-ad-bg)" />
      <rect x="14" y="14" width="372" height="212" rx="10" fill="rgba(30,41,59,0.6)" stroke="rgba(148,163,184,0.15)" />

      {/* Pasek okna */}
      <rect x="24" y="24" width="352" height="22" rx="4" fill="rgba(15,23,42,0.85)" />
      <circle cx="36" cy="35" r="4" fill="#f87171" />
      <circle cx="52" cy="35" r="4" fill="#fbbf24" />
      <circle cx="68" cy="35" r="4" fill="#4ade80" />
      <text x="200" y="39" textAnchor="middle" fill="#94a3b8" style={{ fontSize: "9px", fontWeight: 600 }}>
        panel.admin / sesja
      </text>

      {/* Kafelki */}
      <g transform="translate(32, 58)">
        <rect width="108" height="72" rx="6" fill="rgba(51,65,85,0.85)" stroke="rgba(100,116,139,0.3)" />
        <path
          d="M 16 52 L 32 36 L 48 44 L 64 28 L 92 48"
          fill="none"
          stroke="#34d399"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="awp-admin__spark"
        />
        <text x="54" y="20" textAnchor="middle" fill="#cbd5e1" style={{ fontSize: "8px", fontWeight: 600 }}>
          AKTYWNOŚĆ
        </text>

        <g transform="translate(124, 0)">
          <rect width="108" height="72" rx="6" fill="rgba(51,65,85,0.85)" stroke="rgba(100,116,139,0.3)" />
          <rect x="14" y="18" width="18" height="22" rx="2" fill="#0ea5e9" opacity="0.7" className="awp-admin__tile-pulse" />
          <rect x="38" y="26" width="18" height="14" rx="2" fill="#a78bfa" opacity="0.65" className="awp-admin__tile-pulse" style={{ animationDelay: "0.15s" }} />
          <rect x="62" y="20" width="18" height="20" rx="2" fill="#f472b6" opacity="0.6" className="awp-admin__tile-pulse" style={{ animationDelay: "0.3s" }} />
          <text x="54" y="14" textAnchor="middle" fill="#cbd5e1" style={{ fontSize: "8px", fontWeight: 600 }}>
            UŻYTKOWNICY
          </text>
        </g>

        <g transform="translate(248, 0)">
          <rect width="108" height="72" rx="6" fill="rgba(51,65,85,0.85)" stroke="rgba(100,116,139,0.3)" />
          <rect x="12" y="20" width="84" height="6" rx="2" fill="rgba(148,163,184,0.25)" />
          <rect x="12" y="32" width="64" height="6" rx="2" fill="rgba(148,163,184,0.2)" className="awp-admin__scanline" />
          <rect x="12" y="44" width="72" height="6" rx="2" fill="rgba(148,163,184,0.18)" />
          <text x="54" y="14" textAnchor="middle" fill="#cbd5e1" style={{ fontSize: "8px", fontWeight: 600 }}>
            MECZE
          </text>
        </g>
      </g>

      {/* Lista kontrolna */}
      <g transform="translate(32, 148)">
        <rect width="336" height="76" rx="8" fill="rgba(15,23,42,0.75)" stroke="rgba(71,85,105,0.5)" />
        <text x="12" y="22" fill="#94a3b8" style={{ fontSize: "9px", fontWeight: 700 }}>
          ZADANIA SYSTEMU
        </text>
        {[
          { y: 36, w: 85 },
          { y: 50, w: 110 },
          { y: 64, w: 70 },
        ].map((row, i) => (
          <g key={row.y}>
            <rect x="12" y={row.y} width="10" height="10" rx="2" fill="none" stroke="#4ade80" strokeWidth="1.2" className="awp-admin__chk" style={{ animationDelay: `${i * 0.2}s` }} />
            <rect x="28" y={row.y + 3} width={row.w} height="4" rx="2" fill="rgba(148,163,184,0.25)" />
          </g>
        ))}
      </g>

      <text x="200" y="228" textAnchor="middle" fill="rgba(148,163,184,0.75)" style={{ fontSize: "10px", fontWeight: 600 }}>
        Ładujemy narzędzia trenera…
      </text>
    </svg>
  );
}
