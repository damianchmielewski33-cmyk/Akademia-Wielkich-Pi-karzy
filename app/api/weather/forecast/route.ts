import { NextRequest, NextResponse } from "next/server";
import { geocodeMatchLocation } from "@/lib/match-address-geocode";
import { wmoWeatherCodeToPolish } from "@/lib/wmo-weather-pl";

export const dynamic = "force-dynamic";

const GEOCODE_GOOGLE = "https://maps.googleapis.com/maps/api/geocode/json";
const FORECAST_GOOGLE = "https://weather.googleapis.com/v1/forecast/days:lookup";
const FORECAST_OM = "https://api.open-meteo.com/v1/forecast";

const MAX_FORECAST_DAYS = 10;

const fetchOpts = { cache: "no-store" as const };

function getGoogleMapsPlatformKey(): string | undefined {
  const k =
    process.env.GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.GOOGLE_CLOUD_MAPS_API_KEY?.trim() ||
    process.env.MAPS_PLATFORM_SERVER_KEY?.trim();
  return k || undefined;
}

type GeocodeGoogle = {
  status: string;
  results?: Array<{ geometry?: { location?: { lat: number; lng: number } } }>;
};

type ForecastDay = {
  displayDate?: { year: number; month: number; day: number };
  daytimeForecast?: {
    weatherCondition?: {
      iconBaseUri?: string;
      description?: { text?: string };
    };
    precipitation?: { probability?: { percent?: number } };
  };
  maxTemperature?: { degrees?: number };
  minTemperature?: { degrees?: number };
};

type ForecastGoogleJson = {
  forecastDays?: ForecastDay[];
  nextPageToken?: string;
  timeZone?: { id?: string };
  error?: { message?: string };
};

function isoFromGoogleDate(d: NonNullable<ForecastDay["displayDate"]>): string {
  return `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;
}

async function geocodeGoogle(address: string, key: string): Promise<{ lat: number; lng: number } | null> {
  const geoRes = await fetch(
    `${GEOCODE_GOOGLE}?address=${encodeURIComponent(address)}&key=${key}`,
    fetchOpts
  );
  const geoJson = (await geoRes.json()) as GeocodeGoogle;
  if (geoJson.status !== "OK" || !geoJson.results?.[0]?.geometry?.location) return null;
  return geoJson.results[0].geometry.location;
}

async function forecastGoogle(lat: number, lng: number, key: string): Promise<
  Array<{
    date: string;
    description: string;
    iconBaseUri: string;
    weatherCode: null;
    maxC: number | null;
    minC: number | null;
    precipChance: number | null;
  }>
> {
  const days: ForecastDay[] = [];
  let pageToken: string | undefined;
  for (let i = 0; i < 3 && days.length < MAX_FORECAST_DAYS; i++) {
    const params = new URLSearchParams({
      key,
      "location.latitude": String(lat),
      "location.longitude": String(lng),
      days: String(MAX_FORECAST_DAYS),
      pageSize: String(MAX_FORECAST_DAYS),
      languageCode: "pl",
    });
    if (pageToken) params.set("pageToken", pageToken);
    const wRes = await fetch(`${FORECAST_GOOGLE}?${params}`, fetchOpts);
    const wJson = (await wRes.json()) as ForecastGoogleJson;
    if (!wRes.ok || wJson.error) {
      throw new Error(wJson.error?.message || `HTTP ${wRes.status}`);
    }
    const chunk = wJson.forecastDays ?? [];
    days.push(...chunk);
    pageToken = wJson.nextPageToken;
    if (!pageToken || chunk.length === 0) break;
  }

  return days.slice(0, MAX_FORECAST_DAYS).map((d) => {
    const dd = d.displayDate;
    const dateIso = dd ? isoFromGoogleDate(dd) : "";
    return {
      date: dateIso,
      description: d.daytimeForecast?.weatherCondition?.description?.text ?? "",
      iconBaseUri: d.daytimeForecast?.weatherCondition?.iconBaseUri ?? "",
      weatherCode: null,
      maxC: d.maxTemperature?.degrees ?? null,
      minC: d.minTemperature?.degrees ?? null,
      precipChance:
        typeof d.daytimeForecast?.precipitation?.probability?.percent === "number"
          ? d.daytimeForecast.precipitation.probability.percent
          : null,
    };
  });
}

async function forecastOpenMeteo(lat: number, lng: number): Promise<
  Array<{
    date: string;
    description: string;
    iconBaseUri: string;
    weatherCode: number;
    maxC: number | null;
    minC: number | null;
    precipChance: number | null;
  }>
> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    forecast_days: String(MAX_FORECAST_DAYS),
    timezone: "auto",
  });
  const res = await fetch(`${FORECAST_OM}?${params}`, fetchOpts);
  if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);
  const j = (await res.json()) as {
    daily?: {
      time?: string[];
      weather_code?: number[];
      temperature_2m_max?: number[];
      temperature_2m_min?: number[];
      precipitation_probability_max?: (number | null)[];
    };
  };
  const d = j.daily;
  if (!d?.time?.length) throw new Error("Brak danych dziennych Open-Meteo");

  return d.time.slice(0, MAX_FORECAST_DAYS).map((date, i) => {
    const code = d.weather_code?.[i] ?? 0;
    return {
      date,
      description: wmoWeatherCodeToPolish(code),
      iconBaseUri: "",
      weatherCode: code,
      maxC: d.temperature_2m_max?.[i] ?? null,
      minC: d.temperature_2m_min?.[i] ?? null,
      precipChance:
        typeof d.precipitation_probability_max?.[i] === "number"
          ? (d.precipitation_probability_max![i] as number)
          : null,
    };
  });
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ error: "bad_request", message: "Brak parametru q (adres / miejsce)." }, { status: 400 });
  }
  if (q.length > 400) {
    return NextResponse.json({ error: "bad_request", message: "Zapytanie jest zbyt długie." }, { status: 400 });
  }

  const googleKey = getGoogleMapsPlatformKey();

  if (googleKey) {
    try {
      const loc = await geocodeGoogle(q, googleKey);
      if (loc) {
        const days = await forecastGoogle(loc.lat, loc.lng, googleKey);
        if (days.length) {
          return NextResponse.json({
            days,
            maxDays: MAX_FORECAST_DAYS,
            source: "google_weather",
            lat: loc.lat,
            lng: loc.lng,
          });
        }
      }
    } catch {
      /* fallback Open-Meteo */
    }
  }

  try {
    const loc = await geocodeMatchLocation(q);
    if (!loc) {
      return NextResponse.json(
        {
          error: "geocode",
          message:
            "Nie udało się znaleźć współrzędnych dla adresu meczu. Sprawdź zapis miejsca (ulica, miasto) lub ustaw GOOGLE_MAPS_API_KEY (Geocoding API).",
        },
        { status: 422 }
      );
    }
    const days = await forecastOpenMeteo(loc.lat, loc.lng);
    return NextResponse.json({
      days,
      maxDays: MAX_FORECAST_DAYS,
      source: "open_meteo",
      lat: loc.lat,
      lng: loc.lng,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.json(
      { error: "forecast", message: "Nie udało się pobrać prognozy pogody.", details: msg.slice(0, 240) },
      { status: 502 }
    );
  }
}
