import { NextResponse } from "next/server";
import {
  isDmConversationKey,
  parseConversationKey,
  userCanAccessConversation,
} from "@/lib/admin-messages";
import { requireUser } from "@/lib/api-helpers";
import { getDb, logActivity } from "@/lib/db";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Gracz usuwa własną wiadomość w wątku, do którego ma dostęp
 * (organizator lub DM).
 */
export async function DELETE(_req: Request, ctx: Ctx) {
  const gate = await requireUser();
  if (!gate.ok) return gate.response;
  if (gate.session.isAdmin) {
    return NextResponse.json(
      { error: "Administrator usuwa wiadomości z panelu / ikony admina." },
      { status: 403 }
    );
  }

  const { id } = await ctx.params;
  const messageId = Number(id);
  if (!Number.isFinite(messageId)) {
    return NextResponse.json({ error: "Nieprawidłowe id" }, { status: 400 });
  }

  const db = await getDb();
  const existing = (await db
    .prepare(
      `SELECT id, user_id, conversation_key, COALESCE(direction, 'inbound') AS direction
       FROM admin_messages WHERE id = ?`
    )
    .get(messageId)) as
    | {
        id: number;
        user_id: number | null;
        conversation_key: string | null;
        direction: string;
      }
    | undefined;

  if (!existing?.conversation_key) {
    return NextResponse.json({ error: "Nie znaleziono wiadomości" }, { status: 404 });
  }

  const key = existing.conversation_key;
  const me = gate.session.userId;
  if (!userCanAccessConversation(me, key)) {
    return NextResponse.json({ error: "Brak dostępu do rozmowy." }, { status: 403 });
  }

  const parsed = parseConversationKey(key);
  const isOwnDm = isDmConversationKey(key) && existing.user_id === me;
  const isOwnToOrganizer =
    parsed?.kind === "user" &&
    parsed.userId === me &&
    existing.direction === "inbound" &&
    existing.user_id === me;

  if (!isOwnDm && !isOwnToOrganizer) {
    return NextResponse.json({ error: "Możesz usunąć tylko własne wiadomości." }, { status: 403 });
  }

  await db.prepare("DELETE FROM admin_messages WHERE id = ?").run(messageId);
  await logActivity(me, `Usunięto własną wiadomość czatu #${messageId}`);

  return NextResponse.json({ ok: true });
}
