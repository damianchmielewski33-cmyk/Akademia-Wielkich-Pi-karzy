/**
 * Etykiety dla dziennika aktywności (admin: przegląd, analityka).
 */

const PL_TZ = "Europe/Warsaw";

export function formatActivityActorLabel(row: {
  user_id: number | null;
  first_name: string | null | undefined;
  last_name: string | null | undefined;
  player_alias: string | null | undefined;
}): string {
  if (row.user_id == null) {
    return "Bez przypisanego konta";
  }
  const fn = row.first_name?.trim() ?? "";
  const ln = row.last_name?.trim() ?? "";
  const alias = row.player_alias?.trim() ?? "";
  if (fn && ln && alias) {
    return `${fn} ${ln} · ${alias}`;
  }
  if (fn && ln) {
    return `${fn} ${ln}`;
  }
  return `Konto #${row.user_id}`;
}

/** Czytelna data i godzina w strefie jak w reszcie analityki (PL). */
export function formatActivityTimePl(timestamp: string): string {
  let ms = Date.parse(timestamp);
  if (Number.isNaN(ms) && timestamp.includes(" ") && !timestamp.includes("T")) {
    ms = Date.parse(timestamp.replace(" ", "T"));
  }
  if (Number.isNaN(ms)) {
    return timestamp;
  }
  return new Date(ms).toLocaleString("pl-PL", {
    timeZone: PL_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
