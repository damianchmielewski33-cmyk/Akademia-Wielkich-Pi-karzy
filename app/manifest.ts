import type { MetadataRoute } from "next";
import { getRequestAppSettings } from "@/lib/request-app-settings";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const settings = await getRequestAppSettings();
  const favicon = settings.site_assets.logo_favicon;
  const faviconType = favicon.toLowerCase().endsWith(".svg") ? "image/svg+xml" : "image/png";

  return {
    name: settings.site_name,
    short_name: "Boiska",
    description: settings.site_description,
    start_url: "/?mode=booking",
    display: "standalone",
    background_color: "#F4F5F7",
    theme_color: "#00C9B1",
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
