import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getServerSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ pending: false });

  const db = getDb();
  const row = db
    .prepare(
      `SELECT m.id, m.match_date, m.match_time, m.location
       FROM matches m
       JOIN match_signups s ON s.match_id = m.id
       WHERE s.user_id = ?
         AND m.played = 1
         AND date('now') <= date(m.match_date, '+7 days')
         AND NOT EXISTS (
               SELECT 1 FROM match_stats st
               WHERE st.user_id = ? AND st.match_id = m.id
         )
       ORDER BY m.match_date DESC, m.match_time DESC
       LIMIT 1`
    )
    .get(session.userId, session.userId) as
    | { id: number; match_date: string; match_time: string; location: string }
    | undefined;

  if (row) {
    return NextResponse.json({
      pending: true,
      match_id: row.id,
      date: row.match_date,
      time: row.match_time,
      location: row.location,
    });
  }
  return NextResponse.json({ pending: false });
}
