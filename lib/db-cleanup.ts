import fs from "fs";
import path from "path";
import { getDb } from "@/lib/db";
import { profileUploadsDir, resolveProfilePhotoAbsolute } from "@/lib/runtime-paths";

function clampInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

function retentionDaysFromEnv(key: string, fallback: number): number {
  const raw = process.env[key]?.trim();
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return clampInt(n, 30, 3650);
}

export type DatabaseCleanupResult = {
  page_views_deleted: number;
  activity_log_deleted: number;
  transport_messages_deleted: number;
  orphan_profile_files_removed: number;
  cutoff_iso: string;
  retention_days: number;
  transport_match_days: number;
};

/**
 * Usuwa stare rekordy (analityka, log aktywności, stare wiadomości transportu) oraz osierocone pliki zdjęć profilowych.
 * Domyślnie zostawia ok. rok historii — dopasuj zmienne środowiskowe w produkcji.
 *
 * - `DATABASE_RETENTION_DAYS` — ile dni trzymać `page_views` i `activity_log` (domyślnie 400, ~13 mies. przy cronie miesięcznym).
 * - `TRANSPORT_MESSAGES_MATCH_DAYS` — usuwa wiadomości transportu dla meczów, których `match_date` jest starszy niż N dni (domyślnie 180).
 */
export async function runDatabaseCleanup(): Promise<DatabaseCleanupResult> {
  const retentionDays = retentionDaysFromEnv("DATABASE_RETENTION_DAYS", 400);
  const transportMatchDays = retentionDaysFromEnv("TRANSPORT_MESSAGES_MATCH_DAYS", 180);

  const cutoffMs = Date.now() - retentionDays * 86_400_000;
  const cutoffIso = new Date(cutoffMs).toISOString();
  const dateModifier = `-${retentionDays} days`;
  const transportModifier = `-${transportMatchDays} days`;

  const db = await getDb();

  const countBefore = async (sql: string, ...params: unknown[]) => {
    const row = (await db.prepare(sql).get(...params)) as { c: number } | undefined;
    return row?.c ?? 0;
  };

  const pvBefore = await countBefore(
    "SELECT COUNT(*) AS c FROM page_views WHERE created_at < ?",
    cutoffIso
  );
  await db.prepare("DELETE FROM page_views WHERE created_at < ?").run(cutoffIso);

  const alBefore = await countBefore(
    "SELECT COUNT(*) AS c FROM activity_log WHERE timestamp < datetime('now', ?)",
    dateModifier
  );
  await db.prepare("DELETE FROM activity_log WHERE timestamp < datetime('now', ?)").run(dateModifier);

  const tmBefore = await countBefore(
    `SELECT COUNT(*) AS c FROM match_transport_messages WHERE match_id IN (
       SELECT id FROM matches WHERE match_date < date('now', ?)
     )`,
    transportModifier
  );
  await db
    .prepare(
      `DELETE FROM match_transport_messages WHERE match_id IN (
         SELECT id FROM matches WHERE match_date < date('now', ?)
       )`
    )
    .run(transportModifier);

  let orphanProfileFilesRemoved = 0;
  const dir = profileUploadsDir();
  try {
    const names = fs.readdirSync(dir);
    const referenced = new Set<string>();
    const rows = (await db.prepare("SELECT profile_photo_path FROM users WHERE profile_photo_path IS NOT NULL").all()) as {
      profile_photo_path: string;
    }[];
    for (const r of rows) {
      const abs = resolveProfilePhotoAbsolute(r.profile_photo_path);
      if (abs) referenced.add(path.basename(abs));
    }
    const dirResolved = path.resolve(dir);
    for (const name of names) {
      if (referenced.has(name)) continue;
      const abs = path.join(dir, name);
      const resolved = path.resolve(abs);
      if (!resolved.startsWith(dirResolved + path.sep)) continue;
      try {
        fs.unlinkSync(resolved);
        orphanProfileFilesRemoved += 1;
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* brak katalogu lub odczytu — pomijamy */
  }

  return {
    page_views_deleted: pvBefore,
    activity_log_deleted: alBefore,
    transport_messages_deleted: tmBefore,
    orphan_profile_files_removed: orphanProfileFilesRemoved,
    cutoff_iso: cutoffIso,
    retention_days: retentionDays,
    transport_match_days: transportMatchDays,
  };
}
