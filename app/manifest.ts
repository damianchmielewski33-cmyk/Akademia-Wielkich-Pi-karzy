import type { MetadataRoute } from "next";
import { getAppSettings } from "@/lib/app-settings";
import { getDb } from "@/lib/db";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const db = await getDb();
  const settings = await getAppSettings(db);
  const favicon = settings.site_assets.logo_favicon;
  const faviconType = favicon.toLowerCase().endsWith(".svg") ? "image/svg+xml" : "image/png";

  return {
    name: settings.site_name,
    short_name: "AWP",
    description: settings.site_description,
    start_url: "/",
    display: "standalone",
    background_color: "#1A2D5A",
    theme_color: "#047857",
    lang: "pl",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: favicon,
        sizes: "any",
        type: faviconType,
        purpose: "any",
      },
    ],
    scope: "/",
    orientation: "portrait",
    categories: ["sports"],
  };
}
