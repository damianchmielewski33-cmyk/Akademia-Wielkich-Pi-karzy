export default function PilkarzeLoading() {
  return (
    <div className="container mx-auto max-w-5xl flex-1 px-4 py-10" aria-busy="true" aria-label="Ładowanie listy piłkarzy">
      <div className="mx-auto mb-10 max-w-md space-y-3">
        <div className="mx-auto h-10 w-56 animate-pulse rounded-lg bg-emerald-100" />
        <div className="h-4 animate-pulse rounded bg-zinc-100" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-zinc-100 ring-1 ring-zinc-200/80" />
        ))}
      </div>
    </div>
  );
}
