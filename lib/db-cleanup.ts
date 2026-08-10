import fs from "fs";
import path from "path";
import { getDb } from "@/lib/db";
import { cleanupAbandonedHotpayAndGuests } from "@/lib/guest-cleanup";
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
  ad_impressions_deleted: number;
  cookie_consent_events_deleted: number;
  activity_log_deleted: number;
  transport_messages_deleted: number;
  admin_messages_deleted: number;
  orphan_profile_files_removed: number;
  orphan_chat_files_removed: number;
  abandoned_hotpay_cancelled: number;
  abandoned_carts_cancelled: number;
  abandoned_guests_removed: number;
  old_hotpay_purged: number;
  old_carts_purged: number;
  cutoff_iso: string;
  retention_days: number;
  transport_match_days: number;
  chat_message_days: number;
  abandoned_minutes: number;
  hotpay_retention_days: number;
};

/**
 * Usuwa stare rekordy (analityka, log aktywności, wiadomości czatu/transportu) oraz osierocone pliki.
 *
 * - `DATABASE_RETENTION_DAYS` — ile dni trzymać `page_views`, `ad_impressions` i `activity_log` (domyślnie 400).
 * - `TRANSPORT_MESSAGES_MATCH_DAYS` — wiadomości transportu dla meczów starszych niż N dni (domyślnie 180).
 * - `CHAT_MESSAGES_RETENTION_DAYS` — wiadomości `admin_messages` (czat admin/DM) starsze niż N dni (domyślnie 7).
 * - `HOTPAY_ABANDONED_MINUTES` — po ilu minutach anulować pending HotPay/koszyk i sprzątać porzuconych gości (domyślnie 60).
 * - `HOTPAY_RETENTION_DAYS` — ile dni trzymać anulowane/odrzucone HotPay i koszyki (domyślnie 90).
 */
export async function runDatabaseCleanup(): Promise<DatabaseCleanupResult> {
  const retentionDays = retentionDaysFromEnv("DATABASE_RETENTION_DAYS", 400);
  const transportMatchDays = retentionDaysFromEnv("TRANSPORT_MESSAGES_MATCH_DAYS", 180);
  const chatMessageDays = retentionDaysFromEnv("CHAT_MESSAGES_RETENTION_DAYS", 7, 1, 365);
  const abandonedMinutes = retentionDaysFromEnv("HOTPAY_ABANDONED_MINUTES", 60, 15, 7 * 24 * 60);
  const hotpayRetentionDays = retentionDaysFromEnv("HOTPAY_RETENTION_DAYS", 90, 14, 730);

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

  const adBefore = await countBefore(
    "SELECT COUNT(*) AS c FROM ad_impressions WHERE created_at < ?",
    cutoffIso
  );
  await db.prepare("DELETE FROM ad_impressions WHERE created_at < ?").run(cutoffIso);

  const consentBefore = await countBefore(
    "SELECT COUNT(*) AS c FROM cookie_consent_events WHERE created_at < ?",
    cutoffIso
  );
  await db.prepare("DELETE FROM cookie_consent_events WHERE created_at < ?").run(cutoffIso);

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

  const abandoned = await cleanupAbandonedHotpayAndGuests(abandonedMinutes, hotpayRetentionDays);

  return {
    page_views_deleted: pvBefore,
    ad_impressions_deleted: adBefore,
    cookie_consent_events_deleted: consentBefore,
    activity_log_deleted: alBefore,
    transport_messages_deleted: tmBefore,
    admin_messages_deleted: amBefore,
    orphan_profile_files_removed: orphanProfileFilesRemoved,
    orphan_chat_files_removed: orphanChatFilesRemoved,
    abandoned_hotpay_cancelled: abandoned.cancelled_payments,
    abandoned_carts_cancelled: abandoned.cancelled_carts,
    abandoned_guests_removed: abandoned.removed_guests,
    old_hotpay_purged: abandoned.purged_old_payments,
    old_carts_purged: abandoned.purged_old_carts,
    cutoff_iso: cutoffIso,
    retention_days: retentionDays,
    transport_match_days: transportMatchDays,
    chat_message_days: chatMessageDays,
    abandoned_minutes: abandonedMinutes,
    hotpay_retention_days: hotpayRetentionDays,
  };
}
