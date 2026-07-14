import { NextResponse } from "next/server";
import { formatActivityTimePl } from "@/lib/activity-display";
import { getAppSettings } from "@/lib/app-settings";
import { contactAdminRecipientLabel } from "@/lib/contact-admin-recipients";
import { getUnreadAdminMessageCount, type AdminMessageRow } from "@/lib/admin-messages";
import { requireAdmin } from "@/lib/api-helpers";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const db = await getDb();
  const appSettings = await getAppSettings(db);
  const rows = (await db
    .prepare(
      `SELECT m.id, m.user_id, m.sender_name, m.sender_email, m.recipient_key, m.body, m.status,
              m.read_at, m.read_by_admin_id, m.created_at,
              u.player_alias AS user_alias
       FROM admin_messages m
       LEFT JOIN users u ON u.id = m.user_id
       ORDER BY m.created_at DESC
       LIMIT 200`
    )
    .all()) as (AdminMessageRow & { user_alias: string | null })[];

  const unread_count = await getUnreadAdminMessageCount(db);

  const messages = rows.map((r) => ({
    id: r.id,
    user_id: r.user_id,
    sender_name: r.sender_name,
    sender_email: r.sender_email,
    recipient_key: r.recipient_key,
    recipient_label: contactAdminRecipientLabel(r.recipient_key, appSettings),
    body: r.body,
    status: r.status,
    read_at: r.read_at,
    created_at: r.created_at,
    created_at_display: formatActivityTimePl(r.created_at),
    user_alias: r.user_alias,
    preview: r.body.length > 120 ? `${r.body.slice(0, 117).trimEnd()}…` : r.body,
  }));

  return NextResponse.json({ messages, unread_count });
}
