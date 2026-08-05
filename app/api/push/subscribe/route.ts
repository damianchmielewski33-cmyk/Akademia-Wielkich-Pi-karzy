import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/api-helpers";
import { isWebPushConfigured } from "@/lib/web-push";

export const runtime = "nodejs";

const subscribeSchema = z.object({
  endpoint: z.string().trim().url().max(2048),
  keys: z.object({
    p256dh: z.string().trim().min(20).max(512),
    auth: z.string().trim().min(8).max(256),
  }),
});

/** Zapis subskrypcji Web Push (Safari PWA / Chrome / Firefox). */
export async function POST(req: Request) {
  const gate = await requireUser();
  if (!gate.ok) return gate.response;

  if (!isWebPushConfigured()) {
    return NextResponse.json(
      { error: "Web Push nie jest skonfigurowany na serwerze." },
      { status: 503 }
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Nieprawidłowe JSON" }, { status: 400 });
  }
  const parsed = subscribeSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Walidacja nie powiodła się", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const db = await getDb();
  const userId = gate.session.userId;
  const { endpoint, keys } = parsed.data;
  const ua = req.headers.get("user-agent")?.slice(0, 512) ?? null;

  await db
    .prepare(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent, updated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(endpoint) DO UPDATE SET
         user_id = excluded.user_id,
         p256dh = excluded.p256dh,
         auth = excluded.auth,
         user_agent = excluded.user_agent,
         updated_at = datetime('now')`
    )
    .run(userId, endpoint, keys.p256dh, keys.auth, ua);

  await db
    .prepare("UPDATE users SET push_notifications_consent = 1 WHERE id = ?")
    .run(userId);

  return NextResponse.json({ ok: true });
}

/** Usunięcie subskrypcji (np. wylogowanie / utrata urządzenia). Zgoda push pozostaje włączona. */
export async function DELETE(req: Request) {
  const gate = await requireUser();
  if (!gate.ok) return gate.response;

  let json: unknown = {};
  try {
    json = await req.json();
  } catch {
    json = {};
  }
  const schema = z.object({
    endpoint: z.string().trim().url().max(2048).optional(),
  });
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Walidacja nie powiodła się", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const db = await getDb();
  const userId = gate.session.userId;

  if (parsed.data.endpoint) {
    await db
      .prepare("DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?")
      .run(userId, parsed.data.endpoint);
  } else {
    await db.prepare("DELETE FROM push_subscriptions WHERE user_id = ?").run(userId);
  }

  return NextResponse.json({ ok: true });
}
