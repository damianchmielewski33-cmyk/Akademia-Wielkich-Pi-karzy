/** Dialog statystyk zawodnika — kompaktowy „crunch” liczb */
export function StatsCrunchPreloader() {
  return (
    <div className="flex flex-col items-center gap-4 py-6" aria-hidden>
      <svg className="awp-inline-stat-svg h-36 w-full max-w-[280px]" viewBox="0 0 280 140" role="img">
        <defs>
          <linearGradient id="awp-is-grid" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ecfdf5" />
            <stop offset="100%" stopColor="#d1fae5" />
          </linearGradient>
        </defs>
        <rect width="280" height="140" rx="12" fill="url(#awp-is-grid)" />
        <g stroke="rgba(5,80,60,0.1)" strokeWidth="0.8">
          {Array.from({ length: 7 }).map((_, i) => (
            <line key={`h-${i}`} x1="12" y1={18 + i * 16} x2="268" y2={18 + i * 16} />
          ))}
          {Array.from({ length: 12 }).map((_, i) => (
            <line key={`v-${i}`} x1={18 + i * 22} y1="12" x2={18 + i * 22} y2="128" />
          ))}
        </g>
        {[0, 1, 2, 3].map((i) => (
          <rect
            key={i}
            x={40 + i * 52}
            y={100 - [38, 55, 28, 44][i]}
            width="28"
            height={[38, 55, 28, 44][i]}
            rx="3"
            fill={["#059669", "#10b981", "#0d9488", "#14b8a6"][i]}
            className="awp-inline-stat__bar"
            style={{ animationDelay: `${i * 0.1}s`, transformOrigin: `${54 + i * 52}px 100px` }}
          />
        ))}
        <g className="awp-inline-stat__digits" transform="translate(140, 52)">
          <text textAnchor="middle" fill="#065f46" style={{ fontSize: "22px", fontWeight: 800, fontFamily: "ui-monospace, monospace" }}>
            0–0
          </text>
          <text y="22" textAnchor="middle" fill="rgba(6,78,59,0.45)" style={{ fontSize: "8px", fontWeight: 600 }}>
            GOLE : ASYSTY
          </text>
        </g>
        <circle cx="246" cy="28" r="9" fill="#fff" stroke="#0f172a" strokeWidth="1.2" className="awp-inline-stat__ball" />
      </svg>
      <p className="text-center text-sm text-zinc-600">Liczymy wpisy z ostatnich meczów…</p>
    </div>
  );
}

/** Overlay przy wgrywaniu zdjęcia profilowego */
export function PhotoDevelopPreloader() {
  return (
    <div
      className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-full bg-emerald-950/75 backdrop-blur-[2px]"
      role="status"
      aria-live="polite"
      aria-label="Przetwarzanie zdjęcia"
    >
      <svg className="awp-photo-svg h-24 w-24" viewBox="0 0 120 120" aria-hidden>
        <defs>
          <radialGradient id="awp-ph-flash" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
        </defs>
        <circle cx="60" cy="60" r="38" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="3" />
        <g className="awp-photo__aperture" transform="translate(60, 60)">
          {[0, 60, 120, 180, 240, 300].map((deg) => (
            <path
              key={deg}
              d="M 0 -32 L 8 -14 L -8 -14 Z"
              fill="rgba(255,255,255,0.85)"
              transform={`rotate(${deg})`}
            />
          ))}
        </g>
        <circle cx="60" cy="60" r="14" fill="rgba(15,23,42,0.5)" />
        <circle cx="60" cy="60" r="40" fill="url(#awp-ph-flash)" className="awp-photo__flash" opacity="0" />
        <rect x="22" y="88" width="76" height="14" rx="2" fill="rgba(255,255,255,0.12)" />
        <rect x="24" y="90" width="72" height="10" rx="1" fill="#6ee7b7" className="awp-photo__progress" />
      </svg>
      <span className="text-xs font-medium text-emerald-50">Obróbka i zapis zdjęcia…</span>
    </div>
  );
}

/** Panel admina — pierwsze ładowanie składów */
export function LineupBoardPreloader() {
  return (
    <div className="flex flex-col items-center justify-center gap-5 py-16" aria-busy="true" aria-label="Ładowanie składów">
      <svg className="awp-lineup-svg h-44 w-full max-w-[320px]" viewBox="0 0 320 176" role="img" aria-hidden>
        <defs>
          <linearGradient id="awp-ln-pitch" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#059669" />
            <stop offset="100%" stopColor="#065f46" />
          </linearGradient>
        </defs>
        <rect width="320" height="176" rx="12" fill="#292524" />
        <rect x="10" y="10" width="300" height="156" rx="8" fill="url(#awp-ln-pitch)" />
        <rect x="18" y="18" width="284" height="140" rx="6" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.2" />
        <line x1="160" y1="18" x2="160" y2="158" stroke="rgba(255,255,255,0.3)" strokeWidth="1.2" />
        <circle cx="160" cy="88" r="20" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
        {[
          [52, 88],
          [78, 48],
          [78, 128],
          [104, 68],
          [104, 108],
          [130, 88],
          [212, 88],
        ].map(([x, y], i) => (
          <g key={i} transform={`translate(${x}, ${y})`}>
            <g className="awp-lineup__chip" style={{ animationDelay: `${i * 0.07}s` }}>
              <circle r="10" fill={i < 6 ? "#0ea5e9" : "#f97316"} stroke="#fff" strokeWidth="1.2" />
              <text y="4" textAnchor="middle" fill="rgba(255,255,255,0.9)" style={{ fontSize: "8px", fontWeight: 700 }}>
                {i + 1}
              </text>
            </g>
          </g>
        ))}
        {[238, 262, 286].map((x, i) => (
          <rect
            key={x}
            x={x - 8}
            y="124"
            width="16"
            height="20"
            rx="2"
            fill="rgba(255,255,255,0.15)"
            className="awp-lineup__bench"
            style={{ animationDelay: `${i * 0.12}s` }}
          />
        ))}
        <text x="160" y="12" textAnchor="middle" fill="rgba(255,255,255,0.5)" style={{ fontSize: "7px", fontWeight: 600 }}>
          PRZECIĄGNIJ ZAWODNIKÓW NA BOISKO
        </text>
      </svg>
      <p className="text-sm text-zinc-500">Ładujemy mecze, zawodników i zapisane pozycje…</p>
    </div>
  );
}
