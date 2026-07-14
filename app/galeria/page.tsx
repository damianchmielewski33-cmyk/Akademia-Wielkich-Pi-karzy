import type { Metadata } from "next";
import { GaleriaClient } from "@/components/galeria-client";
import { getServerSession } from "@/lib/auth";
import { getAppSettings } from "@/lib/app-settings";
import { getDb } from "@/lib/db";
import { listPublishedGalleryVideos } from "@/lib/gallery-videos";

export async function generateMetadata(): Promise<Metadata> {
  const db = await getDb();
  const settings = await getAppSettings(db);
  return {
    title: "Galeria",
    description: `Filmy z meczów ${settings.site_name} — nagrania z boiska do obejrzenia na stronie.`,
  };
}

export default async function GaleriaPage() {
  const db = await getDb();
  const session = await getServerSession();
  const videos = await listPublishedGalleryVideos(db);
  const isAdmin = Boolean(session?.isAdmin && !session.needsPinSetup && !session.pinChangePending);

  return <GaleriaClient videos={videos} isAdmin={isAdmin} />;
}
