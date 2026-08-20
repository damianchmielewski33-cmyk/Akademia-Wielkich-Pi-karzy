import { BOOKING_ACCESS_COOKIE, BOOKING_ACCESS_MAX_AGE_SEC } from "@/lib/constants";

export function bookingAccessCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: BOOKING_ACCESS_MAX_AGE_SEC,
    secure: process.env.NODE_ENV === "production",
  };
}

export function readBookingAccessToken(req: Request, extra?: string | null): string | null {
  const fromExtra = extra?.trim();
  if (fromExtra) return fromExtra;
  try {
    const url = new URL(req.url);
    const fromQuery = url.searchParams.get("token")?.trim();
    if (fromQuery) return fromQuery;
  } catch {
    /* ignore */
  }
  const cookie = req.headers.get("cookie") ?? "";
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${BOOKING_ACCESS_COOKIE}=([^;]+)`));
  const fromCookie = match?.[1] ? decodeURIComponent(match[1]).trim() : "";
  return fromCookie || null;
}

export { BOOKING_ACCESS_COOKIE };
