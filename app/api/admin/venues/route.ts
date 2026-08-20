import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api-helpers";
import { getDb, logActivity } from "@/lib/db";
import { listVenueCards, replaceVenuePhotos, slugifyVenueName } from "@/lib/booking";
import { clampVenueCommissionPct } from "@/lib/venue-settlements";

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
  commission_pct: z.coerce.number().min(0).max(50).optional(),
});

export async function GET() {
  const gate = await requireAdmin("matches");
  if (!gate.ok) return gate.response;
  const db = await getDb();
  const venues = await listVenueCards(db, { includeUnpublished: true });
  return NextResponse.json({ venues });
}

export async function POST(req: Request) {
  const gate = await requireAdmin("matches");
  if (!gate.ok) return gate.response;
  const parsed = venueSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Nieprawidłowe dane obiektu" }, { status: 400 });

  const db = await getDb();
  const baseSlug = slugifyVenueName(parsed.data.name);
  let slug = baseSlug;
  for (let i = 2; ; i++) {
    const exists = await db.prepare("SELECT id FROM venues WHERE slug = ?").get(slug);
    if (!exists) break;
    slug = `${baseSlug}-${i}`;
  }

  const result = await db
    .prepare(
      `INSERT INTO venues (name, slug, city, address, description, phone, email, photo_url, published, commission_pct)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      parsed.data.name,
      slug,
      parsed.data.city,
      parsed.data.address,
      parsed.data.description || null,
      parsed.data.phone || null,
      parsed.data.email || null,
      parsed.data.photo_urls?.[0] || parsed.data.photo_url || null,
      parsed.data.published === false ? 0 : 1,
      clampVenueCommissionPct(parsed.data.commission_pct ?? 15)
    );
  const venueId = Number(result.lastInsertRowid);
  const photos = parsed.data.photo_urls?.length
    ? parsed.data.photo_urls
    : parsed.data.photo_url
      ? [parsed.data.photo_url]
      : [];
  if (photos.length) await replaceVenuePhotos(db, venueId, photos);
  await logActivity(gate.session.userId, `Dodał obiekt rezerwacji: ${parsed.data.name}`);
  return NextResponse.json({ id: venueId, slug });
}
