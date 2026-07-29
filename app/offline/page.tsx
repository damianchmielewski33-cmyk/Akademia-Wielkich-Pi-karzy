export default function OfflinePage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-bold text-emerald-800 dark:text-emerald-200">
        Brak połączenia
      </h1>
      <p className="text-slate-600 dark:text-zinc-400">
        Sprawdź połączenie z internetem i spróbuj ponownie.
      </p>
      <button
        onClick={() => location.reload()}
        className="rounded-lg bg-emerald-700 px-6 py-2 text-white hover:bg-emerald-800"
      >
        Odśwież
      </button>
    </div>
  );
}
