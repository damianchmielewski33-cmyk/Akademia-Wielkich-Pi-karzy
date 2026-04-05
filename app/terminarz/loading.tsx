export default function TerminarzLoading() {
  return (
    <div className="container mx-auto max-w-6xl flex-1 px-4 py-10" aria-busy="true" aria-label="Ładowanie terminarza">
      <div className="mx-auto mb-8 max-w-xl space-y-3">
        <div className="mx-auto h-8 w-48 animate-pulse rounded-lg bg-emerald-100" />
        <div className="h-4 animate-pulse rounded bg-zinc-100" />
      </div>
      <div className="h-[min(420px,55vh)] animate-pulse rounded-2xl bg-zinc-100/90 ring-1 ring-zinc-200" />
    </div>
  );
}
