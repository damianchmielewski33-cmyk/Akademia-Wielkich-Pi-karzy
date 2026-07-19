import { NextResponse } from "next/server";
import { formatActivityTimePl } from "@/lib/activity-display";
import {
  backfillAdminMessageConversationKeys,
  chatMessagePreview,
  getUnreadAdminMessageCount,
  type AdminMessageDirection,
  type AdminMessageRow,
} from "@/lib/admin-messages";
import { getAppSettings } from "@/lib/app-settings";
import { contactAdminRecipientLabel } from "@/lib/contact-admin-recipients";
import { requireAdmin } from "@/lib/api-helpers";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

type ThreadAgg = {
  conversation_key: string;
  sender_name: string;
  user_id: number | null;
  user_alias: string | null;
  recipient_key: string | null;
  last_body: string;
  last_attachment_url: string | null;
  last_at: string;
  last_direction: AdminMessageDirection;
  unread_count: number;
};

export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const db = await getDb();
  await backfillAdminMessageConversationKeys(db);
  const appSettings = await getAppSettings(db);

  const rows = (await db
    .prepare(
      `SELECT m.id, m.user_id, m.sender_name, m.sender_email, m.recipient_key, m.body, m.status,
              m.read_at, m.read_by_admin_id, m.created_at,
              COALESCE(m.direction, 'inbound') AS direction,
              COALESCE(m.conversation_key, '') AS conversation_key,
              m.admin_user_id, m.attachment_url,
              u.player_alias AS user_alias,
              u.profile_photo_path AS profile_photo_path,
              u.first_name AS user_first_name,
              u.last_name AS user_last_name
       FROM admin_messages m
       LEFT JOIN users u ON u.id = m.user_id
       ORDER BY m.created_at DESC, m.id DESC
       LIMIT 500`
    )
    .all()) as (AdminMessageRow & {
    user_alias: string | null;
    profile_photo_path: string | null;
    user_first_name: string | null;
    user_last_name: string | null;
    direction: AdminMessageDirection;
    conversation_key: string;
    attachment_url: string | null;
  })[];

  const threadMap = new Map<string, ThreadAgg & {
    profile_photo_path: string | null;
    first_name: string | null;
    last_name: string | null;
  }>();
  for (const r of rows) {
    const key = r.conversation_key || `legacy:${r.id}`;
    const existing = threadMap.get(key);
    const isInboundUnread = r.direction === "inbound" && r.status === "unread";
    if (!existing) {
      threadMap.set(key, {
        conversation_key: key,
        sender_name: r.sender_name,
        user_id: r.user_id,
        user_alias: r.user_alias,
        recipient_key: r.recipient_key,
        last_body: r.body,
        last_attachment_url: r.attachment_url,
        last_at: r.created_at,
        last_direction: r.direction,
        unread_count: isInboundUnread ? 1 : 0,
        profile_photo_path: r.profile_photo_path,
        first_name: r.user_first_name,
        last_name: r.user_last_name,
      });
    } else {
      if (isInboundUnread) existing.unread_count += 1;
      // rows are newest-first; keep first as last_*
      if (!existing.user_alias && r.user_alias) existing.user_alias = r.user_alias;
      if (existing.user_id == null && r.user_id != null) existing.user_id = r.user_id;
      if (!existing.recipient_key && r.recipient_key) existing.recipient_key = r.recipient_key;
      if (!existing.profile_photo_path && r.profile_photo_path) {
        existing.profile_photo_path = r.profile_photo_path;
      }
      if (!existing.first_name && r.user_first_name) existing.first_name = r.user_first_name;
      if (!existing.last_name && r.user_last_name) existing.last_name = r.user_last_name;
      // Prefer a non-admin display name from inbound messages
      if (r.direction === "inbound" && r.sender_name) {
        existing.sender_name = r.sender_name;
      }
    }
  }

  const threads = [...threadMap.values()]
    .sort((a, b) => (a.last_at < b.last_at ? 1 : a.last_at > b.last_at ? -1 : 0))
    .map((t) => ({
      conversation_key: t.conversation_key,
      sender_name: t.sender_name,
      user_id: t.user_id,
      user_alias: t.user_alias,
      profile_photo_path: t.profile_photo_path,
      first_name: t.first_name,
      last_name: t.last_name,
      recipient_key: t.recipient_key,
      recipient_label: contactAdminRecipientLabel(t.recipient_key, appSettings),
      last_body: t.last_body,
      last_direction: t.last_direction,
      last_at: t.last_at,
      last_at_display: formatActivityTimePl(t.last_at),
      unread_count: t.unread_count,
      preview: chatMessagePreview(t.last_body === "📷" ? "" : t.last_body, t.last_attachment_url),
      is_guest: t.user_id == null || t.conversation_key.startsWith("guest:"),
    }));

  const unread_count = await getUnreadAdminMessageCount(db);

  return NextResponse.json({
    threads: threads.filter((t) => !t.conversation_key.startsWith("dm:")),
    unread_count,
  });
}
