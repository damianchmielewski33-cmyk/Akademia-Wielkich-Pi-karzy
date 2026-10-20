/**
 * Warianty zapytania geokodowania z pola „miejsce” meczu (często: ulica, miasto — nazwa obiektu).
 * Open-Meteo search lepiej radzi sobie z nazwami miejscowości; Nominatim lepiej z pełnym adresem.
 */

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const OPEN_METEO_GEO = "https://geocoding-api.open-meteo.com/v1/search";

const fetchOpts = { cache: "no-store" as const };
const GEOCODE_SUCCESS_TTL_MS = 6 * 60 * 60 * 1000;
const GEOCODE_MISS_TTL_MS = 10 * 60 * 1000;
const GEOCODE_CACHE_MAX = 256;

type Coordinates = { lat: number; lng: number };
type CacheEntry<T> = { value: T; expiresAt: number };

const providerGeocodeCache = new Map<string, CacheEntry<Coordinates | null>>();
const providerGeocodeInflight = new Map<string, Promise<Coordinates | null>>();
const matchLocationCache = new Map<string, CacheEntry<Coordinates | null>>();
const matchLocationInflight = new Map<string, Promise<Coordinates | null>>();

function cacheKeyPart(input: string): string {
  return input.trim().replace(/\s+/g, " ").toLowerCase();
}

function getCachedValue<T>(store: Map<string, CacheEntry<T>>, key: string): T | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt <= Date.now()) {
    store.delete(key);
    return undefined;
  }
  return entry.value;
}

function setCachedValue<T>(store: Map<string, CacheEntry<T>>, key: string, value: T, ttlMs: number): T {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
  while (store.size > GEOCODE_CACHE_MAX) {
    const oldestKey = store.keys().next().value;
    if (!oldestKey) break;
    store.delete(oldestKey);
  }
  return value;
}

async function withMemoryCache<T>(
  cache: Map<string, CacheEntry<T>>,
  inflight: Map<string, Promise<T>>,
  key: string,
  load: () => Promise<T>,
  ttlForValue: (value: T) => number
): Promise<T> {
  const cached = getCachedValue(cache, key);
  if (cached !== undefined) return cached;

  const pending = inflight.get(key);
  if (pending) return pending;

  const promise = load()
    .then((value) => setCachedValue(cache, key, value, ttlForValue(value)))
    .finally(() => {
      inflight.delete(key);
    });
  inflight.set(key, promise);
  return promise;
}

function nominatimUserAgent(): string {
  const custom = process.env.NOMINATIM_USER_AGENT?.trim();
  if (custom) return custom;
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const ref = site && /^https?:\/\//i.test(site) ? site : "https://localhost";
  return `AkademiaWielkichPilkarzy/1.0 (pogoda terminarz; +${ref})`;
}

/** Kolejność: pełny tekst, bez części po myślniku (adres obiektu), skróty po przecinkach. */
export function matchLocationGeocodeVariants(full: string): string[] {
  const t = full.trim();
  const out: string[] = [];
  const push = (s: string) => {
    const x = s.trim();
    if (x.length < 2) return;
    if (!out.includes(x)) out.push(x);
  };

  push(t);

  const dashParts = t.split(/\s+[-–—]\s+/);
  if (dashParts.length >= 2) {
    push(dashParts[0].trim());
  }

  const commaParts = t.split(",").map((p) => p.trim()).filter(Boolean);
  if (commaParts.length >= 2) {
    push(commaParts.slice(0, 2).join(", "));
  }
  if (commaParts.length >= 3) {
    push(commaParts.slice(0, 3).join(", "));
  }
  if (commaParts.length >= 1) {
    push(commaParts[0]);
  }

  return out.slice(0, 8);
}

async function geocodeNominatim(query: string): Promise<{ lat: number; lng: number } | null> {
  return withMemoryCache(
    providerGeocodeCache,
    providerGeocodeInflight,
    `nominatim:${cacheKeyPart(query)}`,
    async () => {
      const params = new URLSearchParams({
        q: query,
        format: "json",
        limit: "1",
        "accept-language": "pl",
        /** Akademia w Polsce — zawęża wyniki, mniej pomyłek przy popularnych nazwach ulic. */
        countrycodes: "pl",
      });
      const res = await fetch(`${NOMINATIM_URL}?${params}`, {
        ...fetchOpts,
        headers: { "User-Agent": nominatimUserAgent() },
      });
      if (!res.ok) return null;
      const j = (await res.json()) as Array<{ lat?: string; lon?: string }>;
      const hit = j[0];
      if (!hit?.lat || !hit?.lon) return null;
      const lat = parseFloat(hit.lat);
      const lng = parseFloat(hit.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      return { lat, lng };
    },
    (value) => (value ? GEOCODE_SUCCESS_TTL_MS : GEOCODE_MISS_TTL_MS)
  );
}

async function geocodeOpenMeteoSearch(name: string): Promise<{ lat: number; lng: number } | null> {
  return withMemoryCache(
    providerGeocodeCache,
    providerGeocodeInflight,
    `open-meteo:${cacheKeyPart(name)}`,
    async () => {
      const url = `${OPEN_METEO_GEO}?name=${encodeURIComponent(name)}&count=1&language=pl`;
      const res = await fetch(url, fetchOpts);
      if (!res.ok) return null;
      const j = (await res.json()) as { results?: Array<{ latitude: number; longitude: number }> };
      const r = j.results?.[0];
      if (!r) return null;
      return { lat: r.latitude, lng: r.longitude };
    },
    (value) => (value ? GEOCODE_SUCCESS_TTL_MS : GEOCODE_MISS_TTL_MS)
  );
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Maks. prób Nominatim z przerwą (polityka OSM: ok. 1 żądanie / s). */
const NOMINATIM_TRIES = 4;

/**
 * Współrzędne dla adresu meczu — najpierw Nominatim (adresy), potem geokodowanie Open-Meteo.
 */
export async function geocodeMatchLocation(address: string): Promise<{ lat: number; lng: number } | null> {
  const normalized = cacheKeyPart(address);
  if (!normalized) return null;

  return withMemoryCache(
    matchLocationCache,
    matchLocationInflight,
    normalized,
    async () => {
      const variants = matchLocationGeocodeVariants(address);

      for (let i = 0; i < Math.min(variants.length, NOMINATIM_TRIES); i++) {
        if (i > 0) await sleep(1100);
        const loc = await geocodeNominatim(variants[i]);
        if (loc) return loc;
      }

      for (const v of variants) {
        const loc = await geocodeOpenMeteoSearch(v);
        if (loc) return loc;
      }

      return null;
    },
    (value) => (value ? GEOCODE_SUCCESS_TTL_MS : GEOCODE_MISS_TTL_MS)
  );
}
