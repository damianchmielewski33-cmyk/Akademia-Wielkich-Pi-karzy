import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-helpers";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

type DeviceAgg = {
  user_id: number;
  has_android: number;
  has_ios_native: number;
  android_last_at: string | null;
  ios_native_last_at: string | null;
};

type PushAgg = {
  user_id: number;
  ios_pwa_last_at: string | null;
};

type UserRow = {
  id: number;
  first_name: string;
  last_name: string;
  zawodnik: string;
  profile_photo_path: string | null;
};

function maxIso(a: string | null | undefined, b: string | null | undefined): string | null {
  if (!a) return b ?? null;
  if (!b) return a;
  return a >= b ? a : b;
}

/**
 * Lista graczy z sygnałem instalacji aplikacji mobilnej:
 * - Android: token FCM w `user_devices` (aplikacja natywna)
 * - iOS: token FCM `platform=ios` albo subskrypcja Web Push z UA iPhone/iPad (PWA na ekranie głównym)
 */
export async function GET(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  const filter = (url.searchParams.get("filter") ?? "installed").toLowerCase();

  const db = await getDb();

  const users = (await db
    .prepare(
      `SELECT id, first_name, last_name, player_alias AS zawodnik, profile_photo_path
       FROM users
       WHERE COALESCE(is_temporary, 0) = 0
         AND COALESCE(is_admin, 0) = 0
       ORDER BY last_name COLLATE NOCASE, first_name COLLATE NOCASE`
    )
    .all()) as UserRow[];

  const devices = (await db
    .prepare(
      `SELECT
         user_id,
         MAX(CASE WHEN platform = 'android' THEN 1 ELSE 0 END) AS has_android,
         MAX(CASE WHEN platform = 'ios' THEN 1 ELSE 0 END) AS has_ios_native,
         MAX(CASE WHEN platform = 'android' THEN updated_at END) AS android_last_at,
         MAX(CASE WHEN platform = 'ios' THEN updated_at END) AS ios_native_last_at
       FROM user_devices
       GROUP BY user_id`
    )
    .all()) as DeviceAgg[];

  const iosPush = (await db
    .prepare(
      `SELECT
         user_id,
         MAX(updated_at) AS ios_pwa_last_at
       FROM push_subscriptions
       WHERE lower(COALESCE(user_agent, '')) LIKE '%iphone%'
          OR lower(COALESCE(user_agent, '')) LIKE '%ipad%'
          OR lower(COALESCE(user_agent, '')) LIKE '%ipod%'
       GROUP BY user_id`
    )
    .all()) as PushAgg[];

  const deviceByUser = new Map(devices.map((d) => [d.user_id, d]));
  const iosPushByUser = new Map(iosPush.map((p) => [p.user_id, p]));

  const players = users.map((u) => {
    const d = deviceByUser.get(u.id);
    const p = iosPushByUser.get(u.id);
    const android = Boolean(d?.has_android);
    const ios = Boolean(d?.has_ios_native) || Boolean(p?.ios_pwa_last_at);
    const androidLastAt = d?.android_last_at ?? null;
    const iosLastAt = maxIso(d?.ios_native_last_at, p?.ios_pwa_last_at);
    const lastSeenAt = maxIso(androidLastAt, iosLastAt);
    return {
      id: u.id,
      first_name: u.first_name,
      last_name: u.last_name,
      zawodnik: u.zawodnik,
      profile_photo_path: u.profile_photo_path,
      android,
      ios,
      ios_source: d?.has_ios_native
        ? ("native" as const)
        : p?.ios_pwa_last_at
          ? ("pwa" as const)
          : null,
      android_last_at: androidLastAt,
      ios_last_at: iosLastAt,
      last_seen_at: lastSeenAt,
    };
  });

  const summary = {
    players: players.length,
    with_android: players.filter((p) => p.android).length,
    with_ios: players.filter((p) => p.ios).length,
    with_any: players.filter((p) => p.android || p.ios).length,
    without: players.filter((p) => !p.android && !p.ios).length,
  };

  let filtered = players;
  if (q) {
    filtered = filtered.filter((p) => {
      const hay = `${p.first_name} ${p.last_name} ${p.last_name} ${p.first_name} ${p.zawodnik}`.toLowerCase();
      return hay.includes(q);
    });
  }

  switch (filter) {
    case "android":
      filtered = filtered.filter((p) => p.android);
      break;
    case "ios":
      filtered = filtered.filter((p) => p.ios);
      break;
    case "none":
      filtered = filtered.filter((p) => !p.android && !p.ios);
      break;
    case "all":
      break;
    case "installed":
    default:
      filtered = filtered.filter((p) => p.android || p.ios);
      break;
  }

  filtered = [...filtered].sort((a, b) => {
    const aSeen = a.last_seen_at ?? "";
    const bSeen = b.last_seen_at ?? "";
    if (aSeen !== bSeen) return bSeen.localeCompare(aSeen);
    const byLast = a.last_name.localeCompare(b.last_name, "pl", { sensitivity: "base" });
    if (byLast !== 0) return byLast;
    return a.first_name.localeCompare(b.first_name, "pl", { sensitivity: "base" });
  });

  return NextResponse.json({ summary, players: filtered });
}
