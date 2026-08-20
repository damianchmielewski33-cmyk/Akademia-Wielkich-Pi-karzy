import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api-helpers";
import { getDb, logActivity } from "@/lib/db";
import { notifyBookingCancelled, notifyBookingConfirmed } from "@/lib/booking-notifications";
import { bookingIsInPayout } from "@/lib/venue-settlements";

export const runtime = "nodejs";

const patchSchema = z.object({
  status: z.enum(["pending", "confirmed", "cancelled", "expired"]),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdmin("matches");
  if (!gate.ok) return gate.response;
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Nieprawidłowa rezerwacja" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Nieprawidłowy status" }, { status: 400 });

  const db = await getDb();
  if (parsed.data.status === "cancelled" && (await bookingIsInPayout(db, id))) {
    return NextResponse.json(
      { error: "Ta rezerwacja jest już w wypłacie — nie można jej anulować." },
      { status: 409 }
    );
  }
  const result = await db
    .prepare(
      `UPDATE bookings
       SET status = ?, expires_at = CASE WHEN ? = 'confirmed' THEN NULL ELSE expires_at END, updated_at = datetime('now')
       WHERE id = ?`
    )
    .run(parsed.data.status, parsed.data.status, id);
  if (result.changes === 0) return NextResponse.json({ error: "Nie znaleziono rezerwacji" }, { status: 404 });

  await logActivity(gate.session.userId, `Zmienił status rezerwacji #${id} na ${parsed.data.status}`);
  try {
    if (parsed.data.status === "confirmed") await notifyBookingConfirmed(id);
    if (parsed.data.status === "cancelled") await notifyBookingCancelled(id);
  } catch (e) {
    console.error("[admin/bookings] notify failed", e);
  }
  return NextResponse.json({ ok: true });
}
