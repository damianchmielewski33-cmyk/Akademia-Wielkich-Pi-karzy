import type { AppSettings } from "@/lib/app-settings";
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
  attachment_url: string | null;
};

const DIACRITICS_MAP: Record<string, string> = {
  ą: "a",
  ć: "c",
  ę: "e",
  ł: "l",
  ń: "n",
  ó: "o",
  ś: "s",
  ź: "z",
  ż: "z",
};

/** Normalizuje imię i nazwisko do porównań (bez wielkości liter i polskich znaków). */
export function normalizeContactName(input: string): string {
  const base = input
    .trim()
    .replace(/\s+/g, " ")
    .normalize("NFC")
    .toLowerCase();
  return base.replace(/[ąćęłńóśźż]/g, (ch) => DIACRITICS_MAP[ch] ?? ch);
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

function nameCandidatesMatch(needle: string, ...candidates: Array<string | null | undefined>): boolean {
  for (const c of candidates) {
    if (!c) continue;
    if (normalizeContactName(c) === needle) return true;
  }
  return false;
}

/**
 * Sprawdza, czy imię i nazwisko odpowiada osobie widocznej na stronie
 * (lista Piłkarze — ta sama reguła co /pilkarze — albo organizatorzy z Kontakt).
 */
export async function findRosterPlayerByFullName(
  db: AppDb,
  fullName: string,
  organizerNames?: string[]
): Promise<{ id: number | null; first_name: string; last_name: string; display_name: string } | null> {
  const needle = normalizeContactName(fullName);
  if (needle.length < 3) return null;

  const rows = (await db
    .prepare(
      `SELECT id, first_name, last_name, player_alias
       FROM users
       WHERE COALESCE(realm, ?) = ? AND COALESCE(is_temporary, 0) = 0`
    )
    .all(REALMS.ACADEMY, REALMS.ACADEMY)) as {
    id: number;
    first_name: string;
    last_name: string;
    player_alias: string;
  }[];

  for (const row of rows) {
    const display = displayNameFromParts(row.first_name, row.last_name);
    const reversed = displayNameFromParts(row.last_name, row.first_name);
    if (
      nameCandidatesMatch(
        needle,
        display,
        reversed,
        row.player_alias,
        // „Imię Pseudonim Nazwisko” albo sam nick z listy
        `${row.first_name} ${row.player_alias}`.trim(),
        `${row.player_alias} ${row.last_name}`.trim()
      )
    ) {
      return { ...row, display_name: display || row.player_alias };
    }
  }

  for (const org of organizerNames ?? []) {
    const label = org.trim();
    if (!label) continue;
    if (nameCandidatesMatch(needle, label)) {
      const parts = label.split(/\s+/);
      const first = parts[0] ?? label;
      const last = parts.slice(1).join(" ") || first;
      return { id: null, first_name: first, last_name: last, display_name: label };
    }
  }

  return null;
}

export function organizerNamesFromSettings(settings: AppSettings): string[] {
  return [settings.organizer_damian_name, settings.organizer_mateusz_name].filter(Boolean);
}

/** Dozwolone URL-e załączników czatu (lokalne lub Vercel Blob). */
export function isAllowedChatAttachmentUrl(url: string): boolean {
  const t = url.trim();
  if (!t || t.length > 800) return false;
  if (t.startsWith("/uploads/chat/") || t.startsWith("/api/uploads/chat/")) {
    const name = t.replace(/^\/(api\/)?uploads\/chat\//, "");
    return Boolean(name) && !name.includes("..") && !name.includes("/") && !name.includes("\\");
  }
  try {
    const u = new URL(t);
    return u.protocol === "https:" && u.hostname.endsWith(".public.blob.vercel-storage.com");
  } catch {
    return false;
  }
}

export function chatMessagePreview(body: string, attachmentUrl: string | null | undefined): string {
  const text = body.trim();
  if (text) return text.length > 120 ? `${text.slice(0, 117).trimEnd()}…` : text;
  if (attachmentUrl) return "📷 Zdjęcie";
  return "";
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
