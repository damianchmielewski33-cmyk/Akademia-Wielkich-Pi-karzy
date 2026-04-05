import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/api-helpers";

export const runtime = "nodejs";

export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT a.action, a.timestamp, u.first_name AS actor_first, u.last_name AS actor_last
       FROM activity_log a
       LEFT JOIN users u ON u.id = a.user_id
       ORDER BY a.id DESC
       LIMIT 25`
    )
    .all() as {
      action: string;
      timestamp: string;
      actor_first: string | null;
      actor_last: string | null;
    }[];

  const list = rows.map((r) => {
    const name =
      r.actor_first != null && r.actor_first !== "" && r.actor_last != null && r.actor_last !== ""
        ? `${r.actor_first} ${r.actor_last}`.trim()
        : null;
    return {
      text: r.action,
      time: r.timestamp,
      actorName: name,
    };
  });

  return NextResponse.json(list);
}
