import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api-helpers";
import { getDb, logActivity } from "@/lib/db";
import {
  listAllGalleryVideos,
  validateGalleryMatchDate,
  validateGalleryTitle,
  validateGalleryYoutubeInput,
} from "@/lib/gallery-videos";

export const runtime = "nodejs";

const postSchema = z.object({
  title: z.string().min(1).max(200),
  youtube_url: z.string().min(1).max(512),
  match_date: z.string().max(10).optional().nullable(),
  sort_order: z.coerce.number().int().min(-9999).max(9999).optional(),
  published: z.coerce.number().int().min(0).max(1).optional(),
});

export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const db = await getDb();
  const rows = await listAllGalleryVideos(db);
  return NextResponse.json({ videos: rows });
}

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }

  const parsed = postSchema.safeParse(json);
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

  const sortOrder = parsed.data.sort_order ?? 0;
  const published = parsed.data.published ?? 1;

  const db = await getDb();
  const result = await db
    .prepare(
      `INSERT INTO gallery_videos (title, youtube_url, match_date, sort_order, published)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(title, youtubeUrl, matchDate, sortOrder, published);

  const id = Number(result.lastInsertRowid);
  await logActivity(gate.session.userId, `Dodał film do galerii: «${title}» (id ${id})`);

  return NextResponse.json({ ok: true, id });
}
