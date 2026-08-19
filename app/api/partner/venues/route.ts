import { NextResponse } from "next/server";
import { z } from "zod";
import { requireVenuePartner } from "@/lib/api-helpers";
import { getDb, logActivity } from "@/lib/db";
import { createVenue, listVenueCards, replaceVenuePhotos } from "@/lib/booking";

export const runtime = "nodejs";

const venueSchema = z.object({
  name: z.string().trim().min(2).max(140),
  city: z.string().trim().min(2).max(120),
  address: z.string().trim().min(3).max(180),
  description: z.string().trim().max(1000).optional(),
  phone: z.string().trim().max(60).optional(),
  email: z.string().trim().email().optional().or(z.literal("")),
  photo_url: z.string().trim().max(500).optional(),
  photo_urls: z.array(z.string().trim().max(500)).max(3).optional(),
  published: z.coerce.boolean().optional(),
});

export async function GET() {
  const gate = await requireVenuePartner();
  if (!gate.ok) return gate.response;
  const db = await getDb();
  const venues = await listVenueCards(db, {
    includeUnpublished: true,
    ownerUserId: gate.session.userId,
  });
  return NextResponse.json({ venues });
}

export async function POST(req: Request) {
  const gate = await requireVenuePartner();
  if (!gate.ok) return gate.response;
  const parsed = venueSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Nieprawidłowe dane obiektu" }, { status: 400 });

  const db = await getDb();
  const created = await createVenue(db, {
    name: parsed.data.name,
    city: parsed.data.city,
    address: parsed.data.address,
    description: parsed.data.description,
    phone: parsed.data.phone,
    email: parsed.data.email,
    photoUrl: parsed.data.photo_urls?.[0] || parsed.data.photo_url,
    published: parsed.data.published,
    ownerUserId: gate.session.userId,
  });
  const photos = parsed.data.photo_urls?.length
    ? parsed.data.photo_urls
    : parsed.data.photo_url
      ? [parsed.data.photo_url]
      : [];
  if (photos.length) await replaceVenuePhotos(db, created.id, photos);
  await logActivity(gate.session.userId, `Partner dodał obiekt: ${parsed.data.name}`);
  return NextResponse.json(created);
}
