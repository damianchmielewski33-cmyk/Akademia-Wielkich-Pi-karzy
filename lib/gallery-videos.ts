import type { AppDb } from "@/lib/db";
import { parseYoutubeVideoIdFromUserInput } from "@/lib/site";

export type GalleryVideoRow = {
  id: number;
  title: string;
  youtube_url: string;
  match_date: string | null;
  sort_order: number;
  published: number;
  created_at: string;
};

export type GalleryVideoPublic = {
  id: number;
  title: string;
  youtubeVideoId: string;
  matchDate: string | null;
};

const MAX_YT_INPUT_LEN = 512;
const MAX_TITLE_LEN = 200;

export function validateGalleryYoutubeInput(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.length > MAX_YT_INPUT_LEN) return null;
  const id = parseYoutubeVideoIdFromUserInput(trimmed);
  if (!id) return null;
  return trimmed;
}

export function galleryVideoIdFromStoredUrl(stored: string): string | null {
  return parseYoutubeVideoIdFromUserInput(stored);
}

export function validateGalleryTitle(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > MAX_TITLE_LEN) return null;
  return trimmed;
}

export function validateGalleryMatchDate(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  return trimmed;
}

export async function listPublishedGalleryVideos(db: AppDb): Promise<GalleryVideoPublic[]> {
  const rows = (await db
    .prepare(
      `SELECT id, title, youtube_url, match_date, sort_order
       FROM gallery_videos
       WHERE published = 1
       ORDER BY sort_order DESC, match_date DESC, created_at DESC, id DESC`
    )
    .all()) as GalleryVideoRow[];

  const out: GalleryVideoPublic[] = [];
  for (const row of rows) {
    const youtubeVideoId = galleryVideoIdFromStoredUrl(row.youtube_url);
    if (!youtubeVideoId) continue;
    out.push({
      id: row.id,
      title: row.title,
      youtubeVideoId,
      matchDate: row.match_date,
    });
  }
  return out;
}

export async function listAllGalleryVideos(db: AppDb): Promise<GalleryVideoRow[]> {
  return (await db
    .prepare(
      `SELECT id, title, youtube_url, match_date, sort_order, published, created_at
       FROM gallery_videos
       ORDER BY sort_order DESC, match_date DESC, created_at DESC, id DESC`
    )
    .all()) as GalleryVideoRow[];
}
