import { SignJWT, importPKCS8 } from "jose";
import { getDb } from "@/lib/db";

type FirebaseServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
};

type CachedAccessToken = {
  token: string;
  expiresAtMs: number;
};

let cachedAccess: CachedAccessToken | null = null;

function readServiceAccount(): FirebaseServiceAccount | null {
  const jsonRaw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (jsonRaw) {
    try {
      const parsed = JSON.parse(jsonRaw) as FirebaseServiceAccount;
      if (parsed.project_id && parsed.client_email && parsed.private_key) {
        return {
          project_id: parsed.project_id,
          client_email: parsed.client_email,
          private_key: parsed.private_key.replace(/\\n/g, "\n"),
        };
      }
    } catch (e) {
      console.error("[push] FIREBASE_SERVICE_ACCOUNT_JSON nieprawidłowy JSON", e);
    }
  }

  const project_id = process.env.FIREBASE_PROJECT_ID?.trim();
  const client_email = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const private_key = process.env.FIREBASE_PRIVATE_KEY?.trim()?.replace(/\\n/g, "\n");
  if (project_id && client_email && private_key) {
    return { project_id, client_email, private_key };
  }
  return null;
}

export function isPushConfigured(): boolean {
  return readServiceAccount() != null;
}

async function getAccessToken(sa: FirebaseServiceAccount): Promise<string> {
  const now = Date.now();
  if (cachedAccess && cachedAccess.expiresAtMs > now + 60_000) {
    return cachedAccess.token;
  }

  const key = await importPKCS8(sa.private_key, "RS256");
  const assertion = await new SignJWT({
    scope: "https://www.googleapis.com/auth/firebase.messaging",
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(sa.client_email)
    .setSubject(sa.client_email)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(key);

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OAuth token error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedAccess = {
    token: data.access_token,
    expiresAtMs: now + (data.expires_in ?? 3600) * 1000,
  };
  return data.access_token;
}

async function sendFcmToToken(args: {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}): Promise<"ok" | "invalid" | "error"> {
  const sa = readServiceAccount();
  if (!sa) return "error";

  try {
    const accessToken = await getAccessToken(sa);
    const res = await fetch(
      `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            token: args.token,
            notification: {
              title: args.title,
              body: args.body,
            },
            data: args.data,
            android: {
              priority: "HIGH",
              notification: {
                channel_id: "matches",
                default_sound: true,
                default_vibrate_timings: true,
                notification_priority: "PRIORITY_MAX",
                visibility: "PUBLIC",
              },
            },
          },
        }),
      }
    );

    if (res.ok) return "ok";

    const text = await res.text();
    if (
      res.status === 404 ||
      text.includes("UNREGISTERED") ||
      text.includes("INVALID_ARGUMENT") ||
      text.includes("NOT_FOUND")
    ) {
      console.warn("[push] nieważny token FCM — usuwam", args.token.slice(0, 12));
      return "invalid";
    }
    console.error("[push] FCM error", res.status, text);
    return "error";
  } catch (e) {
    console.error("[push] send failed", e);
    return "error";
  }
}

export async function sendPushToUserIds(args: {
  userIds: number[];
  title: string;
  body: string;
  data?: Record<string, string>;
}): Promise<void> {
  if (!isPushConfigured() || args.userIds.length === 0) return;

  const uniqueIds = [...new Set(args.userIds.filter((id) => Number.isFinite(id) && id > 0))];
  if (uniqueIds.length === 0) return;

  const db = await getDb();
  const placeholders = uniqueIds.map(() => "?").join(",");
  const rows = (await db
    .prepare(
      `SELECT d.fcm_token, d.user_id
       FROM user_devices d
       WHERE d.user_id IN (${placeholders})`
    )
    .all(...uniqueIds)) as { fcm_token: string; user_id: number }[];

  if (rows.length === 0) {
    console.log("[push] Brak zarejestrowanych urządzeń dla wskazanych użytkowników.");
    return;
  }

  let sent = 0;
  for (const row of rows) {
    const result = await sendFcmToToken({
      token: row.fcm_token,
      title: args.title,
      body: args.body,
      data: args.data,
    });
    if (result === "ok") sent++;
    if (result === "invalid") {
      await db.prepare("DELETE FROM user_devices WHERE fcm_token = ?").run(row.fcm_token);
    }
  }
  console.log(`[push] Wysłano ${sent}/${rows.length} powiadomień.`);
}

/** Push do wszystkich użytkowników z zarejestrowanym urządzeniem (np. nowy mecz). */
export async function sendPushToConsentingUsers(args: {
  title: string;
  body: string;
  data?: Record<string, string>;
}): Promise<void> {
  if (!isPushConfigured()) {
    console.log("[push] FCM nie skonfigurowane — pomijam wysyłkę.");
    return;
  }

  const db = await getDb();
  const rows = (await db
    .prepare(
      `SELECT DISTINCT user_id AS id FROM user_devices`
    )
    .all()) as { id: number }[];

  await sendPushToUserIds({
    userIds: rows.map((r) => r.id),
    title: args.title,
    body: args.body,
    data: args.data,
  });
}
