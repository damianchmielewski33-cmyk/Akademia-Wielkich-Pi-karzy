export default function Loading() {
  return (
    <div className="container mx-auto max-w-5xl flex-1 px-4 py-16" aria-busy="true" aria-label="Ładowanie">
      <div className="mx-auto max-w-md space-y-4">
        <div className="h-10 animate-pulse rounded-xl bg-emerald-100/80" />
        <div className="h-24 animate-pulse rounded-2xl bg-zinc-100" />
        <div className="h-24 animate-pulse rounded-2xl bg-zinc-100" />
      </div>
    </div>
  );
}
