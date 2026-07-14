import { formatActivityTimePl } from "@/lib/activity-display";
import type { AppDb } from "@/lib/db";

export type RankingSeasonRow = {
  id: number;
  name: string;
  started_at: string;
  ended_at: string | null;
  started_by_admin_id: number;
  ended_by_admin_id: number | null;
};

export type RankingSeasonView = RankingSeasonRow & {
  is_active: boolean;
  started_at_display: string;
  ended_at_display: string | null;
};

function mapSeasonView(row: RankingSeasonRow): RankingSeasonView {
  return {
    ...row,
    is_active: row.ended_at == null,
    started_at_display: formatActivityTimePl(row.started_at),
    ended_at_display: row.ended_at ? formatActivityTimePl(row.ended_at) : null,
  };
}

async function firstAdminId(db: AppDb): Promise<number> {
  const row = (await db
    .prepare("SELECT id FROM users WHERE is_admin = 1 ORDER BY id LIMIT 1")
    .get()) as { id: number } | undefined;
  return row?.id ?? 1;
}

/** Pierwszy start: jeden aktywny sezon + przypisanie dotychczasowych statystyk. */
export async function ensureRankingSeasonsInitialized(db: AppDb): Promise<void> {
  const count = (await db.prepare("SELECT COUNT(*) AS c FROM ranking_seasons").get()) as { c: number };
  if (count.c > 0) return;

  const adminId = await firstAdminId(db);
  const insert = await db
    .prepare(
      `INSERT INTO ranking_seasons (name, started_at, started_by_admin_id)
       VALUES (?, datetime('now'), ?)`
    )
    .run("Sezon 1", adminId);
  const seasonId = Number(insert.lastInsertRowid);

  await db.prepare("UPDATE match_stats SET season_id = ? WHERE season_id IS NULL").run(seasonId);
  await db.prepare("UPDATE standalone_match_stats SET season_id = ? WHERE season_id IS NULL").run(seasonId);
}

export async function listRankingSeasons(db: AppDb): Promise<RankingSeasonView[]> {
  await ensureRankingSeasonsInitialized(db);
  const rows = (await db
    .prepare(
      `SELECT id, name, started_at, ended_at, started_by_admin_id, ended_by_admin_id
       FROM ranking_seasons
       ORDER BY started_at DESC, id DESC`
    )
    .all()) as RankingSeasonRow[];
  return rows.map(mapSeasonView);
}

export async function getRankingSeasonById(db: AppDb, id: number): Promise<RankingSeasonView | null> {
  await ensureRankingSeasonsInitialized(db);
  const row = (await db
    .prepare(
      `SELECT id, name, started_at, ended_at, started_by_admin_id, ended_by_admin_id
       FROM ranking_seasons WHERE id = ?`
    )
    .get(id)) as RankingSeasonRow | undefined;
  return row ? mapSeasonView(row) : null;
}

export async function getActiveRankingSeason(db: AppDb): Promise<RankingSeasonView | null> {
  await ensureRankingSeasonsInitialized(db);
  const row = (await db
    .prepare(
      `SELECT id, name, started_at, ended_at, started_by_admin_id, ended_by_admin_id
       FROM ranking_seasons
       WHERE ended_at IS NULL
       ORDER BY started_at DESC, id DESC
       LIMIT 1`
    )
    .get()) as RankingSeasonRow | undefined;
  return row ? mapSeasonView(row) : null;
}

/** Domyślny sezon do wyświetlenia: wybrany, aktywny lub ostatnio zakończony. */
export async function resolveRankingSeasonForView(
  db: AppDb,
  requestedSeasonId?: number | null
): Promise<{ season: RankingSeasonView | null; seasons: RankingSeasonView[] }> {
  const seasons = await listRankingSeasons(db);
  if (requestedSeasonId != null && Number.isFinite(requestedSeasonId)) {
    const picked = seasons.find((s) => s.id === requestedSeasonId) ?? null;
    return { season: picked, seasons };
  }
  const active = seasons.find((s) => s.is_active) ?? null;
  if (active) return { season: active, seasons };
  return { season: seasons[0] ?? null, seasons };
}

export async function getActiveRankingSeasonId(db: AppDb): Promise<number | null> {
  const active = await getActiveRankingSeason(db);
  return active?.id ?? null;
}

async function nextDefaultSeasonName(db: AppDb): Promise<string> {
  const row = (await db.prepare("SELECT COUNT(*) AS c FROM ranking_seasons").get()) as { c: number };
  return `Sezon ${Number(row.c) + 1}`;
}

export async function startRankingSeason(
  db: AppDb,
  adminId: number,
  name?: string
): Promise<RankingSeasonView> {
  await ensureRankingSeasonsInitialized(db);

  const active = await getActiveRankingSeason(db);
  if (active) {
    await db
      .prepare(
        `UPDATE ranking_seasons
         SET ended_at = datetime('now'), ended_by_admin_id = ?
         WHERE id = ? AND ended_at IS NULL`
      )
      .run(adminId, active.id);
  }

  const seasonName = name?.trim() || (await nextDefaultSeasonName(db));
  const insert = await db
    .prepare(
      `INSERT INTO ranking_seasons (name, started_at, started_by_admin_id)
       VALUES (?, datetime('now'), ?)`
    )
    .run(seasonName, adminId);

  const created = await getRankingSeasonById(db, Number(insert.lastInsertRowid));
  if (!created) throw new Error("Nie udało się utworzyć sezonu rankingu.");
  return created;
}

export async function endRankingSeason(db: AppDb, seasonId: number, adminId: number): Promise<RankingSeasonView> {
  await ensureRankingSeasonsInitialized(db);
  const existing = await getRankingSeasonById(db, seasonId);
  if (!existing) throw new Error("Nie znaleziono sezonu rankingu.");
  if (!existing.is_active) throw new Error("Ten sezon jest już zakończony.");

  await db
    .prepare(
      `UPDATE ranking_seasons
       SET ended_at = datetime('now'), ended_by_admin_id = ?
       WHERE id = ? AND ended_at IS NULL`
    )
    .run(adminId, seasonId);

  const updated = await getRankingSeasonById(db, seasonId);
  if (!updated) throw new Error("Nie udało się zakończyć sezonu rankingu.");
  return updated;
}
