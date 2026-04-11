import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const origin = getSiteUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/panel-admina",
        "/profil",
        "/platnosci",
        "/ustaw-pin",
        "/transport/",
        "/confirm/",
      ],
    },
    sitemap: `${origin}/sitemap.xml`,
  };
}
