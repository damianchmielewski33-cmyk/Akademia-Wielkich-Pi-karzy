/** Szkielet strony głównej — widoczny od razu, zanim dane SSR dotrą do klienta. */
export function HomeNextMatchSkeleton() {
  return (
    <section className="mx-auto w-full min-w-0 max-w-6xl px-3 pt-4 xs:px-4 sm:pt-6" aria-busy="true" aria-label="Ładowanie najbliższego meczu">
      <div className="mb-4 space-y-2">
        <div className="h-3 w-24 animate-pulse rounded bg-zinc-300/80 dark:bg-zinc-700" />
        <div className="h-8 w-52 animate-pulse rounded bg-zinc-300/80 dark:bg-zinc-700" />
      </div>
      <div className="overflow-hidden rounded-2xl bg-zinc-900 shadow-lg ring-1 ring-zinc-800/80">
        <div className="h-36 animate-pulse bg-zinc-800" />
        <div className="space-y-3 p-5">
          <div className="mx-auto h-24 max-w-md animate-pulse rounded-xl bg-zinc-800/90" />
          <div className="mx-auto h-16 max-w-md animate-pulse rounded-xl bg-zinc-800/80" />
          <div className="mx-auto h-20 max-w-md animate-pulse rounded-xl bg-zinc-800/90" />
          <div className="mx-auto h-11 max-w-md animate-pulse rounded-xl bg-zinc-700/90" />
        </div>
      </div>
    </section>
  );
}

export function HomePageSkeleton() {
  return (
    <div className="relative flex flex-1 flex-col pb-8">
      <HomeNextMatchSkeleton />
      <div className="mx-auto mt-8 w-full max-w-6xl space-y-3 px-3 xs:px-4">
        <div className="h-10 w-2/3 max-w-sm animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
          ))}
        </div>
      </div>
    </div>
  );
}
