import { BOOKING_ACCESS_COOKIE, BOOKING_ACCESS_MAX_AGE_SEC } from "@/lib/constants";

const ACCESS_TOKEN_RE = /^[a-f0-9]{32,64}$/i;

export function isBookingAccessToken(value: string | null | undefined): value is string {
  return Boolean(value && ACCESS_TOKEN_RE.test(value.trim()));
}

export function bookingAccessCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: BOOKING_ACCESS_MAX_AGE_SEC,
    secure: process.env.NODE_ENV === "production",
  };
}

function normalizeToken(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim() ?? "";
  return isBookingAccessToken(trimmed) ? trimmed : null;
}

export function readBookingAccessToken(req: Request, extra?: string | null): string | null {
  const fromExtra = normalizeToken(extra);
  if (fromExtra) return fromExtra;
  try {
    const url = new URL(req.url);
    const fromQuery = normalizeToken(url.searchParams.get("token"));
    if (fromQuery) return fromQuery;
  } catch {
    /* ignore */
  }
  const cookie = req.headers.get("cookie") ?? "";
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${BOOKING_ACCESS_COOKIE}=([^;]+)`));
  const fromCookie = match?.[1] ? decodeURIComponent(match[1]).trim() : "";
  return normalizeToken(fromCookie);
}

export { BOOKING_ACCESS_COOKIE };
