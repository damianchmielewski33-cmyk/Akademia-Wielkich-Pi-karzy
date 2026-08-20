import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "@/lib/auth";
import { getDb, logActivity } from "@/lib/db";
import { createBookingHold, listBookingsForAccessToken, listBookingsForUser, publicBookingView } from "@/lib/booking";
import { requireBookingMarketplace } from "@/lib/booking-marketplace";
import { ensureMarketplaceCustomer } from "@/lib/booking-accounts";
import { BOOKING_ACCESS_COOKIE, bookingAccessCookieOptions, readBookingAccessToken } from "@/lib/booking-access";
import { checkRateLimitDistributed } from "@/lib/rate-limit-db";
import { RATE, rateLimitKey, rateLimitedResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";

const postSchema = z.object({
  pitch_id: z.coerce.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_time: z.string().min(4).max(5),
  contact_name: z.string().trim().min(2).max(120),
  contact_phone: z.string().trim().min(6).max(40),
  contact_email: z.string().trim().email().optional(),
  note: z.string().trim().max(500).optional(),
  access_token: z.string().trim().max(80).optional(),
});

function academySessionOk(
  session: Awaited<ReturnType<typeof getServerSession>>
): session is NonNullable<typeof session> {
  return Boolean(session && !session.needsPinSetup && !session.pinChangePending);
}

export async function GET(req: Request) {
  const marketplace = await requireBookingMarketplace();
  if (!marketplace.ok) return marketplace.response;
  const session = await getServerSession();
  const db = await getDb();
  if (academySessionOk(session)) {
    const bookings = await listBookingsForUser(db, session.userId);
    return NextResponse.json({ bookings });
  }
  const token = readBookingAccessToken(req);
  if (!token) {
    return NextResponse.json({ bookings: [], guest: true });
  }
  const bookings = await listBookingsForAccessToken(db, token);
  const res = NextResponse.json({ bookings, guest: true });
  res.cookies.set(BOOKING_ACCESS_COOKIE, token, bookingAccessCookieOptions());
  return res;
}

export async function POST(req: Request) {
  const marketplace = await requireBookingMarketplace();
  if (!marketplace.ok) return marketplace.response;
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

  const session = await getServerSession();
  const loggedIn = academySessionOk(session);
  if (!loggedIn) {
    const rl = await checkRateLimitDistributed(
      rateLimitKey("guest_booking", req),
      RATE.guestBooking.limit,
      RATE.guestBooking.windowMs
    );
    if (!rl.ok) return rateLimitedResponse(rl.retryAfterSec);
    if (!parsed.data.contact_email) {
      return NextResponse.json(
        { error: "Podaj e-mail — potwierdzenie rezerwacji przyjdzie mailem, bez PIN-u akademii." },
        { status: 400 }
      );
    }
  }

  const db = await getDb();
  let userId: number;
  if (loggedIn) {
    userId = session.userId;
  } else {
    const customer = await ensureMarketplaceCustomer(db, {
      name: parsed.data.contact_name,
      email: parsed.data.contact_email!,
      phone: parsed.data.contact_phone,
    });
    userId = customer.userId;
  }

  const result = await createBookingHold(db, {
    userId,
    pitchId: parsed.data.pitch_id,
    date: parsed.data.date,
    startTime: parsed.data.start_time,
    contactName: parsed.data.contact_name,
    contactPhone: parsed.data.contact_phone,
    contactEmail: parsed.data.contact_email,
    note: parsed.data.note,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });

  await logActivity(
    userId,
    `Utworzył rezerwację boiska #${result.booking.id}: ${result.booking.booking_date} ${result.booking.start_time}`
  );

  const res = NextResponse.json({
    booking: publicBookingView(result.booking),
    guest: !loggedIn,
  });
  if (result.booking.access_token) {
    res.cookies.set(BOOKING_ACCESS_COOKIE, result.booking.access_token, bookingAccessCookieOptions());
  }
  return res;
}
