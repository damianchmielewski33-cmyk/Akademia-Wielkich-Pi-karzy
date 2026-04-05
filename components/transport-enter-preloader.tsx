"use client";

/**
 * Preloader „Transport na mecz” — nocna nawigacja: trasa na mapie, cel (stadion),
 * znacznik jedzie w stronę obiektu. Spójne z motywem dojazdu na mecz.
 */

export function TransportEnterPreloader() {
  const routeD = "M 28 172 C 72 36, 168 124, 248 52";

  return (
    <div className="transport-preloader-v2-root relative flex min-h-[100dvh] w-full flex-col items-center justify-center overflow-hidden bg-[#0b1220] px-4 py-10">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(16,185,129,0.07) 1px, transparent 1px),
            linear-gradient(90deg, rgba(16,185,129,0.07) 1px, transparent 1px)
          `,
          backgroundSize: "28px 28px",
        }}
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_120%,rgba(16,185,129,0.18),transparent_55%)]" />

      <div className="relative z-[1] w-full max-w-[22rem] sm:max-w-md">
        <div className="rounded-[1.35rem] border border-emerald-500/25 bg-slate-900/85 p-1 shadow-[0_24px_64px_-12px_rgba(5,80,55,0.55)] ring-1 ring-white/10 backdrop-blur-sm">
          <div className="rounded-[1.15rem] bg-gradient-to-b from-slate-800/95 to-slate-950/98 px-5 pb-5 pt-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-emerald-400/95">
                  Nawigacja
                </p>
                <p className="mt-0.5 text-lg font-bold tracking-tight text-white">Transport na mecz</p>
                <p className="mt-1 text-xs leading-snug text-slate-400">
                  Trasa do obiektu sportowego — łączymy kierowców z osobami szukającymi dojazdu.
                </p>
              </div>
              <div className="transport-preloader-v2-pin flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-600/25 ring-1 ring-emerald-400/35">
                <svg viewBox="0 0 24 24" className="h-6 w-6 text-emerald-300" fill="currentColor" aria-hidden>
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z" />
                </svg>
              </div>
            </div>

            <div className="relative mt-5 overflow-hidden rounded-2xl border border-slate-700/80 bg-[#0f172a] shadow-inner">
              <div className="relative aspect-[320/200] w-full">
                <svg
                  viewBox="0 0 320 200"
                  className="h-full w-full"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden
                >
                  <defs>
                    <linearGradient id="transport-v2-sky" x1="160" y1="0" x2="160" y2="200" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#1e293b" />
                      <stop offset="1" stopColor="#0f172a" />
                    </linearGradient>
                    <filter id="transport-v2-glow" x="-40%" y="-40%" width="180%" height="180%">
                      <feGaussianBlur stdDeviation="2.5" result="b" />
                      <feMerge>
                        <feMergeNode in="b" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  <rect width="320" height="200" fill="url(#transport-v2-sky)" />

                  <g opacity="0.11" stroke="#94a3b8" strokeWidth="0.5">
                    {Array.from({ length: 11 }).map((_, i) => (
                      <line key={`h${i}`} x1="0" y1={i * 20} x2="320" y2={i * 20} />
                    ))}
                    {Array.from({ length: 17 }).map((_, i) => (
                      <line key={`v${i}`} x1={i * 20} y1="0" x2={i * 20} y2="200" />
                    ))}
                  </g>

                  <path
                    d={routeD}
                    stroke="#334155"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.92"
                  />

                  <path
                    className="transport-preloader-v2-route"
                    pathLength="1"
                    d={routeD}
                    stroke="#34d399"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="url(#transport-v2-glow)"
                  />

                  <g transform="translate(228, 12)" className="transport-preloader-v2-stadium">
                    <ellipse cx="36" cy="52" rx="44" ry="10" fill="#022c22" opacity="0.5" />
                    <path
                      d="M4 52 L12 24 L60 24 L68 52 Z"
                      fill="#0f172a"
                      stroke="#14532d"
                      strokeWidth="1.2"
                    />
                    <path d="M14 28 L58 28 L56 20 L16 20 Z" fill="#166534" opacity="0.85" />
                    <rect x="22" y="10" width="28" height="12" rx="2" fill="#1e3a2f" />
                    <circle cx="20" cy="18" r="2" className="fill-amber-200/90" />
                    <circle cx="36" cy="14" r="2.5" className="fill-amber-200/90" />
                    <circle cx="52" cy="18" r="2" className="fill-amber-200/90" />
                  </g>
                </svg>

                {/* Znacznik „pojazd” — pozycja zsynchronizowana z krzywizną trasy (przybliżenie %) */}
                <div
                  className="transport-preloader-v2-marker pointer-events-none absolute -ml-2 -mt-2 h-4 w-4 rounded-full border-2 border-white bg-amber-300 shadow-[0_0_14px_rgba(251,191,36,0.85)] sm:h-[18px] sm:w-[18px]"
                  aria-hidden
                />
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-medium text-slate-500">
                <span>Ładowanie widoku</span>
                <span className="text-emerald-500/90">GPS</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div className="transport-preloader-v2-bar h-full rounded-full bg-gradient-to-r from-emerald-700 via-emerald-400 to-teal-400" />
              </div>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          Wspólny dojazd na murawę — zaraz jesteś na miejscu.
        </p>
      </div>
    </div>
  );
}
