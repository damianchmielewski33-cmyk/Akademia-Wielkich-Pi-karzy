import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-helpers";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const db = await getDb();
  const row = (await db
    .prepare("SELECT match_notification_prompt_enabled FROM app_settings WHERE id = 1")
    .get()) as { match_notification_prompt_enabled: number } | undefined;
  return NextResponse.json({
    match_notification_prompt_enabled: (row?.match_notification_prompt_enabled ?? 0) === 1,
  });
}

export async function PUT(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const body = (await req.json().catch(() => ({}))) as {
    match_notification_prompt_enabled?: boolean;
  };
  if (typeof body.match_notification_prompt_enabled !== "boolean") {
    return NextResponse.json({ error: "Nieprawidłowe dane" }, { status: 400 });
  }
  const db = await getDb();
  await db
    .prepare(
      "UPDATE app_settings SET match_notification_prompt_enabled = ? WHERE id = 1"
    )
    .run(body.match_notification_prompt_enabled ? 1 : 0);
  return NextResponse.json({ ok: true });
}

