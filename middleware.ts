import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { SESSION_COOKIE } from "@/lib/constants";
import { getAuthSecretKey } from "@/lib/auth-secret";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/panel-admina")) {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    if (!token) {
      const u = new URL("/login", request.url);
      u.searchParams.set("next", "/panel-admina");
      return NextResponse.redirect(u);
    }
    try {
      const { payload } = await jwtVerify(token, getAuthSecretKey());
      if (payload.adm !== 1) {
        return new NextResponse("Brak dostępu", { status: 403 });
      }
    } catch {
      const u = new URL("/login", request.url);
      u.searchParams.set("next", "/panel-admina");
      return NextResponse.redirect(u);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/panel-admina/:path*"],
};
