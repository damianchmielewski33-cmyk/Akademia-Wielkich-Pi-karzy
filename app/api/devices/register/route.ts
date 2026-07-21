import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/api-helpers";

export const runtime = "nodejs";

const bodySchema = z.object({
  fcm_token: z.string().trim().min(20).max(4096),
  platform: z.enum(["android", "ios"]).optional().default("android"),
});

/** Rejestracja tokena FCM po zalogowaniu / odświeżeniu tokena. */
export async function POST(req: Request) {
  const gate = await requireUser();
  if (!gate.ok) return gate.response;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Nieprawidłowe JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Walidacja nie powiodła się", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const db = await getDb();
  const { fcm_token, platform } = parsed.data;
  const userId = gate.session.userId;

  await db
    .prepare(
      `INSERT INTO user_devices (user_id, fcm_token, platform, updated_at)
       VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT(fcm_token) DO UPDATE SET
         user_id = excluded.user_id,
         platform = excluded.platform,
         updated_at = datetime('now')`
    )
    .run(userId, fcm_token, platform);

  await db
    .prepare("UPDATE users SET push_notifications_consent = 1 WHERE id = ?")
    .run(userId);

  return NextResponse.json({ ok: true });
}

/** Usunięcie tokena przy wylogowaniu / wyłączeniu push. */
export async function DELETE(req: Request) {
  const gate = await requireUser();
  if (!gate.ok) return gate.response;

  let json: unknown = {};
  try {
    json = await req.json();
  } catch {
    json = {};
  }
  const tokenSchema = z.object({
    fcm_token: z.string().trim().min(20).max(4096).optional(),
    revoke_consent: z.boolean().optional(),
  });
  const parsed = tokenSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Walidacja nie powiodła się", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const db = await getDb();
  const userId = gate.session.userId;

  if (parsed.data.fcm_token) {
    await db
      .prepare("DELETE FROM user_devices WHERE user_id = ? AND fcm_token = ?")
      .run(userId, parsed.data.fcm_token);
  } else {
    await db.prepare("DELETE FROM user_devices WHERE user_id = ?").run(userId);
  }

  if (parsed.data.revoke_consent) {
    await db
      .prepare("UPDATE users SET push_notifications_consent = 0 WHERE id = ?")
      .run(userId);
  }

  return NextResponse.json({ ok: true });
}
