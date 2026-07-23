import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { checkRateLimit, rateLimitKey, rateLimitedResponse, RATE } from "@/lib/rate-limit";

export const runtime = "nodejs";

const GITHUB_VERSION_JSON =
  "https://github.com/damianchmielewski33-cmyk/Akademia-Wielkich-Pi-karzy/releases/download/android-latest/android-version.json";

type AndroidVersionInfo = {
  versionCode: number;
  versionName: string;
  apkUrl: string;
  releasedAt?: string | null;
  commit?: string | null;
  notes?: string | null;
};

function isValid(v: unknown): v is AndroidVersionInfo {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.versionCode === "number" &&
    Number.isFinite(o.versionCode) &&
    typeof o.versionName === "string" &&
    o.versionName.length > 0 &&
    typeof o.apkUrl === "string" &&
    o.apkUrl.startsWith("http")
  );
}

async function readLocalFallback(): Promise<AndroidVersionInfo | null> {
  try {
    const file = path.join(process.cwd(), "public", "android-version.json");
    const raw = await readFile(file, "utf8");
    const parsed: unknown = JSON.parse(raw);
    return isValid(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function fetchGithubVersion(): Promise<AndroidVersionInfo | null> {
  try {
    const r = await fetch(GITHUB_VERSION_JSON, {
      headers: { Accept: "application/json", "User-Agent": "AWP-Android-Version" },
      cache: "no-store",
    });
    if (!r.ok) return null;
    const parsed: unknown = await r.json();
    return isValid(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Publiczny endpoint wersji APK — aplikacja porównuje z BuildConfig.VERSION_CODE.
 */
export async function GET(req: Request) {
  const rl = checkRateLimit(
    rateLimitKey("android-version", req),
    RATE.androidVersion.limit,
    RATE.androidVersion.windowMs
  );
  if (!rl.ok) return rateLimitedResponse(rl.retryAfterSec);

  const fromGithub = await fetchGithubVersion();
  const fromLocal = fromGithub ? null : await readLocalFallback();
  const info = fromGithub ?? fromLocal;

  if (!info) {
    return NextResponse.json(
      { error: "Brak informacji o wersji Androida." },
      { status: 503 }
    );
  }

  return NextResponse.json(
    {
      ...info,
      downloadPath: "/api/android/download?source=in-app-update",
    },
    {
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=60",
      },
    }
  );
}
