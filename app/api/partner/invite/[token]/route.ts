import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getPartnerInviteByToken, inviteStatus } from "@/lib/venue-partners";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const token = (await params).token?.trim() ?? "";
  if (!token) return NextResponse.json({ error: "Brak tokenu" }, { status: 400 });
  const db = await getDb();
  const invite = await getPartnerInviteByToken(db, token);
  if (!invite) return NextResponse.json({ error: "Nie znaleziono zaproszenia" }, { status: 404 });
  const status = inviteStatus(invite);
  return NextResponse.json({
    label: invite.label,
    status,
    expires_at: invite.expires_at,
  });
}
