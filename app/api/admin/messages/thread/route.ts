import { NextResponse } from "next/server";
import { z } from "zod";
import { formatActivityTimePl } from "@/lib/activity-display";
import {
  backfillAdminMessageConversationKeys,
  conversationKeyForUser,
  displayNameFromParts,
  isAllowedChatAttachmentUrl,
  isDmConversationKey,
  markConversationReadForAdmin,
  parseConversationKey,
  type AdminMessageDirection,
} from "@/lib/admin-messages";
import { getAppSettings } from "@/lib/app-settings";
import { requireAdmin } from "@/lib/api-helpers";
import { CONTACT_ADMIN_RECIPIENT_KEYS, contactAdminRecipientLabel } from "@/lib/contact-admin-recipients";
import { getDb, logActivity } from "@/lib/db";
import { REALMS } from "@/lib/realm";

export const runtime = "nodejs";

const getSchema = z.object({
  conversation_key: z.string().trim().min(1).max(200),
});

export async function GET(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const url = new URL(req.url);
  const parsed = getSchema.safeParse({
    conversation_key: url.searchParams.get("conversation_key") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Brak conversation_key" }, { status: 400 });
  }

  const { conversation_key } = parsed.data;
  if (isDmConversationKey(conversation_key)) {
    return NextResponse.json({ error: "Brak dostępu do prywatnej rozmowy." }, { status: 403 });
  }

  const db = await getDb();
  await backfillAdminMessageConversationKeys(db);
  const appSettings = await getAppSettings(db);

  const rows = (await db
    .prepare(
      `SELECT id, body, status, created_at, recipient_key, sender_name,
              COALESCE(direction, 'inbound') AS direction, user_id, attachment_url
       FROM admin_messages
       WHERE conversation_key = ?
       ORDER BY created_at ASC, id ASC
       LIMIT 300`
    )
    .all(conversation_key)) as {
    id: number;
    body: string;
    status: string;
    created_at: string;
    recipient_key: string | null;
    sender_name: string;
    direction: AdminMessageDirection;
    user_id: number | null;
    attachment_url: string | null;
  }[];

  await markConversationReadForAdmin(db, conversation_key, gate.session.userId);

  const messages = rows.map((r) => ({
    id: r.id,
    body: r.body === "📷" && r.attachment_url ? "" : r.body,
    attachment_url: r.attachment_url,
    direction: r.direction,
    status: r.status,
    sender_name: r.sender_name,
    recipient_key: r.recipient_key,
    recipient_label: contactAdminRecipientLabel(r.recipient_key, appSettings),
    created_at: r.created_at,
    created_at_display: formatActivityTimePl(r.created_at),
    mine: r.direction === "outbound",
    user_id: r.user_id,
  }));

  const parsedKey = parseConversationKey(conversation_key);
  let peer: {
    user_id: number | null;
    display_name: string;
    player_alias: string | null;
  } | null = null;
  if (parsedKey?.kind === "user") {
    const u = (await db
      .prepare("SELECT id, first_name, last_name, player_alias FROM users WHERE id = ?")
      .get(parsedKey.userId)) as
      | { id: number; first_name: string; last_name: string; player_alias: string }
      | undefined;
    if (u) {
      peer = {
        user_id: u.id,
        display_name: displayNameFromParts(u.first_name, u.last_name) || u.player_alias,
        player_alias: u.player_alias,
      };
    }
  }

  return NextResponse.json({ messages, conversation_key, peer });
}

const replySchema = z
  .object({
    conversation_key: z.string().trim().min(1).max(200).optional(),
    target_user_id: z.coerce.number().int().positive().optional(),
    body: z.string().trim().optional().default(""),
    attachment_url: z.string().trim().max(800).optional().nullable(),
    recipient_key: z.enum(CONTACT_ADMIN_RECIPIENT_KEYS).optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.conversation_key && !data.target_user_id) {
      ctx.addIssue({
        code: "custom",
        message: "Podaj conversation_key lub target_user_id.",
        path: ["conversation_key"],
      });
    }
    const text = data.body.trim();
    const att = data.attachment_url?.trim() || "";
    if (!text && !att) {
      ctx.addIssue({ code: "custom", message: "Napisz wiadomość lub dołącz grafikę.", path: ["body"] });
    }
  });

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Nieprawidłowe JSON" }, { status: 400 });
  }

  const parsed = replySchema.safeParse(json);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const first =
      flat.fieldErrors.body?.[0] ??
      flat.fieldErrors.conversation_key?.[0] ??
      flat.fieldErrors.target_user_id?.[0] ??
      flat.formErrors[0] ??
      "Sprawdź wprowadzone dane.";
    return NextResponse.json({ error: first }, { status: 400 });
  }

  const { body, recipient_key, attachment_url, target_user_id } = parsed.data;
  let conversation_key = parsed.data.conversation_key?.trim() ?? "";

  const text = body.trim();
  const attachment = attachment_url?.trim() || null;
  if (attachment && !isAllowedChatAttachmentUrl(attachment)) {
    return NextResponse.json({ error: "Nieprawidłowy załącznik." }, { status: 400 });
  }

  if (target_user_id) {
    conversation_key = conversationKeyForUser(target_user_id);
  }

  if (isDmConversationKey(conversation_key)) {
    return NextResponse.json({ error: "Brak dostępu do prywatnej rozmowy." }, { status: 403 });
  }

  const db = await getDb();
  await backfillAdminMessageConversationKeys(db);

  const parsedKey = parseConversationKey(conversation_key);
  if (!parsedKey || (parsedKey.kind !== "user" && parsedKey.kind !== "guest")) {
    return NextResponse.json({ error: "Nieprawidłowy klucz rozmowy." }, { status: 400 });
  }

  const last = (await db
    .prepare(
      `SELECT user_id, sender_name, sender_email, recipient_key
       FROM admin_messages
       WHERE conversation_key = ?
       ORDER BY created_at DESC, id DESC
       LIMIT 1`
    )
    .get(conversation_key)) as
    | {
        user_id: number | null;
        sender_name: string;
        sender_email: string | null;
        recipient_key: string | null;
      }
    | undefined;

  let linkedUserId: number | null = last?.user_id ?? null;
  let peerName = last?.sender_name ?? "";
  let peerEmail: string | null = last?.sender_email ?? null;

  if (!last) {
    if (parsedKey.kind !== "user") {
      return NextResponse.json({ error: "Nie znaleziono rozmowy." }, { status: 404 });
    }
    const u = (await db
      .prepare(
        `SELECT id, first_name, last_name, player_alias, email
         FROM users
         WHERE id = ? AND COALESCE(realm, ?) = ? AND COALESCE(is_temporary, 0) = 0`
      )
      .get(parsedKey.userId, REALMS.ACADEMY, REALMS.ACADEMY)) as
      | {
          id: number;
          first_name: string;
          last_name: string;
          player_alias: string;
          email: string | null;
        }
      | undefined;
    if (!u) {
      return NextResponse.json({ error: "Nie znaleziono gracza." }, { status: 404 });
    }
    linkedUserId = u.id;
    peerName = displayNameFromParts(u.first_name, u.last_name) || u.player_alias;
    peerEmail = u.email?.trim() || null;
  }

  const adminRow = (await db
    .prepare("SELECT first_name, last_name, player_alias FROM users WHERE id = ?")
    .get(gate.session.userId)) as
    | { first_name: string; last_name: string; player_alias: string }
    | undefined;
  const adminName =
    [adminRow?.first_name, adminRow?.last_name].filter(Boolean).join(" ").trim() ||
    adminRow?.player_alias ||
    "Administrator";

  const finalRecipient = recipient_key ?? last?.recipient_key ?? "damian";

  const result = await db
    .prepare(
      `INSERT INTO admin_messages (
         user_id, sender_name, sender_email, recipient_key, body, status,
         direction, conversation_key, admin_user_id, attachment_url
       ) VALUES (?, ?, ?, ?, ?, 'unread', 'outbound', ?, ?, ?)`
    )
    .run(
      linkedUserId,
      adminName,
      peerEmail,
      finalRecipient,
      text || "📷",
      conversation_key,
      gate.session.userId,
      attachment
    );

  await markConversationReadForAdmin(db, conversation_key, gate.session.userId);
  await logActivity(gate.session.userId, `Wiadomość admina w czacie (${conversation_key})`);

  const appSettings = await getAppSettings(db);
  const createdAtRow = (await db
    .prepare("SELECT created_at FROM admin_messages WHERE id = ?")
    .get(Number(result.lastInsertRowid))) as { created_at: string } | undefined;
  const createdAt = createdAtRow?.created_at ?? new Date().toISOString().slice(0, 19).replace("T", " ");

  return NextResponse.json({
    ok: true,
    conversation_key,
    peer_name: peerName,
    message: {
      id: Number(result.lastInsertRowid),
      body: text,
      attachment_url: attachment,
      direction: "outbound" as const,
      status: "unread",
      sender_name: adminName,
      recipient_key: finalRecipient,
      recipient_label: contactAdminRecipientLabel(finalRecipient, appSettings),
      created_at: createdAt,
      created_at_display: formatActivityTimePl(createdAt),
      mine: true,
    },
  });
}

export async function PATCH(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const url = new URL(req.url);
  let conversationKey = url.searchParams.get("conversation_key")?.trim() ?? "";

  if (!conversationKey) {
    try {
      const json = (await req.json()) as { conversation_key?: string };
      conversationKey = json.conversation_key?.trim() ?? "";
    } catch {
      /* empty */
    }
  }

  if (!conversationKey) {
    return NextResponse.json({ error: "Brak conversation_key" }, { status: 400 });
  }
  if (isDmConversationKey(conversationKey)) {
    return NextResponse.json({ error: "Brak dostępu do prywatnej rozmowy." }, { status: 403 });
  }

  const db = await getDb();
  await markConversationReadForAdmin(db, conversationKey, gate.session.userId);
  return NextResponse.json({ ok: true });
}
