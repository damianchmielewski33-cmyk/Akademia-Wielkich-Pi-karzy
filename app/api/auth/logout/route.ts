import { NextResponse } from "next/server";
import { clearSessionCookie, getServerSession } from "@/lib/auth";
import { logActivity } from "@/lib/db";

export const runtime = "nodejs";

export async function POST() {
  const session = await getServerSession();
  if (session) logActivity(session.userId, "Wylogował się");
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}

export async function GET(req: Request) {
  const session = await getServerSession();
  if (session) logActivity(session.userId, "Wylogował się");
  await clearSessionCookie();
  const url = new URL("/", req.url);
  return NextResponse.redirect(url);
}
