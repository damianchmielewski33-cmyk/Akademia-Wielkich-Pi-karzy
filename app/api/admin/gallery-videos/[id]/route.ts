import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api-helpers";
import { getDb, logActivity } from "@/lib/db";
import {
  validateGalleryMatchDate,
  validateGalleryTitle,
  validateGalleryYoutubeInput,
} from "@/lib/gallery-videos";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

const putSchema = z.object({
  title: z.string().min(1).max(200),
  youtube_url: z.string().min(1).max(512),
  match_date: z.string().max(10).optional().nullable(),
  sort_order: z.coerce.number().int().min(-9999).max(9999).optional(),
  published: z.coerce.number().int().min(0).max(1).optional(),
});

export async function PUT(req: Request, ctx: Ctx) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  const vid = Number(id);
  if (!Number.isFinite(vid)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }

  const parsed = putSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const title = validateGalleryTitle(parsed.data.title);
  if (!title) {
    return NextResponse.json({ error: "Nieprawidłowy tytuł" }, { status: 400 });
  }

  const youtubeUrl = validateGalleryYoutubeInput(parsed.data.youtube_url);
  if (!youtubeUrl) {
    return NextResponse.json(
      { error: "Nie rozpoznano prawidłowego linku YouTube ani ID filmu (11 znaków)" },
      { status: 400 }
    );
  }

  const matchDate = validateGalleryMatchDate(parsed.data.match_date);
  if (parsed.data.match_date?.trim() && !matchDate) {
    return NextResponse.json({ error: "Data meczu musi być w formacie RRRR-MM-DD" }, { status: 400 });
  }

  const db = await getDb();
  const existing = await db.prepare("SELECT id, title FROM gallery_videos WHERE id = ?").get(vid);
  if (!existing) {
    return NextResponse.json({ error: "Nie znaleziono wpisu" }, { status: 404 });
  }

  await db
    .prepare(
      `UPDATE gallery_videos
       SET title = ?, youtube_url = ?, match_date = ?, sort_order = ?, published = ?
       WHERE id = ?`
    )
    .run(
      title,
      youtubeUrl,
      matchDate,
      parsed.data.sort_order ?? 0,
      parsed.data.published ?? 1,
      vid
    );

  await logActivity(gate.session.userId, `Zaktualizował film w galerii: «${title}» (id ${vid})`);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  const vid = Number(id);
  if (!Number.isFinite(vid)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const db = await getDb();
  const existing = (await db
    .prepare("SELECT id, title FROM gallery_videos WHERE id = ?")
    .get(vid)) as { id: number; title: string } | undefined;

  if (!existing) {
    return NextResponse.json({ error: "Nie znaleziono wpisu" }, { status: 404 });
  }

  await db.prepare("DELETE FROM gallery_videos WHERE id = ?").run(vid);
  await logActivity(gate.session.userId, `Usunął film z galerii: «${existing.title}» (id ${vid})`);

  return NextResponse.json({ ok: true });
}
