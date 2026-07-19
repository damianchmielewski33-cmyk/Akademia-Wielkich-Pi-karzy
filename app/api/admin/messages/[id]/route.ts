import { NextResponse } from "next/server";
import { markConversationReadForAdmin } from "@/lib/admin-messages";
import { requireAdmin } from "@/lib/api-helpers";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/** Oznacza pojedynczą wiadomość (i jej wątek) jako przeczytaną. */
export async function PATCH(_req: Request, ctx: Ctx) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  const messageId = Number(id);
  if (!Number.isFinite(messageId)) {
    return NextResponse.json({ error: "Nieprawidłowe id" }, { status: 400 });
  }

  const db = await getDb();
  const existing = (await db
    .prepare("SELECT id, status, conversation_key FROM admin_messages WHERE id = ?")
    .get(messageId)) as { id: number; status: string; conversation_key: string | null } | undefined;

  if (!existing) {
    return NextResponse.json({ error: "Nie znaleziono wiadomości" }, { status: 404 });
  }

  if (existing.conversation_key) {
    await markConversationReadForAdmin(db, existing.conversation_key, gate.session.userId);
    return NextResponse.json({ ok: true });
  }

  if (existing.status === "read") {
    return NextResponse.json({ ok: true, already_read: true });
  }

  await db
    .prepare(
      `UPDATE admin_messages
       SET status = 'read', read_at = datetime('now'), read_by_admin_id = ?
       WHERE id = ?`
    )
    .run(gate.session.userId, messageId);

  return NextResponse.json({ ok: true });
}
