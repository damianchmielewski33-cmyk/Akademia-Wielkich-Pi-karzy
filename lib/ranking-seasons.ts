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
  try {
    await db.prepare("UPDATE match_stats SET season_id = ? WHERE season_id IS NULL").run(row.id);
  } catch (e) {
    console.warn("[ranking-seasons] backfill match_stats:", e);
  }
  try {
    await db
      .prepare("UPDATE standalone_match_stats SET season_id = ? WHERE season_id IS NULL")
      .run(row.id);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (!/no such table|nie ma takiej tabeli/i.test(msg)) {
      console.warn("[ranking-seasons] backfill standalone_match_stats:", e);
    }
  }
}

/** Pierwszy start: jeden aktywny sezon + przypisanie dotychczasowych statystyk. */
export async function ensureRankingSeasonsInitialized(
  db: AppDb,
  realm: Realm = REALMS.ACADEMY
): Promise<void> {
  let count: { c: number };
  try {
    count = (await db
      .prepare("SELECT COUNT(*) AS c FROM ranking_seasons WHERE realm = ?")
      .get(realm)) as { c: number };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/no such table|nie ma takiej tabeli/i.test(msg)) {
      console.warn("[ranking-seasons] brak tabeli ranking_seasons — pomijam init");
      return;
    }
    throw e;
  }
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
    try {
      await db.prepare("UPDATE match_stats SET season_id = ? WHERE season_id IS NULL").run(seasonId);
    } catch (e) {
      console.warn("[ranking-seasons] init match_stats:", e);
    }
    try {
      await db.prepare("UPDATE standalone_match_stats SET season_id = ? WHERE season_id IS NULL").run(seasonId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!/no such table|nie ma takiej tabeli/i.test(msg)) {
        console.warn("[ranking-seasons] init standalone_match_stats:", e);
      }
    }
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
  const rows = (await db
    .prepare("SELECT name FROM ranking_seasons WHERE realm = ?")
    .all(realm)) as { name: string }[];
  const totalCount = rows.length;
  const numbered = rows
    .map((row) => {
      const m = /^Sezon\s+(\d+)$/i.exec(row.name.trim());
      return m ? Number(m[1]) : null;
    })
    .filter((value): value is number => Number.isFinite(value));
  const nextNumber = Math.max(totalCount, numbered.length > 0 ? Math.max(...numbered) : 0) + 1;
  return `Sezon ${nextNumber}`;
}

async function seasonNameExists(db: AppDb, name: string, realm: Realm): Promise<boolean> {
  const row = (await db
    .prepare("SELECT 1 AS ok FROM ranking_seasons WHERE realm = ? AND lower(name) = lower(?) LIMIT 1")
    .get(realm, name)) as { ok: number } | undefined;
  return Boolean(row?.ok);
}

export async function startRankingSeason(
  db: AppDb,
  adminId: number,
  name?: string,
  realm: Realm = REALMS.ACADEMY
): Promise<RankingSeasonView> {
  const run = async (tx: AppDb): Promise<number> => {
    await ensureRankingSeasonsInitialized(tx, realm);

    const active = await getActiveRankingSeason(tx, realm);
    if (active) {
      await tx
        .prepare(
          `UPDATE ranking_seasons
           SET ended_at = datetime('now'), ended_by_admin_id = ?
           WHERE id = ? AND ended_at IS NULL AND realm = ?`
        )
        .run(adminId, active.id, realm);
    }

    const requestedName = name?.trim();
    const seasonName = requestedName || (await nextDefaultSeasonName(tx, realm));
    if (await seasonNameExists(tx, seasonName, realm)) {
      throw new Error(`Sezon o nazwie "${seasonName}" już istnieje.`);
    }

    const insert = await tx
      .prepare(
        `INSERT INTO ranking_seasons (name, started_at, started_by_admin_id, realm)
         VALUES (?, datetime('now'), ?, ?)`
      )
      .run(seasonName, adminId, realm);
    return Number(insert.lastInsertRowid);
  };

  const createdId = db.transaction ? await db.transaction(run) : await run(db);
  const created = await getRankingSeasonById(db, createdId, realm);
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
