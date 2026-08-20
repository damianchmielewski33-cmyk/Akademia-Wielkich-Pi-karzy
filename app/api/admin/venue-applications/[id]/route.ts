import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api-helpers";
import { getDb, logActivity } from "@/lib/db";
import { approveVenueApplication, rejectVenueApplication } from "@/lib/venue-applications";

export const runtime = "nodejs";

const patchSchema = z.object({
  action: z.enum(["approve", "reject"]),
  publish: z.boolean().optional(),
  admin_note: z.string().trim().max(400).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin("matches");
  if (!gate.ok) return gate.response;
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Nieprawidłowe zgłoszenie" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Nieprawidłowa decyzja" }, { status: 400 });

  const db = await getDb();
  if (parsed.data.action === "reject") {
    const result = await rejectVenueApplication(db, {
      applicationId: id,
      adminUserId: gate.session.userId,
      adminNote: parsed.data.admin_note,
    });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });
    await logActivity(gate.session.userId, `Odrzucił zgłoszenie hali #${id}`);
    return NextResponse.json({ ok: true });
  }

  const result = await approveVenueApplication(db, {
    applicationId: id,
    adminUserId: gate.session.userId,
    publish: parsed.data.publish === true,
    adminNote: parsed.data.admin_note,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });
  await logActivity(
    gate.session.userId,
    `Zaakceptował zgłoszenie hali #${id} → obiekt #${result.venueId}`
  );
  return NextResponse.json({ ok: true, venue_id: result.venueId, partner_user_id: result.partnerUserId });
}
