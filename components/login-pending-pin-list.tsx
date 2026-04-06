import { getDb } from "@/lib/db";

export type PendingPinPlayer = {
  id: number;
  first_name: string;
  last_name: string;
  player_alias: string;
};

/**
 * Sekcja „Pierwsze logowanie po zmianie — ustaw PIN”: renderuje się tylko, gdy w bazie są konta bez pin_hash.
 * W przeciwnym razie zwraca null (brak HTML, brak zapytania w rodzicu).
 */
export async function LoginPendingPinList() {
  const db = await getDb();
  const players = (await db
    .prepare(
      `SELECT id, first_name, last_name, player_alias
       FROM users WHERE pin_hash IS NULL
       ORDER BY last_name COLLATE NOCASE, first_name COLLATE NOCASE`
    )
    .all()) as PendingPinPlayer[];

  if (players.length === 0) {
    return null;
  }

  return (
    <div className="mt-5 rounded-xl border border-amber-200/90 bg-amber-50/90 px-4 py-3 text-left shadow-sm">
      <p className="text-sm font-semibold text-amber-950">
        Pierwsze logowanie po zmianie — ustaw PIN
      </p>
      <p className="mt-1 text-xs leading-relaxed text-amber-900/85">
        Ci zawodnicy muszą jeszcze użyć przycisku poniżej lub strony „Ustaw PIN”. Po ustawieniu PIN-u i
        zalogowaniu znikają z tej listy.
      </p>
      <ul className="mt-2.5 flex flex-col gap-2" aria-label="Zawodnicy bez ustawionego PIN-u">
        {players.map((p) => (
          <li
            key={p.id}
            className="rounded-lg bg-white/90 px-3 py-2 text-xs text-amber-950 shadow-sm ring-1 ring-amber-200/80"
          >
            <span className="font-semibold">
              {p.first_name} {p.last_name}
            </span>
            <span className="text-amber-900/80"> — {p.player_alias}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
