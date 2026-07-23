import { connection, NextResponse } from "next/server";
import { createSessionToken } from "@/lib/auth";
import { verifyAppBridgeTicket } from "@/lib/app-bridge";
import { SESSION_COOKIE } from "@/lib/constants";
import { getDb } from "@/lib/db";
import { checkRateLimitDistributed } from "@/lib/rate-limit-db";
import { rateLimitKey, rateLimitedResponse, RATE } from "@/lib/rate-limit";

export const runtime = "nodejs";

type UserRow = {
  id: number;
  first_name: string;
  last_name: string;
  player_alias: string;
  is_admin: number;
  auth_version: number;
};

function sessionMaxAgeSec(rememberMe: boolean): number {
  return rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 8;
}

/**
 * WebView: konsumuje ticket z aplikacji, ustawia cookie sesji jak przy logowaniu webowym
 * i przekierowuje na docelową stronę (panel admina, galeria itd.).
 */
export async function GET(req: Request) {
  await connection();
  const rl = await checkRateLimitDistributed(
    rateLimitKey("appBridgeGo", req),
    RATE.appBridgeGo.limit,
    RATE.appBridgeGo.windowMs
  );
  if (!rl.ok) return rateLimitedResponse(rl.retryAfterSec);

  const url = new URL(req.url);
  const ticket = url.searchParams.get("ticket")?.trim() ?? "";
  if (!ticket) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const verified = await verifyAppBridgeTicket(ticket);
  if (!verified) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const db = await getDb();
  const row = (await db
    .prepare(
      `SELECT id, first_name, last_name, player_alias, is_admin, auth_version
       FROM users WHERE id = ?`
    )
    .get(verified.userId)) as UserRow | undefined;

  if (!row) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const rememberMe = true;
  const token = await createSessionToken({
    userId: row.id,
    isAdmin: row.is_admin === 1,
    firstName: row.first_name,
    lastName: row.last_name,
    zawodnik: row.player_alias,
    authVersion: row.auth_version,
    rememberMe,
  });

  const res = NextResponse.redirect(new URL(verified.nextPath, req.url));
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: sessionMaxAgeSec(rememberMe),
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
