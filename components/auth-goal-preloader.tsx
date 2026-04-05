"use client";

/** Czas pokazania animacji przed `router.push` (ms). */
export const AUTH_SUCCESS_PRELOADER_DELAY_MS = 2400;

export function AuthGoalPreloader({ label }: { label?: string }) {
  return (
    <div
      className="auth-goal-preloader-root fixed inset-0 z-[200] flex flex-col items-center justify-center bg-slate-950/55 px-4 backdrop-blur-[2px]"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="relative mx-auto w-full max-w-md rounded-2xl border border-white/15 bg-gradient-to-b from-emerald-900/90 to-emerald-950 p-3 shadow-2xl shadow-emerald-950/40">
        <svg
          className="auth-goal-preloader-svg h-auto w-full overflow-visible rounded-xl"
          viewBox="0 0 320 180"
          role="img"
          aria-label="Animacja: piłkarz kopie piłkę do bramki"
        >
          <defs>
            <pattern id="agp-stripes" width="16" height="180" patternUnits="userSpaceOnUse">
              <rect width="16" height="180" fill="rgba(255,255,255,0.03)" />
            </pattern>
            <linearGradient id="agp-pitch" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0f766e" />
              <stop offset="100%" stopColor="#064e3b" />
            </linearGradient>
          </defs>
          <rect width="320" height="180" rx="12" fill="url(#agp-pitch)" />
          <rect width="320" height="180" rx="12" fill="url(#agp-stripes)" />

          {/* Łuk strzału */}
          <path
            className="auth-goal-preloader__arc"
            d="M 92 138 Q 188 32 268 108"
            fill="none"
            stroke="rgba(255,255,255,0.14)"
            strokeWidth="2"
            strokeDasharray="5 9"
          />

          {/* Bramka */}
          <g className="auth-goal-preloader__goal">
            <rect x="252" y="48" width="56" height="6" rx="1" fill="rgba(255,255,255,0.92)" />
            <rect x="252" y="54" width="4" height="78" rx="1" fill="rgba(255,255,255,0.9)" />
            <rect x="304" y="54" width="4" height="78" rx="1" fill="rgba(255,255,255,0.9)" />
            <rect x="258" y="58" width="44" height="70" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="1" />
            <path
              d="M 258 68 H 302 M 258 88 H 302 M 258 108 H 302 M 266 58 V 128 M 278 58 V 128 M 290 58 V 128"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="0.75"
            />
          </g>

          {/* Piłkarz */}
          <g transform="translate(36, 118)">
            <circle cx="14" cy="-32" r="9" fill="#0f172a" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" />
            <rect x="6" y="-24" width="16" height="22" rx="4" fill="#059669" stroke="rgba(255,255,255,0.2)" strokeWidth="0.8" />
            <rect x="8" y="-4" width="6" height="20" rx="3" fill="#0f172a" />
            <g className="auth-goal-preloader__leg">
              <rect x="18" y="-4" width="7" height="22" rx="3.5" fill="#0f172a" />
            </g>
          </g>

          {/* Piłka — pozycja startu przy nodze */}
          <g className="auth-goal-preloader__ball">
            <circle cx="86" cy="136" r="7" fill="#fafafa" stroke="#0f172a" strokeWidth="1.4" />
            <path
              d="M 82 134 A 5 5 0 0 1 90 134"
              fill="none"
              stroke="rgba(15,23,42,0.25)"
              strokeWidth="0.9"
            />
          </g>
        </svg>
      </div>

      <p className="mt-5 max-w-sm text-center text-base font-medium tracking-tight text-white drop-shadow-sm">
        {label ?? "Cel! Przekierowujemy Cię na boisko…"}
      </p>
    </div>
  );
}
