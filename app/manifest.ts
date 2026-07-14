import type { MetadataRoute } from "next";
import { getAppSettings } from "@/lib/app-settings";
import { getDb } from "@/lib/db";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const db = await getDb();
  const settings = await getAppSettings(db);
  const icon = settings.site_assets.logo_favicon;
  const iconType = icon.toLowerCase().endsWith(".svg") ? "image/svg+xml" : "image/png";

  return {
    name: settings.site_name,
    short_name: "AWP",
    description: settings.site_description,
    start_url: "/",
    display: "standalone",
    background_color: "#f4faf7",
    theme_color: "#047857",
    lang: "pl",
    icons: [
      {
        src: icon,
        sizes: "any",
        type: iconType,
        purpose: "any",
      },
    ],
  };
}
