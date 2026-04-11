/**
 * Warianty zapytania geokodowania z pola „miejsce” meczu (często: ulica, miasto — nazwa obiektu).
 * Open-Meteo search lepiej radzi sobie z nazwami miejscowości; Nominatim lepiej z pełnym adresem.
 */

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const OPEN_METEO_GEO = "https://geocoding-api.open-meteo.com/v1/search";

const fetchOpts = { cache: "no-store" as const };

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
}

async function geocodeOpenMeteoSearch(name: string): Promise<{ lat: number; lng: number } | null> {
  const url = `${OPEN_METEO_GEO}?name=${encodeURIComponent(name)}&count=1&language=pl`;
  const res = await fetch(url, fetchOpts);
  if (!res.ok) return null;
  const j = (await res.json()) as { results?: Array<{ latitude: number; longitude: number }> };
  const r = j.results?.[0];
  if (!r) return null;
  return { lat: r.latitude, lng: r.longitude };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Maks. prób Nominatim z przerwą (polityka OSM: ok. 1 żądanie / s). */
const NOMINATIM_TRIES = 4;

/**
 * Współrzędne dla adresu meczu — najpierw Nominatim (adresy), potem geokodowanie Open-Meteo.
 */
export async function geocodeMatchLocation(address: string): Promise<{ lat: number; lng: number } | null> {
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
}
