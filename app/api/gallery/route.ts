import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { listPublishedGalleryVideos } from "@/lib/gallery-videos";

export const runtime = "nodejs";

export async function GET() {
  const db = await getDb();
  const videos = await listPublishedGalleryVideos(db);
  return NextResponse.json({ videos });
}
