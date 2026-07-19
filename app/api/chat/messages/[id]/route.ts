import { NextResponse } from "next/server";
import { userCanAccessConversation } from "@/lib/admin-messages";
import { requireUser } from "@/lib/api-helpers";
import { getDb, logActivity } from "@/lib/db";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Uczestnik rozmowy usuwa dowolną wiadomość w wątku, do którego ma dostęp
 * (organizator lub DM). Admin korzysta z API panelu.
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
    .prepare(`SELECT id, conversation_key FROM admin_messages WHERE id = ?`)
    .get(messageId)) as { id: number; conversation_key: string | null } | undefined;

  if (!existing?.conversation_key) {
    return NextResponse.json({ error: "Nie znaleziono wiadomości" }, { status: 404 });
  }

  const key = existing.conversation_key;
  const me = gate.session.userId;
  if (!userCanAccessConversation(me, key)) {
    return NextResponse.json({ error: "Brak dostępu do rozmowy." }, { status: 403 });
  }

  await db.prepare("DELETE FROM admin_messages WHERE id = ?").run(messageId);
  await logActivity(me, `Usunięto wiadomość czatu #${messageId}`);

  return NextResponse.json({ ok: true });
}
