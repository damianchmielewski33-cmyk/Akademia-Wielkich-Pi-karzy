import { NextResponse } from "next/server";
import { formatActivityTimePl } from "@/lib/activity-display";
import {
  backfillAdminMessageConversationKeys,
  chatMessagePreview,
  conversationKeyForUser,
  displayNameFromParts,
  getUnreadCountForPlayer,
  peerUserIdFromDmKey,
  type AdminMessageDirection,
} from "@/lib/admin-messages";
import { getAppSettings } from "@/lib/app-settings";
import { requireUser } from "@/lib/api-helpers";
import { contactAdminRecipientLabel } from "@/lib/contact-admin-recipients";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

type ThreadAgg = {
  conversation_key: string;
  title: string;
  subtitle: string | null;
  peer_user_id: number | null;
  kind: "organizer" | "dm";
  last_body: string;
  last_attachment_url: string | null;
  last_at: string;
  unread_count: number;
  recipient_key: string | null;
};

export async function GET() {
  const gate = await requireUser();
  if (!gate.ok) return gate.response;
  if (gate.session.isAdmin) {
    return NextResponse.json(
      { error: "Administrator korzysta z panelu / ikony wiadomości admina." },
      { status: 403 }
    );
  }

  const db = await getDb();
  await backfillAdminMessageConversationKeys(db);
  const appSettings = await getAppSettings(db);
  const me = gate.session.userId;
  const userKey = conversationKeyForUser(me);

  const rows = (await db
    .prepare(
      `SELECT m.body, m.status, m.created_at, m.recipient_key,
              COALESCE(m.direction, 'inbound') AS direction,
              COALESCE(m.conversation_key, '') AS conversation_key,
              m.attachment_url, m.user_id, m.sender_name
       FROM admin_messages m
       WHERE m.conversation_key = ?
          OR (
            m.conversation_key LIKE 'dm:%'
            AND (m.conversation_key LIKE ? OR m.conversation_key LIKE ?)
          )
       ORDER BY m.created_at DESC, m.id DESC
       LIMIT 800`
    )
    .all(userKey, `dm:${me}:%`, `dm:%:${me}`)) as {
    body: string;
    status: string;
    created_at: string;
    recipient_key: string | null;
    direction: AdminMessageDirection;
    conversation_key: string;
    attachment_url: string | null;
    user_id: number | null;
    sender_name: string;
  }[];

  const threadMap = new Map<string, ThreadAgg>();

  for (const r of rows) {
    const key = r.conversation_key;
    if (!key) continue;
    const existing = threadMap.get(key);
    const isDm = key.startsWith("dm:");
    let unreadInc = 0;
    if (isDm) {
      if (r.status === "unread" && r.user_id != null && r.user_id !== me) unreadInc = 1;
    } else if (r.direction === "outbound" && r.status === "unread") {
      unreadInc = 1;
    }

    if (!existing) {
      threadMap.set(key, {
        conversation_key: key,
        title: isDm ? r.sender_name : "Organizator",
        subtitle: null,
        peer_user_id: isDm ? peerUserIdFromDmKey(key, me) : null,
        kind: isDm ? "dm" : "organizer",
        last_body: r.body,
        last_attachment_url: r.attachment_url,
        last_at: r.created_at,
        unread_count: unreadInc,
        recipient_key: r.recipient_key,
      });
    } else {
      existing.unread_count += unreadInc;
      if (!existing.recipient_key && r.recipient_key) existing.recipient_key = r.recipient_key;
    }
  }

  // Uzupełnij tytuły DM o dane peera
  for (const t of threadMap.values()) {
    if (t.kind !== "dm" || t.peer_user_id == null) continue;
    const u = (await db
      .prepare("SELECT first_name, last_name, player_alias FROM users WHERE id = ?")
      .get(t.peer_user_id)) as
      | { first_name: string; last_name: string; player_alias: string }
      | undefined;
    if (u) {
      t.title = displayNameFromParts(u.first_name, u.last_name) || u.player_alias;
      t.subtitle = u.player_alias;
    }
  }

  // Zawsze pokaż wątek organizatora (nawet pusty)
  if (!threadMap.has(userKey)) {
    threadMap.set(userKey, {
      conversation_key: userKey,
      title: "Organizator",
      subtitle: "Napisz do Damiana lub Mateusza",
      peer_user_id: null,
      kind: "organizer",
      last_body: "",
      last_attachment_url: null,
      last_at: "",
      unread_count: 0,
      recipient_key: null,
    });
  } else {
    const org = threadMap.get(userKey)!;
    org.title = "Organizator";
    org.subtitle = contactAdminRecipientLabel(org.recipient_key, appSettings) || "Damian / Mateusz";
    org.kind = "organizer";
  }

  const threads = [...threadMap.values()]
    .sort((a, b) => {
      if (!a.last_at && b.last_at) return 1;
      if (a.last_at && !b.last_at) return -1;
      if (a.last_at === b.last_at) return 0;
      return a.last_at < b.last_at ? 1 : -1;
    })
    .map((t) => ({
      conversation_key: t.conversation_key,
      title: t.title,
      subtitle: t.subtitle,
      peer_user_id: t.peer_user_id,
      kind: t.kind,
      last_at: t.last_at || null,
      last_at_display: t.last_at ? formatActivityTimePl(t.last_at) : null,
      unread_count: t.unread_count,
      preview: chatMessagePreview(t.last_body === "📷" ? "" : t.last_body, t.last_attachment_url),
      recipient_key: t.recipient_key,
      recipient_label: contactAdminRecipientLabel(t.recipient_key, appSettings),
    }));

  const unread_count = await getUnreadCountForPlayer(db, me);

  return NextResponse.json({ threads, unread_count });
}
