import fs from "fs";
import path from "path";
import { getDb } from "@/lib/db";
import {
  chatUploadsDir,
  profileUploadsDir,
  resolveChatAttachmentAbsolute,
  resolveProfilePhotoAbsolute,
} from "@/lib/runtime-paths";

function clampInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

function retentionDaysFromEnv(key: string, fallback: number, min = 30, max = 3650): number {
  const raw = process.env[key]?.trim();
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return clampInt(n, min, max);
}

export type DatabaseCleanupResult = {
  page_views_deleted: number;
  activity_log_deleted: number;
  transport_messages_deleted: number;
  admin_messages_deleted: number;
  orphan_profile_files_removed: number;
  orphan_chat_files_removed: number;
  cutoff_iso: string;
  retention_days: number;
  transport_match_days: number;
  chat_message_days: number;
};

/**
 * Usuwa stare rekordy (analityka, log aktywności, wiadomości czatu/transportu) oraz osierocone pliki.
 *
 * - `DATABASE_RETENTION_DAYS` — ile dni trzymać `page_views` i `activity_log` (domyślnie 400).
 * - `TRANSPORT_MESSAGES_MATCH_DAYS` — wiadomości transportu dla meczów starszych niż N dni (domyślnie 180).
 * - `CHAT_MESSAGES_RETENTION_DAYS` — wiadomości `admin_messages` (czat admin/DM) starsze niż N dni (domyślnie 7).
 */
export async function runDatabaseCleanup(): Promise<DatabaseCleanupResult> {
  const retentionDays = retentionDaysFromEnv("DATABASE_RETENTION_DAYS", 400);
  const transportMatchDays = retentionDaysFromEnv("TRANSPORT_MESSAGES_MATCH_DAYS", 180);
  const chatMessageDays = retentionDaysFromEnv("CHAT_MESSAGES_RETENTION_DAYS", 7, 1, 365);

  const cutoffMs = Date.now() - retentionDays * 86_400_000;
  const cutoffIso = new Date(cutoffMs).toISOString();
  const dateModifier = `-${retentionDays} days`;
  const transportModifier = `-${transportMatchDays} days`;
  const chatModifier = `-${chatMessageDays} days`;

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

  const expiredAttachments = (await db
    .prepare(
      `SELECT attachment_url FROM admin_messages
       WHERE created_at < datetime('now', ?)
         AND attachment_url IS NOT NULL
         AND TRIM(attachment_url) != ''`
    )
    .all(chatModifier)) as { attachment_url: string }[];

  const amBefore = await countBefore(
    "SELECT COUNT(*) AS c FROM admin_messages WHERE created_at < datetime('now', ?)",
    chatModifier
  );
  await db
    .prepare("DELETE FROM admin_messages WHERE created_at < datetime('now', ?)")
    .run(chatModifier);

  for (const row of expiredAttachments) {
    const abs = resolveChatAttachmentAbsolute(row.attachment_url);
    if (!abs) continue;
    try {
      fs.unlinkSync(abs);
    } catch {
      /* plik już usunięty lub niedostępny */
    }
  }

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

  let orphanChatFilesRemoved = 0;
  const chatDir = chatUploadsDir();
  try {
    const names = fs.readdirSync(chatDir);
    const referenced = new Set<string>();
    const rows = (await db
      .prepare(
        `SELECT attachment_url FROM admin_messages
         WHERE attachment_url IS NOT NULL AND TRIM(attachment_url) != ''`
      )
      .all()) as { attachment_url: string }[];
    for (const r of rows) {
      const abs = resolveChatAttachmentAbsolute(r.attachment_url);
      if (abs) referenced.add(path.basename(abs));
    }
    const dirResolved = path.resolve(chatDir);
    for (const name of names) {
      if (referenced.has(name)) continue;
      const abs = path.join(chatDir, name);
      const resolved = path.resolve(abs);
      if (!resolved.startsWith(dirResolved + path.sep)) continue;
      try {
        fs.unlinkSync(resolved);
        orphanChatFilesRemoved += 1;
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* brak katalogu — pomijamy */
  }

  return {
    page_views_deleted: pvBefore,
    activity_log_deleted: alBefore,
    transport_messages_deleted: tmBefore,
    admin_messages_deleted: amBefore,
    orphan_profile_files_removed: orphanProfileFilesRemoved,
    orphan_chat_files_removed: orphanChatFilesRemoved,
    cutoff_iso: cutoffIso,
    retention_days: retentionDays,
    transport_match_days: transportMatchDays,
    chat_message_days: chatMessageDays,
  };
}
