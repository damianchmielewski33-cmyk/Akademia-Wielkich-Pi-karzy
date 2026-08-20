import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { requireBookingMarketplace } from "@/lib/booking-marketplace";
import { submitVenueApplication } from "@/lib/venue-applications";
import { checkRateLimitDistributed } from "@/lib/rate-limit-db";
import { RATE, rateLimitKey, rateLimitedResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";

const schema = z.object({
  contact_name: z.string().trim().min(2).max(120),
  contact_email: z.string().trim().email(),
  contact_phone: z.string().trim().min(6).max(40),
  venue_name: z.string().trim().min(2).max(140),
  city: z.string().trim().min(2).max(80),
  address: z.string().trim().min(3).max(180),
  description: z.string().trim().max(1000).optional(),
  website: z.string().trim().max(200).optional(),
  note: z.string().trim().max(500).optional(),
});

export async function POST(req: Request) {
  const marketplace = await requireBookingMarketplace();
  if (!marketplace.ok) return marketplace.response;
  const rl = await checkRateLimitDistributed(
    rateLimitKey("venue_apply", req),
    RATE.venueApply.limit,
    RATE.venueApply.windowMs
  );
  if (!rl.ok) return rateLimitedResponse(rl.retryAfterSec);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Uzupełnij dane zgłoszenia hali." }, { status: 400 });
  }

  const db = await getDb();
  const result = await submitVenueApplication(db, {
    contactName: parsed.data.contact_name,
    contactEmail: parsed.data.contact_email,
    contactPhone: parsed.data.contact_phone,
    venueName: parsed.data.venue_name,
    city: parsed.data.city,
    address: parsed.data.address,
    description: parsed.data.description,
    website: parsed.data.website,
    note: parsed.data.note,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });
  return NextResponse.json({ ok: true, application_id: result.application.id });
}
