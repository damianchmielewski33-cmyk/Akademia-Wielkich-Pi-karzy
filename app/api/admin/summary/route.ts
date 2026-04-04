import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/api-helpers";

export const runtime = "nodejs";

export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const db = getDb();
  const players = (db.prepare("SELECT COUNT(*) AS c FROM users").get() as { c: number }).c;
  const matches = (db.prepare("SELECT COUNT(*) AS c FROM matches").get() as { c: number }).c;
  const stats = (db.prepare("SELECT COUNT(*) AS c FROM match_stats").get() as { c: number }).c;
  return NextResponse.json({ players, matches, stats });
}
