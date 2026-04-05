export default function SkladyLoading() {
  return (
    <div className="container mx-auto max-w-6xl flex-1 px-4 py-10" aria-busy="true" aria-label="Ładowanie składów">
      <div className="mb-8 h-4 w-40 animate-pulse rounded bg-zinc-200" />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-9 w-28 animate-pulse rounded-full bg-emerald-100/90" />
        ))}
      </div>
      <div className="mt-10 h-[min(480px,60vh)] animate-pulse rounded-2xl bg-zinc-100 ring-1 ring-zinc-200" />
    </div>
  );
}
