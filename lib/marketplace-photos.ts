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
  "https://images.unsplash.com/photo-1459865264687-595d652de67e?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1517466787929-bc90951d0974?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1575361204480-aadea25e6e68?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1517927033932-b3d18e61fb3a?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1560272564-c83b66b1ad12?auto=format&fit=crop&w=1600&q=80",
] as const;

/** Liczba slotów edytowalnych (pasek pod „Gramy razem” + pula hero/kafelków). */
export const MARKETPLACE_PITCH_SLOT_COUNT = MARKETPLACE_PITCH_PHOTOS.length;

/** Ile zdjęć pokazuje poziomy pasek pod hero. */
export const MARKETPLACE_STRIP_VISIBLE = 8;

/** Unsplash czasem usuwa zdjęcia — Next Image wtedy zwraca 400 na `/_next/image`. */
const DEAD_UNSPLASH_PHOTOS: Record<string, string> = {
  "photo-1489944446611-063e2d80944a": MARKETPLACE_PITCH_PHOTOS[7],
  "photo-1508098682722-e99c43a406b2": MARKETPLACE_PITCH_PHOTOS[11],
};

export function resolveMarketplacePhoto(src: string): string {
  const trimmed = src.trim();
  if (!trimmed) return MARKETPLACE_PITCH_PHOTOS[0];
  try {
    const id = new URL(trimmed).pathname.split("/").filter(Boolean).pop() ?? "";
    return DEAD_UNSPLASH_PHOTOS[id] ?? trimmed;
  } catch {
    return trimmed;
  }
}

export function pitchPhotoAt(index: number, pool?: readonly string[]): string {
  const list = pool && pool.length > 0 ? pool : MARKETPLACE_PITCH_PHOTOS;
  const n = list.length;
  const i = ((index % n) + n) % n;
  return resolveMarketplacePhoto(list[i] ?? MARKETPLACE_PITCH_PHOTOS[0]);
}

/** Surowa lista custom URL (null = domyślne Unsplash dla slotu). */
export function parseMarketplacePitchPhotosJson(
  raw: string | null | undefined
): (string | null)[] {
  const slots: (string | null)[] = Array.from({ length: MARKETPLACE_PITCH_SLOT_COUNT }, () => null);
  if (!raw?.trim()) return slots;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return slots;
    for (let i = 0; i < MARKETPLACE_PITCH_SLOT_COUNT; i++) {
      const v = parsed[i];
      if (typeof v === "string" && v.trim()) slots[i] = v.trim();
    }
  } catch {
    /* ignore */
  }
  return slots;
}

export function serializeMarketplacePitchPhotosJson(slots: (string | null)[]): string {
  const normalized = Array.from({ length: MARKETPLACE_PITCH_SLOT_COUNT }, (_, i) => {
    const v = slots[i]?.trim();
    return v ? v : null;
  });
  return JSON.stringify(normalized);
}

/** Pełna pula URL do wyświetlania (custom albo default). */
export function resolveMarketplacePitchPhotoPool(customSlots: (string | null)[]): string[] {
  return Array.from({ length: MARKETPLACE_PITCH_SLOT_COUNT }, (_, i) => {
    const custom = customSlots[i]?.trim();
    if (custom) return resolveMarketplacePhoto(custom);
    return resolveMarketplacePhoto(MARKETPLACE_PITCH_PHOTOS[i] ?? MARKETPLACE_PITCH_PHOTOS[0]);
  });
}

export function isCustomMarketplacePitchUpload(url: string | null | undefined): boolean {
  if (!url?.trim()) return false;
  const t = url.trim();
  return (
    t.startsWith("/uploads/site/") ||
    t.startsWith("/api/uploads/site/") ||
    t.startsWith("/api/media/blob/") ||
    t.includes(".public.blob.vercel-storage.com") ||
    t.includes("blob.vercel-storage.com")
  );
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
      out.push(resolveMarketplacePhoto(trimmed));
    }
  }
  return out.length > 0 ? out : [...MARKETPLACE_PITCH_PHOTOS];
}
