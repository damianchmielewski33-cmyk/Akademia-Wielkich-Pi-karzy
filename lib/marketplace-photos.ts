import type { VenueCard } from "@/lib/booking-shared";

/** Te same zdjęcia co na kartach hal (/obiekty i katalog startowy). */
export const MARKETPLACE_PITCH_PHOTOS = [
  "https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1577223625816-7546f13df25d?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1518604666860-9ed391f76460?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1489944446611-063e2d80944a?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1517466787929-bc90951d0974?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1575361204480-aadea25e6e68?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1517927033932-b3d18e61fb3a?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1600&q=80",
] as const;

export function pitchPhotoAt(index: number): string {
  const n = MARKETPLACE_PITCH_PHOTOS.length;
  const i = ((index % n) + n) % n;
  return MARKETPLACE_PITCH_PHOTOS[i] ?? MARKETPLACE_PITCH_PHOTOS[0];
}

export function canOptimizeMarketplacePhoto(src: string): boolean {
  if (!src.startsWith("http://") && !src.startsWith("https://")) return true;
  try {
    const { hostname } = new URL(src);
    return hostname === "images.unsplash.com" || hostname.endsWith(".public.blob.vercel-storage.com");
  } catch {
    return false;
  }
}

export function pitchPhotosFromVenues(
  venues: Pick<VenueCard, "photo_url" | "photo_urls">[]
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const venue of venues) {
    const urls = venue.photo_urls?.length
      ? venue.photo_urls
      : venue.photo_url
        ? [venue.photo_url]
        : [];
    for (const url of urls) {
      const trimmed = url.trim();
      if (!trimmed || seen.has(trimmed)) continue;
      seen.add(trimmed);
      out.push(trimmed);
    }
  }
  return out.length > 0 ? out : [...MARKETPLACE_PITCH_PHOTOS];
}
