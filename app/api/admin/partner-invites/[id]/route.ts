import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-helpers";
import { getDb, logActivity } from "@/lib/db";
import { revokePartnerInvite } from "@/lib/venue-partners";

export const runtime = "nodejs";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdmin("matches");
  if (!gate.ok) return gate.response;
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Nieprawidłowe zaproszenie" }, { status: 400 });
  }
  const db = await getDb();
  const ok = await revokePartnerInvite(db, id);
  if (!ok) return NextResponse.json({ error: "Nie znaleziono zaproszenia" }, { status: 404 });
  await logActivity(gate.session.userId, `Unieważnił link partnera #${id}`);
  return NextResponse.json({ ok: true });
}
