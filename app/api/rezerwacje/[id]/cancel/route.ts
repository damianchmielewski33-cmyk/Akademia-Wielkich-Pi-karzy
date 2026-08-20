import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { getDb, logActivity } from "@/lib/db";
import { cancelUserBooking, userIdForBookingAccess } from "@/lib/booking";
import { requireBookingMarketplace } from "@/lib/booking-marketplace";
import { readBookingAccessToken } from "@/lib/booking-access";
import { notifyBookingCancelled } from "@/lib/booking-notifications";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const marketplace = await requireBookingMarketplace();
  if (!marketplace.ok) return marketplace.response;
  const session = await getServerSession();
  let userId: number | null =
    session && !session.needsPinSetup && !session.pinChangePending ? session.userId : null;
  if (!userId) {
    const token = readBookingAccessToken(req);
    if (token) {
      const db = await getDb();
      userId = await userIdForBookingAccess(db, token);
    }
  }
  if (!userId) {
    return NextResponse.json({ error: "Nie znaleziono rezerwacji do anulowania." }, { status: 401 });
  }

  const bookingId = Number((await params).id);
  if (!Number.isInteger(bookingId) || bookingId <= 0) {
    return NextResponse.json({ error: "Nieprawidłowa rezerwacja" }, { status: 400 });
  }

  const db = await getDb();
  const result = await cancelUserBooking(db, { bookingId, userId });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }

  await logActivity(userId, `Anulował rezerwację boiska #${bookingId}`);
  try {
    await notifyBookingCancelled(bookingId);
  } catch (e) {
    console.error("[rezerwacje/cancel] notify failed", e);
  }
  return NextResponse.json({ ok: true });
}
