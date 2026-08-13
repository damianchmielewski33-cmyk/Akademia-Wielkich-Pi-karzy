import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";
import { blogPosts } from "@/lib/blog-posts";

const PUBLIC_PATHS = [
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

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = getSiteUrl();
  const lastModified = new Date();

  const staticPages: MetadataRoute.Sitemap = PUBLIC_PATHS.map((path) => ({
    url: `${origin}${path === "/" ? "" : path}`,
    lastModified,
    changeFrequency: "weekly" as const,
    priority: path === "/" ? 1 : path === "/blog" || path === "/o-nas" ? 0.9 : 0.75,
  }));

  const blogPages: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: `${origin}/blog/${post.slug}`,
    lastModified: new Date(post.publishedAt),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  return [...staticPages, ...blogPages];
}
