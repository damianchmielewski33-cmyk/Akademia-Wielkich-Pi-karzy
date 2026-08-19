import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api-helpers";
import { getDb, logActivity } from "@/lib/db";
import { createBookingHold, listBookingsForUser } from "@/lib/booking";

export const runtime = "nodejs";

const postSchema = z.object({
  pitch_id: z.coerce.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_time: z.string().min(4).max(5),
  contact_name: z.string().trim().min(2).max(120),
  contact_phone: z.string().trim().min(6).max(40),
  note: z.string().trim().max(500).optional(),
});

export async function GET() {
  const gate = await requireUser();
  if (!gate.ok) return gate.response;
  const db = await getDb();
  const bookings = await listBookingsForUser(db, gate.session.userId);
  return NextResponse.json({ bookings });
}

export async function POST(req: Request) {
  const gate = await requireUser();
  if (!gate.ok) return gate.response;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Nieprawidłowe JSON" }, { status: 400 });
  }
  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Uzupełnij wymagane dane rezerwacji" }, { status: 400 });
  }

  const db = await getDb();
  const result = await createBookingHold(db, {
    userId: gate.session.userId,
    pitchId: parsed.data.pitch_id,
    date: parsed.data.date,
    startTime: parsed.data.start_time,
    contactName: parsed.data.contact_name,
    contactPhone: parsed.data.contact_phone,
    note: parsed.data.note,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });

  await logActivity(
    gate.session.userId,
    `Utworzył rezerwację boiska #${result.booking.id}: ${result.booking.booking_date} ${result.booking.start_time}`
  );
  return NextResponse.json({ booking: result.booking });
}
