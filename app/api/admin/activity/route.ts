import { NextResponse } from "next/server";
import { formatActivityActorLabel, formatActivityTimePl } from "@/lib/activity-display";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/api-helpers";

export const runtime = "nodejs";

export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const db = await getDb();
  const rows = (await db
    .prepare(
      `SELECT a.action, a.timestamp, a.user_id,
              u.first_name AS actor_first, u.last_name AS actor_last, u.player_alias AS actor_alias
       FROM activity_log a
       LEFT JOIN users u ON u.id = a.user_id
       ORDER BY a.id DESC
       LIMIT 25`
    )
    .all()) as {
      action: string;
      timestamp: string;
      user_id: number | null;
      actor_first: string | null;
      actor_last: string | null;
      actor_alias: string | null;
    }[];

  const list = rows.map((r) => {
    const actorLabel = formatActivityActorLabel({
      user_id: r.user_id,
      first_name: r.actor_first,
      last_name: r.actor_last,
      player_alias: r.actor_alias,
    });
    return {
      text: r.action,
      time: r.timestamp,
      actorName: actorLabel,
      actorLabel,
      timeDisplay: formatActivityTimePl(r.timestamp),
    };
  });

  return NextResponse.json(list);
}
