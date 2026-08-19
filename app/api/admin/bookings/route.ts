import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api-helpers";
import { getDb, logActivity } from "@/lib/db";
import { createConfirmedBooking, listAdminBookings } from "@/lib/booking";
import { notifyBookingConfirmed } from "@/lib/booking-notifications";

export const runtime = "nodejs";

const createSchema = z.object({
  user_id: z.coerce.number().int().positive(),
  pitch_id: z.coerce.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_time: z.string().min(4).max(5),
  contact_name: z.string().trim().min(2).max(120),
  contact_phone: z.string().trim().min(6).max(40),
  note: z.string().trim().max(500).optional(),
});

export async function GET() {
  const gate = await requireAdmin("matches");
  if (!gate.ok) return gate.response;
  const db = await getDb();
  const bookings = await listAdminBookings(db);
  return NextResponse.json({ bookings });
}

export async function POST(req: Request) {
  const gate = await requireAdmin("matches");
  if (!gate.ok) return gate.response;
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Nieprawidłowe dane rezerwacji" }, { status: 400 });

  const db = await getDb();
  const result = await createConfirmedBooking(db, {
    userId: parsed.data.user_id,
    pitchId: parsed.data.pitch_id,
    date: parsed.data.date,
    startTime: parsed.data.start_time,
    contactName: parsed.data.contact_name,
    contactPhone: parsed.data.contact_phone,
    note: parsed.data.note,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });
  await logActivity(gate.session.userId, `Dodał ręcznie rezerwację #${result.booking.id}`);
  try {
    await notifyBookingConfirmed(result.booking.id);
  } catch (e) {
    console.error("[admin/bookings] notify failed", e);
  }
  return NextResponse.json({ booking: result.booking });
}
