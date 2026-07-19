import type { AppDb } from "@/lib/db";
import { REALMS } from "@/lib/realm";

export type AdminMessageStatus = "unread" | "read";
export type AdminMessageDirection = "inbound" | "outbound";

export type AdminMessageRow = {
  id: number;
  user_id: number | null;
  sender_name: string;
  sender_email: string | null;
  recipient_key: string | null;
  body: string;
  status: AdminMessageStatus;
  read_at: string | null;
  read_by_admin_id: number | null;
  created_at: string;
  direction: AdminMessageDirection | null;
  conversation_key: string | null;
  admin_user_id: number | null;
};

/** Normalizuje imię i nazwisko do porównań (bez rozróżniania wielkości liter). */
export function normalizeContactName(input: string): string {
  return input.trim().replace(/\s+/g, " ").normalize("NFC").toLowerCase();
}

export function conversationKeyForUser(userId: number): string {
  return `user:${userId}`;
}

export function conversationKeyForGuest(normalizedName: string): string {
  return `guest:${normalizedName}`;
}

export function displayNameFromParts(firstName: string, lastName: string): string {
  return `${firstName.trim()} ${lastName.trim()}`.replace(/\s+/g, " ").trim();
}

/**
 * Sprawdza, czy imię i nazwisko odpowiada zawodnikowi widocznemu na stronie (lista piłkarzy akademii).
 */
export async function findRosterPlayerByFullName(
  db: AppDb,
  fullName: string
): Promise<{ id: number; first_name: string; last_name: string; display_name: string } | null> {
  const needle = normalizeContactName(fullName);
  if (needle.length < 3 || !needle.includes(" ")) return null;

  const rows = (await db
    .prepare(
      `SELECT id, first_name, last_name
       FROM users
       WHERE realm = ? AND COALESCE(is_admin, 0) = 0`
    )
    .all(REALMS.ACADEMY)) as { id: number; first_name: string; last_name: string }[];

  for (const row of rows) {
    const display = displayNameFromParts(row.first_name, row.last_name);
    if (normalizeContactName(display) === needle) {
      return { ...row, display_name: display };
    }
  }
  return null;
}

export async function getUnreadAdminMessageCount(db: AppDb): Promise<number> {
  const row = (await db
    .prepare(
      `SELECT COUNT(*) AS c FROM admin_messages
       WHERE status = 'unread' AND COALESCE(direction, 'inbound') = 'inbound'`
    )
    .get()) as { c: number };
  return row.c;
}

export async function getUnreadUserReplyCount(db: AppDb, conversationKey: string): Promise<number> {
  const row = (await db
    .prepare(
      `SELECT COUNT(*) AS c FROM admin_messages
       WHERE conversation_key = ?
         AND COALESCE(direction, 'inbound') = 'outbound'
         AND status = 'unread'`
    )
    .get(conversationKey)) as { c: number };
  return row.c;
}

export async function markConversationReadForAdmin(db: AppDb, conversationKey: string, adminUserId: number) {
  await db
    .prepare(
      `UPDATE admin_messages
       SET status = 'read', read_at = datetime('now'), read_by_admin_id = ?
       WHERE conversation_key = ?
         AND COALESCE(direction, 'inbound') = 'inbound'
         AND status = 'unread'`
    )
    .run(adminUserId, conversationKey);
}

export async function markConversationReadForUser(db: AppDb, conversationKey: string) {
  await db
    .prepare(
      `UPDATE admin_messages
       SET status = 'read', read_at = datetime('now')
       WHERE conversation_key = ?
         AND COALESCE(direction, 'inbound') = 'outbound'
         AND status = 'unread'`
    )
    .run(conversationKey);
}

/** Uzupełnia conversation_key / direction w starych wierszach (jednorazowo przy migracji). */
export async function backfillAdminMessageConversationKeys(db: AppDb) {
  const rows = (await db
    .prepare(
      `SELECT id, user_id, sender_name, conversation_key
       FROM admin_messages
       WHERE conversation_key IS NULL OR TRIM(conversation_key) = ''`
    )
    .all()) as { id: number; user_id: number | null; sender_name: string; conversation_key: string | null }[];

  for (const row of rows) {
    const key =
      row.user_id != null
        ? conversationKeyForUser(row.user_id)
        : conversationKeyForGuest(normalizeContactName(row.sender_name));
    await db
      .prepare(
        `UPDATE admin_messages
         SET conversation_key = ?, direction = COALESCE(direction, 'inbound')
         WHERE id = ?`
      )
      .run(key, row.id);
  }
}
