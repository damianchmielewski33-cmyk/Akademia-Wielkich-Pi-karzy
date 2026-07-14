import { formatActivityTimePl } from "@/lib/activity-display";
import type { AppDb } from "@/lib/db";
import { REALMS, type Realm } from "@/lib/realm";

export type RankingSeasonRow = {
  id: number;
  name: string;
  started_at: string;
  ended_at: string | null;
  started_by_admin_id: number;
  ended_by_admin_id: number | null;
  realm?: string;
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

/** Przypisuje statystyki bez sezonu do aktywnego sezonu (np. po migracji). */
export async function backfillOrphanStatsToActiveSeason(
  db: AppDb,
  realm: Realm = REALMS.ACADEMY
): Promise<void> {
  const row = (await db
    .prepare(
      `SELECT id FROM ranking_seasons
       WHERE ended_at IS NULL AND realm = ?
       ORDER BY started_at DESC, id DESC
       LIMIT 1`
    )
    .get(realm)) as { id: number } | undefined;
  if (!row) return;
  await db.prepare("UPDATE match_stats SET season_id = ? WHERE season_id IS NULL").run(row.id);
  await db
    .prepare("UPDATE standalone_match_stats SET season_id = ? WHERE season_id IS NULL")
    .run(row.id);
}

/** Pierwszy start: jeden aktywny sezon + przypisanie dotychczasowych statystyk. */
export async function ensureRankingSeasonsInitialized(
  db: AppDb,
  realm: Realm = REALMS.ACADEMY
): Promise<void> {
  const count = (await db
    .prepare("SELECT COUNT(*) AS c FROM ranking_seasons WHERE realm = ?")
    .get(realm)) as { c: number };
  if (count.c > 0) {
    await backfillOrphanStatsToActiveSeason(db, realm);
    return;
  }

  const adminId = await firstAdminId(db);
  const insert = await db
    .prepare(
      `INSERT INTO ranking_seasons (name, started_at, started_by_admin_id, realm)
       VALUES (?, datetime('now'), ?, ?)`
    )
    .run("Sezon 1", adminId, realm);
  const seasonId = Number(insert.lastInsertRowid);

  if (realm === REALMS.ACADEMY) {
    await db.prepare("UPDATE match_stats SET season_id = ? WHERE season_id IS NULL").run(seasonId);
    await db.prepare("UPDATE standalone_match_stats SET season_id = ? WHERE season_id IS NULL").run(seasonId);
  }
}

export async function listRankingSeasons(
  db: AppDb,
  realm: Realm = REALMS.ACADEMY
): Promise<RankingSeasonView[]> {
  await ensureRankingSeasonsInitialized(db, realm);
  const rows = (await db
    .prepare(
      `SELECT id, name, started_at, ended_at, started_by_admin_id, ended_by_admin_id, realm
       FROM ranking_seasons
       WHERE realm = ?
       ORDER BY started_at DESC, id DESC`
    )
    .all(realm)) as RankingSeasonRow[];
  return rows.map(mapSeasonView);
}

export async function getRankingSeasonById(
  db: AppDb,
  id: number,
  realm: Realm = REALMS.ACADEMY
): Promise<RankingSeasonView | null> {
  await ensureRankingSeasonsInitialized(db, realm);
  const row = (await db
    .prepare(
      `SELECT id, name, started_at, ended_at, started_by_admin_id, ended_by_admin_id, realm
       FROM ranking_seasons WHERE id = ? AND realm = ?`
    )
    .get(id, realm)) as RankingSeasonRow | undefined;
  return row ? mapSeasonView(row) : null;
}

export async function getActiveRankingSeason(
  db: AppDb,
  realm: Realm = REALMS.ACADEMY
): Promise<RankingSeasonView | null> {
  await ensureRankingSeasonsInitialized(db, realm);
  const row = (await db
    .prepare(
      `SELECT id, name, started_at, ended_at, started_by_admin_id, ended_by_admin_id, realm
       FROM ranking_seasons
       WHERE ended_at IS NULL AND realm = ?
       ORDER BY started_at DESC, id DESC
       LIMIT 1`
    )
    .get(realm)) as RankingSeasonRow | undefined;
  return row ? mapSeasonView(row) : null;
}

/** Domyślny sezon do wyświetlenia: wybrany, aktywny lub ostatnio zakończony. */
export async function resolveRankingSeasonForView(
  db: AppDb,
  requestedSeasonId?: number | null,
  realm: Realm = REALMS.ACADEMY
): Promise<{ season: RankingSeasonView | null; seasons: RankingSeasonView[] }> {
  const seasons = await listRankingSeasons(db, realm);
  if (requestedSeasonId != null && Number.isFinite(requestedSeasonId)) {
    const picked = seasons.find((s) => s.id === requestedSeasonId) ?? null;
    return { season: picked, seasons };
  }
  const active = seasons.find((s) => s.is_active) ?? null;
  if (active) return { season: active, seasons };
  return { season: seasons[0] ?? null, seasons };
}

export async function getActiveRankingSeasonId(
  db: AppDb,
  realm: Realm = REALMS.ACADEMY
): Promise<number | null> {
  const active = await getActiveRankingSeason(db, realm);
  return active?.id ?? null;
}

async function nextDefaultSeasonName(db: AppDb, realm: Realm): Promise<string> {
  const row = (await db
    .prepare("SELECT COUNT(*) AS c FROM ranking_seasons WHERE realm = ?")
    .get(realm)) as { c: number };
  return `Sezon ${Number(row.c) + 1}`;
}

export async function startRankingSeason(
  db: AppDb,
  adminId: number,
  name?: string,
  realm: Realm = REALMS.ACADEMY
): Promise<RankingSeasonView> {
  await ensureRankingSeasonsInitialized(db, realm);

  const active = await getActiveRankingSeason(db, realm);
  if (active) {
    await db
      .prepare(
        `UPDATE ranking_seasons
         SET ended_at = datetime('now'), ended_by_admin_id = ?
         WHERE id = ? AND ended_at IS NULL AND realm = ?`
      )
      .run(adminId, active.id, realm);
  }

  const seasonName = name?.trim() || (await nextDefaultSeasonName(db, realm));
  const insert = await db
    .prepare(
      `INSERT INTO ranking_seasons (name, started_at, started_by_admin_id, realm)
       VALUES (?, datetime('now'), ?, ?)`
    )
    .run(seasonName, adminId, realm);

  const created = await getRankingSeasonById(db, Number(insert.lastInsertRowid), realm);
  if (!created) throw new Error("Nie udało się utworzyć sezonu rankingu.");
  return created;
}

export async function endRankingSeason(
  db: AppDb,
  seasonId: number,
  adminId: number,
  realm: Realm = REALMS.ACADEMY
): Promise<RankingSeasonView> {
  await ensureRankingSeasonsInitialized(db, realm);
  const existing = await getRankingSeasonById(db, seasonId, realm);
  if (!existing) throw new Error("Nie znaleziono sezonu rankingu.");
  if (!existing.is_active) throw new Error("Ten sezon jest już zakończony.");

  await db
    .prepare(
      `UPDATE ranking_seasons
       SET ended_at = datetime('now'), ended_by_admin_id = ?
       WHERE id = ? AND ended_at IS NULL AND realm = ?`
    )
    .run(adminId, seasonId, realm);

  const updated = await getRankingSeasonById(db, seasonId, realm);
  if (!updated) throw new Error("Nie udało się zakończyć sezonu rankingu.");
  return updated;
}
