import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";
import { blogPosts } from "@/lib/blog-posts";
import { getDb } from "@/lib/db";
import { listVenueCards } from "@/lib/booking";

const ACADEMY_PATHS = [
  "/",
  "/blog",
  "/o-nas",
  "/kontakt",
  "/faq",
  "/terminarz",
  "/statystyki",
  "/rankingi",
  "/pilkarze",
  "/sklady",
  "/galeria",
  "/polityka-prywatnosci",
  "/regulamin",
  "/cookies",
  "/login",
  "/register",
] as const;

const MARKETPLACE_PATHS = ["/obiekty", "/dla-obiektow", "/rezerwacje"] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = getSiteUrl();
  const lastModified = new Date();
  const publicPaths = [...MARKETPLACE_PATHS, ...ACADEMY_PATHS];

  const staticPages: MetadataRoute.Sitemap = publicPaths.map((path) => ({
    url: `${origin}${path === "/" ? "" : path}`,
    lastModified,
    changeFrequency: "weekly" as const,
    priority:
      path === "/" || path === "/obiekty"
        ? 1
        : path === "/dla-obiektow" || path === "/rezerwacje"
          ? 0.9
          : path === "/blog" || path === "/o-nas"
            ? 0.8
            : 0.7,
  }));

  const blogPages: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: `${origin}/blog/${post.slug}`,
    lastModified: new Date(post.publishedAt),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  let venuePages: MetadataRoute.Sitemap = [];
  try {
    const db = await getDb();
    const venues = await listVenueCards(db);
    venuePages = venues.map((venue) => ({
      url: `${origin}/obiekty/${venue.slug}`,
      lastModified,
      changeFrequency: "daily" as const,
      priority: 0.85,
    }));
  } catch {
    venuePages = [];
  }

  return [...staticPages, ...blogPages, ...venuePages];
}
