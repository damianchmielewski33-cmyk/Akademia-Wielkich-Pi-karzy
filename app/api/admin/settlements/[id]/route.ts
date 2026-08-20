import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-helpers";
import { getDb, logActivity } from "@/lib/db";
import { markVenuePayoutPaid } from "@/lib/venue-settlements";

export const runtime = "nodejs";

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdmin("matches");
  if (!gate.ok) return gate.response;
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Nieprawidłowa wypłata" }, { status: 400 });
  }

  const db = await getDb();
  const result = await markVenuePayoutPaid(db, { payoutId: id, adminUserId: gate.session.userId });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });
  await logActivity(gate.session.userId, `Oznaczył wypłatę #${id} jako przelaną`);
  return NextResponse.json({ ok: true });
}
