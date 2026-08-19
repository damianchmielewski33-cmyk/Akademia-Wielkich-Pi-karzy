import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api-helpers";
import { getDb, logActivity } from "@/lib/db";

export const runtime = "nodejs";

const patchSchema = z.object({
  name: z.string().trim().min(2).max(140).optional(),
  city: z.string().trim().min(2).max(120).optional(),
  address: z.string().trim().min(3).max(180).optional(),
  description: z.string().trim().max(1000).optional(),
  phone: z.string().trim().max(60).optional(),
  email: z.string().trim().email().optional().or(z.literal("")),
  photo_url: z.string().trim().max(500).optional(),
  published: z.coerce.boolean().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdmin("matches");
  if (!gate.ok) return gate.response;
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Nieprawidłowy obiekt" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Nieprawidłowe dane obiektu" }, { status: 400 });

  const db = await getDb();
  await db
    .prepare(
      `UPDATE venues
       SET name = COALESCE(?, name),
           city = COALESCE(?, city),
           address = COALESCE(?, address),
           description = COALESCE(?, description),
           phone = COALESCE(?, phone),
           email = COALESCE(?, email),
           photo_url = COALESCE(?, photo_url),
           published = COALESCE(?, published),
           updated_at = datetime('now')
       WHERE id = ?`
    )
    .run(
      parsed.data.name ?? null,
      parsed.data.city ?? null,
      parsed.data.address ?? null,
      parsed.data.description ?? null,
      parsed.data.phone ?? null,
      parsed.data.email || null,
      parsed.data.photo_url ?? null,
      parsed.data.published == null ? null : parsed.data.published ? 1 : 0,
      id
    );
  await logActivity(gate.session.userId, `Zaktualizował obiekt rezerwacji #${id}`);
  return NextResponse.json({ ok: true });
}
