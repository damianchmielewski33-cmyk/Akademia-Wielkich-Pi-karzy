import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-helpers";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

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
    .prepare("SELECT id, status FROM admin_messages WHERE id = ?")
    .get(messageId)) as { id: number; status: string } | undefined;

  if (!existing) {
    return NextResponse.json({ error: "Nie znaleziono wiadomości" }, { status: 404 });
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
