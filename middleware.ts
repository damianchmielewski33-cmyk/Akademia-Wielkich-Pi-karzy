import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import {
  CLIENT_STORAGE_CLEANUP_COOKIE,
  PREVIEW_BLOCKED_COOKIE,
  PREVIEW_BLOCKED_QUERY_PARAM,
  SESSION_COOKIE,
  SHARE_LINK_QUERY_PARAM,
} from "@/lib/constants";
import { getAuthSecretKey } from "@/lib/auth-secret";

const PATHNAME_HEADER = "x-pathname";
const PREVIEW_HEADER = "x-preview-blocked";

/** Przekazuje bieżący pathname do layoutu (np. bramka wymuszenia ustawienia PIN-u). */
function nextWithPathname(request: NextRequest, extraHeaders?: Record<string, string>): NextResponse {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(PATHNAME_HEADER, request.nextUrl.pathname);
  if (extraHeaders) {
    for (const [k, v] of Object.entries(extraHeaders)) requestHeaders.set(k, v);
  }
  return NextResponse.next({ request: { headers: requestHeaders } });
}

/**
 * Udostępnione linki (?awp_share=1): unieważniamy ciasteczko sesji i przekierowujemy na ten sam URL bez parametru,
 * żeby odbiorca (inna przeglądarka / urządzenie) nie dziedziczył sesji z oryginału.
 * Dodatkowo ustawiamy krótkotrwałe ciasteczko sygnalizujące czyszczenie sessionStorage/localStorage po stronie klienta.
 */
export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  if (
    searchParams.get(SHARE_LINK_QUERY_PARAM) === "1" &&
    !pathname.startsWith("/_next")
  ) {
    const url = request.nextUrl.clone();
    url.searchParams.delete(SHARE_LINK_QUERY_PARAM);
    const response = NextResponse.redirect(url);
    response.cookies.set(SESSION_COOKIE, "", {
      maxAge: 0,
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    response.cookies.set(CLIENT_STORAGE_CLEANUP_COOKIE, "1", {
      maxAge: 120,
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    return response;
  }

  if (pathname.startsWith("/panel-admina")) {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    if (!token) {
      const u = new URL("/login", request.url);
      u.searchParams.set("next", "/panel-admina");
      return NextResponse.redirect(u);
    }
    try {
      await jwtVerify(token, getAuthSecretKey());
    } catch {
      const u = new URL("/login", request.url);
      u.searchParams.set("next", "/panel-admina");
      return NextResponse.redirect(u);
    }
  }

  const previewBlocked =
    searchParams.get(PREVIEW_BLOCKED_QUERY_PARAM) === "1" ||
    request.cookies.get(PREVIEW_BLOCKED_COOKIE)?.value === "1";

  const response = previewBlocked
    ? nextWithPathname(request, { [PREVIEW_HEADER]: "1" })
    : nextWithPathname(request);

  if (searchParams.get(PREVIEW_BLOCKED_QUERY_PARAM) === "1") {
    response.cookies.set(PREVIEW_BLOCKED_COOKIE, "1", {
      maxAge: 60 * 30,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
    });
  }

  return response;
}

export const config = {
  matcher: [
    "/panel-admina/:path*",
    /*
     * Udostępnione linki mogą trafiać na dowolną stronę (terminarz, składy itd.).
     * Wykluczamy API, pliki statyczne Next.js oraz zasoby z rozszerzeniem (np. .ico, .svg).
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
