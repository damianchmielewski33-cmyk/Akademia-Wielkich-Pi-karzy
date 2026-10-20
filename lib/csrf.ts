import { randomBytes, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { CSRF_COOKIE_NAME } from "@/lib/csrf-constants";

export { CSRF_COOKIE_NAME };

function parseCookieHeader(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split("; ");
  for (const p of parts) {
    const eq = p.indexOf("=");
    if (eq === -1) continue;
    const k = p.slice(0, eq);
    if (k === name) {
      return decodeURIComponent(p.slice(eq + 1));
    }
  }
  return null;
}

function addOrigin(out: Set<string>, raw?: string | null) {
  const t = raw?.trim();
  if (!t) return;
  try {
    out.add(new URL(t).origin);
  } catch {
    /* ignore */
  }
}

/**
 * Allowlista Origin: publiczne URL-e aplikacji + auto `RENDER_EXTERNAL_URL` + opcjonalne CSV.
 * Na Renderze `req.url` bywa `localhost`, więc same-origin nie może polegać tylko na nim.
 */
export function allowedOrigins(): Set<string> {
  const out = new Set<string>();
  addOrigin(out, process.env.NEXTAUTH_URL);
  addOrigin(out, process.env.AUTH_URL);
  addOrigin(out, process.env.NEXT_PUBLIC_APP_URL);
  addOrigin(out, process.env.NEXT_PUBLIC_SITE_URL);
  addOrigin(out, process.env.RENDER_EXTERNAL_URL);

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) addOrigin(out, `https://${vercel.replace(/^https?:\/\//i, "")}`);

  const extra = process.env.CSRF_ALLOWED_ORIGINS?.split(",") ?? [];
  for (const x of extra) addOrigin(out, x.trim());

  if (out.size === 0 && process.env.NODE_ENV !== "production") {
    addOrigin(out, "http://localhost:3000");
    addOrigin(out, "http://127.0.0.1:3000");
  }
  return out;
}

/**
 * Origin widoczny dla przeglądarki za proxy (Render / Vercel):
 * `X-Forwarded-Proto` + `X-Forwarded-Host` / `Host`, z fallbackiem do `req.url`.
 */
export function requestPublicOrigin(req: Request): string | null {
  const xfHost = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = xfHost || req.headers.get("host")?.trim();
  if (host) {
    const xfProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim()?.toLowerCase();
    const proto =
      xfProto === "http" || xfProto === "https"
        ? xfProto
        : host.startsWith("localhost") || host.startsWith("127.0.0.1")
          ? "http"
          : "https";
    try {
      return new URL(`${proto}://${host}`).origin;
    } catch {
      /* fall through */
    }
  }
  try {
    return new URL(req.url).origin;
  } catch {
    return null;
  }
}

export function isAllowedRequestOrigin(origin: string | null): boolean {
  if (!origin || origin === "null") return true;
  const allowed = allowedOrigins();
  /** W produkcji bez allowlist ryzykowne jest przepuszczanie dowolnego Origin. */
  if (allowed.size === 0) return process.env.NODE_ENV !== "production";
  try {
    return allowed.has(new URL(origin).origin);
  } catch {
    return false;
  }
}

function timingSafeEqStrings(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, "utf8");
    const bb = Buffer.from(b, "utf8");
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

function originForbiddenResponse(): NextResponse {
  return NextResponse.json(
    {
      error:
        "Żądanie pochodzi z niedozwolonej witryny. Otwórz aplikację z adresu ustawionego w konfiguracji (np. produkcja lub localhost) i spróbuj ponownie.",
    },
    { status: 403 },
  );
}

/**
 * Ochrona CSRF (double-submit cookie + allowlista Origin).
 * Same-origin: Origin vs Host / X-Forwarded-Host (nie tylko `req.url` — krytyczne na Renderze).
 * Zwraca `NextResponse` z błędem albo `null`, gdy OK.
 */
export function assertCsrf(req: Request): NextResponse | null {
  const method = req.method.toUpperCase();
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) return null;

  const origin = req.headers.get("origin");
  if (origin) {
    try {
      const publicOrigin = requestPublicOrigin(req);
      const gotOrigin = new URL(origin).origin;
      if (publicOrigin && gotOrigin === publicOrigin) {
        /* same-origin za proxy — OK */
      } else if (gotOrigin !== new URL(req.url).origin && !isAllowedRequestOrigin(origin)) {
        return originForbiddenResponse();
      }
    } catch {
      if (!isAllowedRequestOrigin(origin)) {
        return originForbiddenResponse();
      }
    }
  }

  const cookieTok = parseCookieHeader(req.headers.get("cookie"), CSRF_COOKIE_NAME);
  const headerTok =
    req.headers.get("x-xsrf-token") ??
    req.headers.get("x-csrf-token") ??
    "";

  if (!cookieTok || !headerTok || !timingSafeEqStrings(cookieTok, headerTok)) {
    return NextResponse.json(
      {
        error:
          "Sesja bezpieczeństwa wygasła lub okno było otwarte zbyt długo. Odśwież stronę i wykonaj czynność jeszcze raz.",
      },
      { status: 403 },
    );
  }

  return null;
}

/**
 * Publiczny endpoint analytics — bez sesji; wymuszamy sensowny Origin / Sec-Fetch-Site.
 */
export function assertAnalyticsOrigin(req: Request): NextResponse | null {
  const origin = req.headers.get("origin");
  if (origin) {
    try {
      const publicOrigin = requestPublicOrigin(req);
      const gotOrigin = new URL(origin).origin;
      if (publicOrigin && gotOrigin === publicOrigin) {
        /* same-origin za proxy — OK */
      } else if (!isAllowedRequestOrigin(origin)) {
        return NextResponse.json(
          {
            error:
              "Źródło żądania nie jest na liście dozwolonych adresów. Sprawdź konfigurację środowiska.",
          },
          { status: 403 },
        );
      }
    } catch {
      if (!isAllowedRequestOrigin(origin)) {
        return NextResponse.json(
          {
            error:
              "Źródło żądania nie jest na liście dozwolonych adresów. Sprawdź konfigurację środowiska.",
          },
          { status: 403 },
        );
      }
    }
  }
  const secFetchSite = req.headers.get("sec-fetch-site");
  if (secFetchSite && !["same-origin", "same-site"].includes(secFetchSite)) {
    return NextResponse.json(
      { error: "To żądanie nie może być wykonane z tej witryny (polityka przeglądarki)." },
      { status: 403 },
    );
  }
  return null;
}

export function newCsrfToken(): string {
  return randomBytes(32).toString("hex");
}
