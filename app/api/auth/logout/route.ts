import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";

export async function POST() {
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}

export async function GET(req: Request) {
  await clearSessionCookie();
  const url = new URL("/", req.url);
  return NextResponse.redirect(url);
}
