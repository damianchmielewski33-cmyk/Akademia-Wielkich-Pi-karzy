import { NextResponse } from "next/server";
import { formatActivityActorLabel, formatActivityTimePl } from "@/lib/activity-display";
import { requireAdmin } from "@/lib/api-helpers";
import { localYmdInclusiveUtcRange } from "@/lib/analytics-date-range";
import { SCREEN_LABELS } from "@/lib/analytics-screen";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

function parseRange(
  searchParams: URLSearchParams
): { ok: true; fromDate: string; toDate: string; fromIso: string; toIso: string } | { ok: false } {
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (!from || !to || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return { ok: false };
  }
  if (from > to) return { ok: false };
  const { fromIso, toIso } = localYmdInclusiveUtcRange(from, to);
  return {
    ok: true,
    fromDate: from,
    toDate: to,
    fromIso,
    toIso,
  };
}

export async function GET(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const range = parseRange(new URL(req.url).searchParams);
  if (!range.ok) {
    return NextResponse.json(
      { error: "Podaj zakres dat: from i to w formacie YYYY-MM-DD" },
      { status: 400 }
    );
  }
  const { fromDate, toDate, fromIso, toIso } = range;
  const db = await getDb();

  const screenRows = await db
    .prepare(
      `SELECT screen_key,
              COUNT(*) AS total_views,
              COUNT(DISTINCT CASE WHEN user_id IS NOT NULL THEN CAST(user_id AS TEXT)
                                  ELSE visitor_id END) AS unique_visitors
       FROM page_views
       WHERE created_at >= ? AND created_at <= ?
       GROUP BY screen_key
       ORDER BY total_views DESC`
    )
    .all(fromIso, toIso) as { screen_key: string; total_views: number; unique_visitors: number }[];

  const totals = await db
    .prepare(
      `SELECT COUNT(*) AS total_views,
              COUNT(DISTINCT CASE WHEN user_id IS NOT NULL THEN CAST(user_id AS TEXT)
                                  ELSE visitor_id END) AS unique_visitors
       FROM page_views
       WHERE created_at >= ? AND created_at <= ?`
    )
    .get(fromIso, toIso) as { total_views: number; unique_visitors: number };

  const anonViews = await db
    .prepare(
      `SELECT COUNT(*) AS c FROM page_views
       WHERE created_at >= ? AND created_at <= ? AND user_id IS NULL`
    )
    .get(fromIso, toIso) as { c: number };

  const authViews = await db
    .prepare(
      `SELECT COUNT(*) AS c FROM page_views
       WHERE created_at >= ? AND created_at <= ? AND user_id IS NOT NULL`
    )
    .get(fromIso, toIso) as { c: number };

  const totalPlayersRow = await db
    .prepare(`SELECT COUNT(*) AS c FROM users WHERE is_admin = 0`)
    .get() as { c: number };
  const totalPlayers = totalPlayersRow.c;

  const playersVisitedRow = await db
    .prepare(
      `SELECT COUNT(DISTINCT pv.user_id) AS c
       FROM page_views pv
       INNER JOIN users u ON u.id = pv.user_id
       WHERE pv.created_at >= ? AND pv.created_at <= ?
         AND u.is_admin = 0`
    )
    .get(fromIso, toIso) as { c: number };
  const playersVisited = playersVisitedRow.c;
  const playersNotVisited = Math.max(0, totalPlayers - playersVisited);
  const pctPlayersActive =
    totalPlayers > 0 ? Math.round((playersVisited / totalPlayers) * 1000) / 10 : null;
  const pctPlayersInactive =
    totalPlayers > 0 ? Math.round((playersNotVisited / totalPlayers) * 1000) / 10 : null;

  const selfRegRow = await db
    .prepare(
      `SELECT COUNT(*) AS c FROM activity_log
       WHERE datetime(timestamp) >= datetime(?) AND datetime(timestamp) <= datetime(?)
         AND user_id IS NOT NULL
         AND (action LIKE 'Zarejestrował konto%' OR action LIKE 'Zarejestrował konto i zalogował%')`
    )
    .get(fromIso, toIso) as { c: number };
  const selfRegistrations = selfRegRow.c;

  const terminarzViewersRow = await db
    .prepare(
      `SELECT COUNT(DISTINCT pv.user_id) AS c
       FROM page_views pv
       INNER JOIN users u ON u.id = pv.user_id
       WHERE pv.screen_key = 'terminarz'
         AND pv.created_at >= ? AND pv.created_at <= ?
         AND u.is_admin = 0`
    )
    .get(fromIso, toIso) as { c: number };
  const terminarzViewers = terminarzViewersRow.c;

  const terminarzSignedRow = await db
    .prepare(
      `SELECT COUNT(DISTINCT pv.user_id) AS c
       FROM page_views pv
       INNER JOIN users u ON u.id = pv.user_id
       WHERE pv.screen_key = 'terminarz'
         AND pv.created_at >= ? AND pv.created_at <= ?
         AND u.is_admin = 0
         AND EXISTS (
           SELECT 1 FROM match_signups ms
           WHERE ms.user_id = pv.user_id
             AND datetime(ms.created_at) >= datetime(?) AND datetime(ms.created_at) <= datetime(?)
         )`
    )
    .get(fromIso, toIso, fromIso, toIso) as { c: number };
  const terminarzSignedInRange = terminarzSignedRow.c;
  const pctTerminarzToSignup =
    terminarzViewers > 0
      ? Math.round((terminarzSignedInRange / terminarzViewers) * 1000) / 10
      : null;

  const screens = screenRows.map((r) => ({
    screen_key: r.screen_key,
    label: SCREEN_LABELS[r.screen_key] ?? r.screen_key,
    total_views: r.total_views,
    unique_visitors: r.unique_visitors,
  }));

  const activityRows = (await db
    .prepare(
      `SELECT a.id, a.action, a.timestamp, a.user_id,
              u.first_name, u.last_name, u.player_alias
       FROM activity_log a
       LEFT JOIN users u ON u.id = a.user_id
       WHERE datetime(a.timestamp) >= datetime(?) AND datetime(a.timestamp) <= datetime(?)
       ORDER BY a.id DESC
       LIMIT 400`
    )
    .all(fromIso, toIso)) as {
    id: number;
    action: string;
    timestamp: string;
    user_id: number | null;
    first_name: string | null;
    last_name: string | null;
    player_alias: string | null;
  }[];

  const activity_events = activityRows.map((r) => ({
    id: r.id,
    action: r.action,
    timestamp: r.timestamp,
    actor_label: formatActivityActorLabel({
      user_id: r.user_id,
      first_name: r.first_name,
      last_name: r.last_name,
      player_alias: r.player_alias,
    }),
    time_display: formatActivityTimePl(r.timestamp),
  }));

  return NextResponse.json({
    range: { from: fromDate, to: toDate },
    totals: {
      total_views: totals.total_views,
      unique_visitors: totals.unique_visitors,
      anonymous_views: anonViews.c,
      authenticated_views: authViews.c,
    },
    players: {
      total_non_admin: totalPlayers,
      visited_in_range: playersVisited,
      not_visited_in_range: playersNotVisited,
      pct_visited: pctPlayersActive,
      pct_not_visited: pctPlayersInactive,
      self_service_registrations_in_range: selfRegistrations,
    },
    terminarz_funnel: {
      distinct_players_viewed: terminarzViewers,
      distinct_players_viewed_and_signed_match_in_range: terminarzSignedInRange,
      pct_signed_after_view: pctTerminarzToSignup,
    },
    screens,
    activity_events,
  });
}
