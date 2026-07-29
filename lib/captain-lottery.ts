import type { PlayerEntry } from "@/lib/terminarz-shared";

export type CaptainLotteryRow = {
  id: number;
  match_id: number;
  round_number: number;
  drawn_by_user_id: number | null;
  captain_count: number | null;
  captain_user_ids: string;
  drawn_at: string | null;
  locked: number;
  drawn_by_first_name?: string | null;
  drawn_by_last_name?: string | null;
  drawn_by_zawodnik?: string | null;
  drawn_by_profile_photo_path?: string | null;
};

export type CaptainLotteryEntry = {
  id: number;
  matchId: number;
  roundNumber: number;
  drawnByUserId: number | null;
  drawnByFirstName: string;
  drawnByLastName: string;
  drawnByZawodnik: string;
  drawnByPhoto: string | null;
  captainCount: number;
  captainUserIds: number[];
  captains: PlayerEntry[];
  drawnAt: string | null;
  locked: boolean;
  /** Losowanie zostało już wykonane (są wyniki). */
  hasResults: boolean;
};

export const CAPTAIN_LOTTERY_SELECT_SQL = `
  SELECT l.id, l.match_id, l.round_number, l.drawn_by_user_id, l.captain_count,
         l.captain_user_ids, l.drawn_at, l.locked,
         u.first_name AS drawn_by_first_name, u.last_name AS drawn_by_last_name,
         u.player_alias AS drawn_by_zawodnik, u.profile_photo_path AS drawn_by_profile_photo_path
  FROM match_captain_lottery l
  LEFT JOIN users u ON u.id = l.drawn_by_user_id
`;

export function parseCaptainUserIds(raw: string): number[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((x) => Number(x))
      .filter((n) => Number.isFinite(n) && n > 0);
  } catch {
    return [];
  }
}

export function captainLotteryPoolFromPlayersData(
  data: { players: PlayerEntry[] } | null | undefined
): PlayerEntry[] {
  if (!data) return [];
  return [...data.players];
}

export function pickCaptainUserIds(pool: PlayerEntry[], count: number): number[] {
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, Math.min(count, shuffled.length)).map((p) => p.userId);
}

export function resolveCaptainEntries(pool: PlayerEntry[], userIds: number[]): PlayerEntry[] {
  const byId = new Map(pool.map((p) => [p.userId, p]));
  return userIds.map((id) => byId.get(id)).filter((p): p is PlayerEntry => p != null);
}

export function buildCaptainLotteryEntry(
  row: CaptainLotteryRow,
  pool: PlayerEntry[]
): CaptainLotteryEntry {
  const captainUserIds = parseCaptainUserIds(row.captain_user_ids);
  const hasResults = Boolean((row.drawn_at || "").trim());
  return {
    id: row.id,
    matchId: row.match_id,
    roundNumber: row.round_number,
    drawnByUserId: row.drawn_by_user_id ?? null,
    drawnByFirstName: (row.drawn_by_first_name ?? "").trim(),
    drawnByLastName: (row.drawn_by_last_name ?? "").trim(),
    drawnByZawodnik: (row.drawn_by_zawodnik ?? "").trim(),
    drawnByPhoto: row.drawn_by_profile_photo_path ?? null,
    captainCount: row.captain_count ?? captainUserIds.length,
    captainUserIds,
    captains: hasResults ? resolveCaptainEntries(pool, captainUserIds) : [],
    drawnAt: row.drawn_at ?? null,
    locked: Number(row.locked) === 1,
    hasResults,
  };
}

export function buildCaptainLotteryMaps(
  rows: CaptainLotteryRow[],
  playersData: Record<number, { players: PlayerEntry[]; tentativePlayers: PlayerEntry[]; declinedPlayers: PlayerEntry[] }>
): {
  latest: Record<number, CaptainLotteryEntry>;
  history: Record<number, CaptainLotteryEntry[]>;
} {
  const byMatch = new Map<number, CaptainLotteryRow[]>();
  for (const row of rows) {
    const list = byMatch.get(row.match_id) ?? [];
    list.push(row);
    byMatch.set(row.match_id, list);
  }

  const latest: Record<number, CaptainLotteryEntry> = {};
  const history: Record<number, CaptainLotteryEntry[]> = {};

  for (const [matchId, matchRows] of byMatch) {
    const sorted = [...matchRows].sort((a, b) => b.round_number - a.round_number);
    const pool = captainLotteryPoolFromPlayersData(playersData[matchId]);
    const entries = sorted.map((r) => buildCaptainLotteryEntry(r, pool));
    history[matchId] = entries;
    latest[matchId] = entries[0];
  }

  return { latest, history };
}

