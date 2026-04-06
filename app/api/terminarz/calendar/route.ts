import { NextResponse } from "next/server";
import { buildTerminarzIcs } from "@/lib/calendar-ics";
import { getDb, type MatchRow } from "@/lib/db";
import { SITE_NAME } from "@/lib/site";

export async function GET() {
  const db = await getDb();
  const matches = await db
    .prepare(
      `SELECT * FROM matches
       WHERE datetime(match_date || ' ' || match_time) >= datetime('now', 'localtime')
       ORDER BY match_date ASC, match_time ASC`
    )
    .all() as MatchRow[];

  const body = buildTerminarzIcs(matches, `${SITE_NAME} — terminarz`);

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="terminarz-akademia.ics"',
      "Cache-Control": "public, max-age=300",
    },
  });
}
