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
      `SELECT a.action, a.timestamp
       FROM activity_log a
       ORDER BY a.id DESC
       LIMIT 25`
    )
    .all() as { action: string; timestamp: string }[];

  const list = rows.map((r) => ({
    text: r.action,
    time: r.timestamp,
  }));

  if (list.length === 0) {
    return NextResponse.json([
      { text: "System uruchomiony", time: new Date().toISOString().slice(0, 16).replace("T", " ") },
    ]);
  }

  return NextResponse.json(list);
}
