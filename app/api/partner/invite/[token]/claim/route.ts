import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-helpers";
import { getDb, logActivity } from "@/lib/db";
import { claimPartnerInvite } from "@/lib/venue-partners";

export const runtime = "nodejs";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const gate = await requireUser();
  if (!gate.ok) return gate.response;
  const token = (await params).token?.trim() ?? "";
  if (!token) return NextResponse.json({ error: "Brak tokenu" }, { status: 400 });

  const db = await getDb();
  const result = await claimPartnerInvite(db, { token, userId: gate.session.userId });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });
  await logActivity(gate.session.userId, "Aktywował panel partnera obiektu");
  return NextResponse.json({ ok: true });
}
