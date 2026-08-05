import webpush from "web-push";
import { getAppBaseUrl } from "@/lib/app-url";
import { getDb } from "@/lib/db";

export type WebPushSubscriptionKeys = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

let vapidConfigured = false;

function readVapidKeys(): { publicKey: string; privateKey: string } | null {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey };
}

export function isWebPushConfigured(): boolean {
  return readVapidKeys() != null;
}

export function getVapidPublicKey(): string | null {
  return readVapidKeys()?.publicKey ?? null;
}

function ensureVapid(): boolean {
  const keys = readVapidKeys();
  if (!keys) return false;
  if (!vapidConfigured) {
    const subject =
      process.env.VAPID_SUBJECT?.trim() || getAppBaseUrl() || "mailto:admin@localhost";
    webpush.setVapidDetails(subject, keys.publicKey, keys.privateKey);
    vapidConfigured = true;
  }
  return true;
}

export async function sendWebPushToSubscription(
  sub: WebPushSubscriptionKeys,
  payload: { title: string; body: string; data?: Record<string, string> }
): Promise<"ok" | "gone" | "error"> {
  if (!ensureVapid()) return "error";

  try {
    await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      },
      JSON.stringify({
        title: payload.title,
        body: payload.body,
        data: payload.data ?? {},
      }),
      { TTL: 60 * 60 * 24, urgency: "high" }
    );
    return "ok";
  } catch (e: unknown) {
    const statusCode =
      e && typeof e === "object" && "statusCode" in e
        ? Number((e as { statusCode: number }).statusCode)
        : 0;
    if (statusCode === 404 || statusCode === 410) {
      return "gone";
    }
    console.error("[web-push] send failed", statusCode || e);
    return "error";
  }
}

export async function sendWebPushToUserIds(args: {
  userIds: number[];
  title: string;
  body: string;
  data?: Record<string, string>;
}): Promise<void> {
  if (!isWebPushConfigured() || args.userIds.length === 0) return;

  const uniqueIds = [...new Set(args.userIds.filter((id) => Number.isFinite(id) && id > 0))];
  if (uniqueIds.length === 0) return;

  const db = await getDb();
  const placeholders = uniqueIds.map(() => "?").join(",");
  const rows = (await db
    .prepare(
      `SELECT endpoint, p256dh, auth
       FROM push_subscriptions
       WHERE user_id IN (${placeholders})`
    )
    .all(...uniqueIds)) as WebPushSubscriptionKeys[];

  if (rows.length === 0) return;

  let sent = 0;
  for (const row of rows) {
    const result = await sendWebPushToSubscription(row, {
      title: args.title,
      body: args.body,
      data: args.data,
    });
    if (result === "ok") sent++;
    if (result === "gone") {
      await db.prepare("DELETE FROM push_subscriptions WHERE endpoint = ?").run(row.endpoint);
    }
  }
  console.log(`[web-push] Wysłano ${sent}/${rows.length} powiadomień Web Push.`);
}
