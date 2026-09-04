import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Embed AWP wymaga braku X-Frame-Options: DENY.
 * Stare deploye / domyślne nagłówki czasem go dokładają — tu go zdejmujemy.
 * Osadzanie ogranicza wyłącznie CSP frame-ancestors (next.config).
 */
export function middleware(_request: NextRequest) {
  const response = NextResponse.next();
  response.headers.delete("X-Frame-Options");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|webmanifest)$).*)"],
};
