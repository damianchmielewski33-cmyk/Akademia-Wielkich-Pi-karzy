/**
 * Preloader „Rankingi” — ten sam język wizualny co transport (noc, siatka, karta urządzenia):
 * podium, medale, animowana lista miejsc.
 */

export function RankingNightPreloader() {
  return (
    <div className="ranking-preloader-v2-root relative flex min-h-[100dvh] w-full flex-col items-center justify-center overflow-hidden bg-[#0b1220] px-4 py-10">
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
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_55%_at_50%_0%,rgba(251,191,36,0.12),transparent_50%)]" />

      <div className="relative z-[1] w-full max-w-[22rem] sm:max-w-md">
        <div className="rounded-[1.35rem] border border-amber-500/20 bg-slate-900/85 p-1 shadow-[0_24px_64px_-12px_rgba(120,80,20,0.45)] ring-1 ring-white/10 backdrop-blur-sm">
          <div className="rounded-[1.15rem] bg-gradient-to-b from-slate-800/95 to-slate-950/98 px-5 pb-5 pt-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-amber-400/95">
                  Klasyfikacja
                </p>
                <p className="mt-0.5 text-lg font-bold tracking-tight text-white">Rankingi</p>
                <p className="mt-1 text-xs leading-snug text-slate-400">
                  Układamy kolejność — gole, asysty i punkty z boiska.
                </p>
              </div>
              <div className="ranking-preloader-v2-trophy flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-600/20 ring-1 ring-amber-400/30">
                <svg viewBox="0 0 24 24" className="h-6 w-6 text-amber-200" fill="currentColor" aria-hidden>
                  <path d="M7 4V2c0-.55.45-1 1-1h8c.55 0 1 .45 1 1v2h4v2c0 2.97-2.16 5.43-5 5.91V17h2v2H6v-2h2v-5.09C5.16 11.43 3 8.97 3 6V4h4zm6 0V3H8v1h5zm4 0V3h-3v1h3zM5 6H3c0 2.41 1.8 4.41 4.15 4.9A6.9 6.9 0 015 6zm14 0h2c0 2.41-1.8 4.41-4.15 4.9A6.9 6.9 0 0119 6z" />
                </svg>
              </div>
            </div>

            <div className="relative mt-5 overflow-hidden rounded-2xl border border-slate-700/80 bg-[#0f172a] px-3 pb-4 pt-5 shadow-inner">
              <p className="mb-4 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Podium
              </p>
              <div className="flex h-[132px] items-end justify-center gap-2 sm:gap-3">
                {/* 2 miejsce */}
                <div className="flex flex-col items-center">
                  <div className="ranking-preloader-v2-medal ranking-preloader-v2-medal--2 mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-b from-slate-200 to-slate-400 text-sm font-black text-slate-800 shadow-md ring-2 ring-white/30">
                    2
                  </div>
                  <div className="ranking-preloader-v2-podium ranking-preloader-v2-podium--2 w-14 rounded-t-lg bg-gradient-to-b from-slate-400 to-slate-600 shadow-lg ring-1 ring-white/20 sm:w-16" />
                </div>
                {/* 1 miejsce */}
                <div className="flex flex-col items-center">
                  <div className="ranking-preloader-v2-medal ranking-preloader-v2-medal--1 mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-b from-amber-200 to-amber-600 text-base font-black text-amber-950 shadow-lg ring-2 ring-amber-300/60">
                    1
                  </div>
                  <div className="ranking-preloader-v2-podium ranking-preloader-v2-podium--1 w-[4.25rem] rounded-t-lg bg-gradient-to-b from-amber-400 to-amber-700 shadow-xl ring-1 ring-amber-300/40 sm:w-20" />
                </div>
                {/* 3 miejsce */}
                <div className="flex flex-col items-center">
                  <div className="ranking-preloader-v2-medal ranking-preloader-v2-medal--3 mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-b from-orange-200 to-orange-700 text-sm font-black text-orange-950 shadow-md ring-2 ring-orange-300/40">
                    3
                  </div>
                  <div className="ranking-preloader-v2-podium ranking-preloader-v2-podium--3 w-14 rounded-t-lg bg-gradient-to-b from-orange-500 to-orange-900 shadow-lg ring-1 ring-orange-400/25 sm:w-16" />
                </div>
              </div>

              <div className="ranking-preloader-v2-rows mt-5 space-y-2 border-t border-slate-700/60 pt-4">
                {[1, 2, 3].map((n) => (
                  <div
                    key={n}
                    className="ranking-preloader-v2-row flex items-center gap-2 rounded-lg bg-slate-800/50 px-2 py-1.5 ring-1 ring-white/5"
                  >
                    <span className="w-5 text-center text-[11px] font-bold text-slate-500">{n + 3}</span>
                    <div className="ranking-preloader-v2-row-bar h-2 flex-1 overflow-hidden rounded-full bg-slate-700/80">
                      <div
                        className={`ranking-preloader-v2-row-fill h-full rounded-full bg-gradient-to-r from-emerald-700 to-teal-500 ranking-preloader-v2-row-fill--${n}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-medium text-slate-500">
                <span>Ładowanie rankingu</span>
                <span className="text-amber-500/90">LIVE</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div className="ranking-preloader-v2-bar h-full rounded-full bg-gradient-to-r from-amber-700 via-amber-400 to-emerald-400" />
              </div>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          Kto dziś rządzi tabelą — zaraz zobaczysz pełną listę.
        </p>
      </div>
    </div>
  );
}
