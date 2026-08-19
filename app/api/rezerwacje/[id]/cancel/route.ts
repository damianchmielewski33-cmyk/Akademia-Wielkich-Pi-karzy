import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-helpers";
import { getDb, logActivity } from "@/lib/db";
import { cancelUserBooking } from "@/lib/booking";
import { notifyBookingCancelled } from "@/lib/booking-notifications";

export const runtime = "nodejs";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireUser();
  if (!gate.ok) return gate.response;

  const bookingId = Number((await params).id);
  if (!Number.isInteger(bookingId) || bookingId <= 0) {
    return NextResponse.json({ error: "Nieprawidłowa rezerwacja" }, { status: 400 });
  }

  const db = await getDb();
  const result = await cancelUserBooking(db, { bookingId, userId: gate.session.userId });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }

  await logActivity(gate.session.userId, `Anulował rezerwację boiska #${bookingId}`);
  try {
    await notifyBookingCancelled(bookingId);
  } catch (e) {
    console.error("[rezerwacje/cancel] notify failed", e);
  }
  return NextResponse.json({ ok: true });
}
