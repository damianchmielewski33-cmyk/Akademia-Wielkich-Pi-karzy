/** Zgodne z SQLite: date('now') <= date(match_date, '+7 days') (UTC, format YYYY-MM-DD). */

function parseYmdUTC(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) throw new Error("Invalid YMD");
  return new Date(Date.UTC(y, m - 1, d));
}

function formatYmdUTC(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Ostatni dzień, w którym można jeszcze dodać/edytować statystyki (włącznie). */
export function statsEditWindowEndYmd(matchDateYmd: string): string {
  const start = parseYmdUTC(matchDateYmd);
  start.setUTCDate(start.getUTCDate() + 7);
  return formatYmdUTC(start);
}

export function isWithinStatsEditWindow(matchDateYmd: string, todayUtcYmd: string): boolean {
  const end = statsEditWindowEndYmd(matchDateYmd);
  return todayUtcYmd <= end;
}

export function utcTodayYmd(): string {
  return new Date().toISOString().slice(0, 10);
}
