import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api-helpers";
import { getDb, logActivity } from "@/lib/db";
import { createPartnerInvite, listPartnerInvites } from "@/lib/venue-partners";

export const runtime = "nodejs";

const postSchema = z.object({
  label: z.string().trim().max(120).optional(),
});

export async function GET() {
  const gate = await requireAdmin("matches");
  if (!gate.ok) return gate.response;
  const db = await getDb();
  const invites = await listPartnerInvites(db);
  return NextResponse.json({ invites });
}

export async function POST(req: Request) {
  const gate = await requireAdmin("matches");
  if (!gate.ok) return gate.response;
  const parsed = postSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Nieprawidłowe dane zaproszenia" }, { status: 400 });

  const db = await getDb();
  const invite = await createPartnerInvite(db, {
    adminUserId: gate.session.userId,
    label: parsed.data.label,
  });
  await logActivity(gate.session.userId, `Wygenerował link partnera obiektu #${invite.id}`);
  return NextResponse.json({
    invite,
    path: `/partner/zaproszenie/${invite.token}`,
  });
}
