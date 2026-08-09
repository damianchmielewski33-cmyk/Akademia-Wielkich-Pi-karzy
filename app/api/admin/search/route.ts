import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/api-helpers";
import {
  isAdminTestModeActive,
  sqlMatchTestFilter,
  sqlUserTestFilter,
} from "@/lib/test-mode";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 1) {
    return NextResponse.json({ users: [], matches: [], settings: [] });
  }

  const like = `%${q.replace(/%/g, "")}%`;
  const db = await getDb();
  const testMode = await isAdminTestModeActive();

  const users = (await db
    .prepare(
      `SELECT id, first_name, last_name, player_alias AS zawodnik
       FROM users
       WHERE (${sqlUserTestFilter("", testMode)})
         AND (first_name LIKE ? OR last_name LIKE ? OR player_alias LIKE ?
          OR (first_name || ' ' || last_name) LIKE ?)
       ORDER BY first_name, last_name
       LIMIT 8`
    )
    .all(like, like, like, like)) as {
    id: number;
    first_name: string;
    last_name: string;
    zawodnik: string;
  }[];

  const matchId = Number(q);
  const matches = (await db
    .prepare(
      Number.isFinite(matchId) && String(matchId) === q
        ? `SELECT id, match_date AS date, match_time AS time, location
           FROM matches WHERE id = ? AND ${sqlMatchTestFilter("", testMode)} LIMIT 8`
        : `SELECT id, match_date AS date, match_time AS time, location
           FROM matches
           WHERE ${sqlMatchTestFilter("", testMode)}
             AND (location LIKE ? OR match_date LIKE ? OR CAST(id AS TEXT) LIKE ?)
           ORDER BY match_date DESC, match_time DESC
           LIMIT 8`
    )
    .all(
      ...(Number.isFinite(matchId) && String(matchId) === q
        ? [matchId]
        : [like, like, like])
    )) as { id: number; date: string; time: string; location: string }[];

  return NextResponse.json({ users, matches });
}