/** Ostatnia mapa tylko z najnowszą rundą (kompatybilność strony terminarza). */
export function buildCaptainLotteryMap(
  rows: CaptainLotteryRow[],
  playersData: Record<number, { players: PlayerEntry[]; tentativePlayers: PlayerEntry[]; declinedPlayers: PlayerEntry[] }>
): Record<number, CaptainLotteryEntry> {
  return buildCaptainLotteryMaps(rows, playersData).latest;
}

export function formatCaptainLotteryDrawnAt(drawnAt: string): string {
  const trimmed = (drawnAt || "").trim();
  if (!trimmed) return "";
  const normalized = trimmed.includes("T") ? trimmed : trimmed.replace(" ", "T");
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return trimmed;
  return d.toLocaleString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function serializeCaptainLotteryEntry(entry: CaptainLotteryEntry) {
  return {
    id: entry.id,
    match_id: entry.matchId,
    round_number: entry.roundNumber,
    drawn_by_user_id: entry.drawnByUserId,
    drawn_by_first_name: entry.drawnByFirstName,
    drawn_by_last_name: entry.drawnByLastName,
    drawn_by_zawodnik: entry.drawnByZawodnik,
    drawn_by_profile_photo_path: entry.drawnByPhoto,
    captain_count: entry.captainCount,
    captain_user_ids: entry.captainUserIds,
    captains: entry.captains,
    drawn_at: entry.drawnAt,
    locked: entry.locked,
    has_results: entry.hasResults,
  };
}

export type CaptainLotteryApiPayload = ReturnType<typeof serializeCaptainLotteryEntry>;

export function captainLotteryEntryFromApi(api: CaptainLotteryApiPayload): CaptainLotteryEntry {
  return {
    id: api.id,
    matchId: api.match_id,
    roundNumber: api.round_number,
    drawnByUserId: api.drawn_by_user_id ?? null,
    drawnByFirstName: api.drawn_by_first_name,
    drawnByLastName: api.drawn_by_last_name,
    drawnByZawodnik: api.drawn_by_zawodnik,
    drawnByPhoto: api.drawn_by_profile_photo_path,
    captainCount: api.captain_count,
    captainUserIds: api.captain_user_ids,
    captains: api.captains,
    drawnAt: api.drawn_at,
    locked: api.locked,
    hasResults: api.has_results,
  };
}

type Db = Awaited<ReturnType<typeof import("@/lib/db").getDb>>;

export async function loadOpenLotteryRow(db: Db, matchId: number) {
  return (await db
    .prepare(`${CAPTAIN_LOTTERY_SELECT_SQL} WHERE l.match_id = ? AND l.locked = 0 ORDER BY l.round_number DESC LIMIT 1`)
    .get(matchId)) as CaptainLotteryRow | undefined;
}

export async function loadLatestLotteryRow(db: Db, matchId: number) {
  return (await db
    .prepare(`${CAPTAIN_LOTTERY_SELECT_SQL} WHERE l.match_id = ? ORDER BY l.round_number DESC LIMIT 1`)
    .get(matchId)) as CaptainLotteryRow | undefined;
}

export async function loadLotteryRowById(db: Db, lotteryId: number) {
  return (await db
    .prepare(`${CAPTAIN_LOTTERY_SELECT_SQL} WHERE l.id = ?`)
    .get(lotteryId)) as CaptainLotteryRow | undefined;
}

export async function loadLotteryHistoryRows(db: Db, matchId: number) {
  return (await db
    .prepare(`${CAPTAIN_LOTTERY_SELECT_SQL} WHERE l.match_id = ? ORDER BY l.round_number DESC`)
    .all(matchId)) as CaptainLotteryRow[];
}

export async function createLotteryRound(
  db: Db,
  matchId: number,
  createdByAdminId: number | null
): Promise<number> {
  const maxRow = (await db
    .prepare("SELECT COALESCE(MAX(round_number), 0) AS m FROM match_captain_lottery WHERE match_id = ?")
    .get(matchId)) as { m: number };
  const nextRound = Number(maxRow.m) + 1;
  const result = await db
    .prepare(
      `INSERT INTO match_captain_lottery (match_id, round_number, captain_user_ids, locked, created_by_admin_id)
       VALUES (?, ?, '[]', 0, ?)`
    )
    .run(matchId, nextRound, createdByAdminId);
  return Number(result.lastInsertRowid);
}
