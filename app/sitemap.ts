import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";

const PUBLIC_PATHS = [
  "/",
  "/terminarz",
  "/statystyki",
  "/rankingi",
  "/pilkarze",
  "/o-nas",
  "/kontakt",
  "/sklady",
  "/login",
  "/register",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = getSiteUrl();
  const lastModified = new Date();

  return PUBLIC_PATHS.map((path) => ({
    url: `${origin}${path === "/" ? "" : path}`,
    lastModified,
    changeFrequency: "weekly" as const,
    priority: path === "/" ? 1 : 0.75,
  }));
}
