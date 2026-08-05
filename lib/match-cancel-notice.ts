/** Zbiorczy klucz — zachowywany przy czyszczeniu localStorage po linkach share. */
export const CANCEL_SEEN_STORAGE_KEY = "awp_cancel_seen_ids";

/** Prefiks starych pojedynczych kluczy (migracja). */
export const CANCEL_SEEN_KEY_PREFIX = "awp_cancel_seen_";

/**
 * Pokazuj popup anulowania tylko dla niedawnych terminów
 * (data meczu nie starsza niż N dni). Stare anulowania nie powinny wracać w nieskończoność.
 */
export const CANCEL_NOTICE_MAX_AGE_DAYS = 14;

function todayYmdLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/** Czy warto jeszcze pokazywać popup dla tego terminu. */
export function isCancelNoticeRelevant(matchDate: string): boolean {
  const date = matchDate.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const oldest = addDaysYmd(todayYmdLocal(), -CANCEL_NOTICE_MAX_AGE_DAYS);
  return date >= oldest;
}

export function readCancelSeenIds(): Set<number> {
  const out = new Set<number>();
  if (typeof window === "undefined") return out;
  try {
    const raw = localStorage.getItem(CANCEL_SEEN_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          const n = typeof item === "number" ? item : Number.parseInt(String(item), 10);
          if (Number.isFinite(n) && n > 0) out.add(n);
        }
      }
    }
    // Migracja starych kluczy awp_cancel_seen_<id>
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(CANCEL_SEEN_KEY_PREFIX)) continue;
      const id = Number.parseInt(key.slice(CANCEL_SEEN_KEY_PREFIX.length), 10);
      if (Number.isFinite(id) && id > 0) out.add(id);
    }
  } catch {
    /* ignore */
  }
  return out;
}

export function markCancelNoticeSeen(matchId: number): void {
  if (typeof window === "undefined" || !Number.isFinite(matchId) || matchId <= 0) return;
  try {
    const ids = readCancelSeenIds();
    ids.add(matchId);
    const list = Array.from(ids).sort((a, b) => a - b);
    // Ogranicz rozmiar — zostaw ostatnie 80 ID
    const trimmed = list.length > 80 ? list.slice(list.length - 80) : list;
    localStorage.setItem(CANCEL_SEEN_STORAGE_KEY, JSON.stringify(trimmed));
    localStorage.removeItem(`${CANCEL_SEEN_KEY_PREFIX}${matchId}`);
  } catch {
    /* ignore */
  }
}

export function wasCancelNoticeSeen(matchId: number): boolean {
  return readCancelSeenIds().has(matchId);
}
