import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { readSessionTokenFromRequest, verifySessionToken } from "@/lib/auth";
import { TEST_MODE_COOKIE, TEST_MODE_HEADER } from "@/lib/constants";
import { canOpenTestDatabase, getProdDb, getTestDb, type AppDb } from "@/lib/db";
import { isHotpayTestSessionId } from "@/lib/hotpay";

/** Czy osobna baza TEST jest dostępna (Turso TEST lub lokalny SQLite). */
export function isTestModeConfigured(): boolean {
  return canOpenTestDatabase();
}

/** Czy request ma flagę trybu testowego (cookie / header z middleware). */
export async function isTestModeCookiePresent(): Promise<boolean> {
  try {
    const h = await headers();
    if (h.get(TEST_MODE_HEADER) === "1") return true;
    const jar = await cookies();
    return jar.get(TEST_MODE_COOKIE)?.value === "1";
  } catch {
    return false;
  }
}

/**
 * Aktywny tryb testowy: ważna sesja admina + (cookie albo flaga w PROD).
 * Flaga w PROD przetrwa powrót z HotPay; izolacja danych = osobna baza TEST.
 */
export async function isAdminTestModeActive(): Promise<boolean> {
  if (!isTestModeConfigured()) return false;

  const token = await readSessionTokenFromRequest();
  if (!token) return false;

  try {
    const session = await verifySessionToken(token);
    if (!session.isAdmin) return false;

    const db = await getProdDb();
    let testModeEnabled = 0;
    try {
      const row = (await db
        .prepare(
          "SELECT is_admin, auth_version, COALESCE(test_mode_enabled, 0) AS test_mode_enabled FROM users WHERE id = ?"
        )
        .get(session.userId)) as
        | { is_admin: number; auth_version: number; test_mode_enabled: number }
        | undefined;

      if (!row || row.is_admin !== 1 || Number(row.auth_version) !== session.authVersion) {
        return false;
      }
      testModeEnabled = Number(row.test_mode_enabled) === 1 ? 1 : 0;
    } catch {
      const row = (await db
        .prepare("SELECT is_admin, auth_version FROM users WHERE id = ?")
        .get(session.userId)) as { is_admin: number; auth_version: number } | undefined;
      if (!row || row.is_admin !== 1 || Number(row.auth_version) !== session.authVersion) {
        return false;
      }
    }

    if (testModeEnabled === 1) return true;
    return await isTestModeCookiePresent();
  } catch {
    return false;
  }
}

/** Routing getDb() — true = użyj bazy TEST. */
export async function shouldUseTestDatabase(): Promise<boolean> {
  return isAdminTestModeActive();
}

export function testModeCookieOptions(enabled: boolean): {
  httpOnly: boolean;
  sameSite: "lax" | "none";
  path: string;
  maxAge: number;
  secure: boolean;
} {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    sameSite: isProd ? "none" : "lax",
    path: "/",
    maxAge: enabled ? 60 * 60 * 24 * 30 : 0,
    secure: isProd,
  };
}

export async function setTestModeCookie(enabled: boolean) {
  const jar = await cookies();
  if (enabled) {
    jar.set(TEST_MODE_COOKIE, "1", testModeCookieOptions(true));
  } else {
    jar.set(TEST_MODE_COOKIE, "", testModeCookieOptions(false));
  }
}

export function applyTestModeCookie(res: NextResponse, enabled: boolean) {
  if (enabled) {
    res.cookies.set(TEST_MODE_COOKIE, "1", testModeCookieOptions(true));
  } else {
    res.cookies.set(TEST_MODE_COOKIE, "", testModeCookieOptions(false));
  }
}

async function setProdTestModeFlag(adminUserId: number, enabled: boolean) {
  const db = await getProdDb();
  await db
    .prepare("UPDATE users SET test_mode_enabled = ? WHERE id = ? AND COALESCE(is_admin, 0) = 1")
    .run(enabled ? 1 : 0, adminUserId);
}

export async function persistAdminTestModeFlag(adminUserId: number) {
  await setProdTestModeFlag(adminUserId, true);
}

/**
 * Kopiuje admina (i podstawowe app_settings) z PROD → TEST, żeby FK / sesja działały.
 */
async function bootstrapTestDbFromProd(adminUserId: number) {
  const prod = await getProdDb();
  const test = await getTestDb();

  const prodCols = (
    (await prod.prepare("PRAGMA table_info(users)").all()) as { name: string }[]
  ).map((c) => c.name);
  const testCols = new Set(
    ((await test.prepare("PRAGMA table_info(users)").all()) as { name: string }[]).map((c) => c.name)
  );
  const cols = prodCols.filter((c) => testCols.has(c));
  if (!cols.includes("id")) {
    throw new Error("Schemat users w bazie TEST jest niekompletny (brak id)");
  }

  const placeholders = cols.map(() => "?").join(", ");
  const selectSql = `SELECT ${cols.join(", ")} FROM users WHERE id = ?`;
  const admin = (await prod.prepare(selectSql).get(adminUserId)) as Record<string, unknown> | undefined;
  if (!admin) {
    throw new Error("Nie znaleziono konta admina w bazie produkcyjnej");
  }

  const values = cols.map((c) => {
    const v = admin[c];
    if (v === undefined) return null;
    if (typeof v === "bigint") return Number(v);
    // Flaga trybu na kopii w TEST nie steruje routingiem (routing czyta PROD).
    if (c === "test_mode_enabled") return 0;
    return v;
  });

  await test.prepare("DELETE FROM users WHERE id = ?").run(adminUserId);
  try {
    await test
      .prepare(`INSERT INTO users (${cols.join(", ")}) VALUES (${placeholders})`)
      .run(...values);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(
      `Nie udało się skopiować admina do bazy TEST: ${msg}. Sprawdź TURSO_TEST_DATABASE_URL i TURSO_TEST_AUTH_TOKEN.`
    );
  }

  const settingsProdCols = (
    (await prod.prepare("PRAGMA table_info(app_settings)").all()) as { name: string }[]
  ).map((c) => c.name);
  const settingsTestCols = new Set(
    ((await test.prepare("PRAGMA table_info(app_settings)").all()) as { name: string }[]).map(
      (c) => c.name
    )
  );
  const sCols = settingsProdCols.filter((c) => settingsTestCols.has(c));
  if (sCols.length === 0 || !sCols.includes("realm")) return;

  const settings = (await prod
    .prepare(`SELECT ${sCols.join(", ")} FROM app_settings`)
    .all()) as Record<string, unknown>[];

  for (const row of settings) {
    const realm = row.realm;
    if (realm == null) continue;
    await test.prepare("DELETE FROM app_settings WHERE realm = ?").run(realm);
    try {
      await test
        .prepare(
          `INSERT INTO app_settings (${sCols.join(", ")}) VALUES (${sCols.map(() => "?").join(", ")})`
        )
        .run(
          ...sCols.map((c) => {
            const v = row[c];
            if (v === undefined) return null;
            if (typeof v === "bigint") return Number(v);
            return v;
          })
        );
    } catch (e) {
      console.error("[test-mode] bootstrap app_settings realm=", realm, e);
    }
  }
}

/** Tabele aplikacji do pełnego wyczyszczenia w bazie TEST (kolejność: dzieci → rodzice). */
const TEST_WIPE_TABLES = [
  "match_signups",
  "match_stats",
  "standalone_match_stats",
  "match_lineup_slots",
  "match_wallet_charges",
  "match_transport_messages",
  "captain_lottery_spins",
  "match_captain_lottery",
  "wallet_match_cart_items",
  "wallet_match_carts",
  "hotpay_payments",
  "wallet_transactions",
  "wallet_deposit_requests",
  "public_share_links",
  "push_subscriptions",
  "user_devices",
  "activity_log",
  "admin_messages",
  "match_participation_survey",
  "gallery_videos",
  "ad_impressions",
  "matches",
  "users",
  "ranking_seasons",
  "app_settings",
] as const;

/**
 * Czyści całą bazę TEST (nie PROD). Błędy pojedynczych tabel są ignorowane
 * (tabela może nie istnieć w starszym schemacie).
 */
export async function wipeTestDatabase(db?: AppDb): Promise<{ tables: number; rows: number }> {
  if (!canOpenTestDatabase()) {
    throw new Error("Odmowa wipe: baza TEST nie jest bezpiecznie skonfigurowana (sprawdź TURSO_TEST_* ≠ PROD).");
  }
  const conn = db ?? (await getTestDb());
  try {
    await conn.exec("PRAGMA foreign_keys = OFF");
  } catch {
    /* */
  }

  let tables = 0;
  let rows = 0;
  for (const table of TEST_WIPE_TABLES) {
    try {
      const r = await conn.prepare(`DELETE FROM ${table}`).run();
      tables += 1;
      rows += Number(r.changes ?? 0);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!/no such table|nie ma takiej tabeli/i.test(msg)) {
        console.warn(`[test-mode] wipe ${table}:`, msg);
      }
    }
  }

  try {
    await conn.exec("PRAGMA foreign_keys = ON");
  } catch {
    /* */
  }

  return { tables, rows };
}

/** @deprecated Alias — wipe całej bazy TEST. */
export async function wipeTestModeData(db?: AppDb): Promise<{
  matches: number;
  users: number;
  wallet_tx: number;
  hotpay: number;
}> {
  const wiped = await wipeTestDatabase(db);
  return {
    matches: wiped.rows,
    users: 0,
    wallet_tx: 0,
    hotpay: 0,
  };
}

export async function setAdminTestModeEnabled(
  adminUserId: number,
  enabled: boolean
): Promise<{ wipedTables?: number; wipedRows?: number }> {
  if (enabled) {
    if (!isTestModeConfigured()) {
      throw new Error(
        "Baza TEST nie jest skonfigurowana (TURSO_TEST_DATABASE_URL lub lokalny SQLite bez Turso PROD)."
      );
    }
    await getTestDb(); // schema init
    await bootstrapTestDbFromProd(adminUserId);
    await setProdTestModeFlag(adminUserId, true);
    await setTestModeCookie(true);
    return {};
  }

  let wipedTables = 0;
  let wipedRows = 0;
  if (isTestModeConfigured()) {
    try {
      const wiped = await wipeTestDatabase();
      wipedTables = wiped.tables;
      wipedRows = wiped.rows;
    } catch (e) {
      console.error("[test-mode] wipeTestDatabase:", e);
    }
  }
  await setProdTestModeFlag(adminUserId, false);
  await setTestModeCookie(false);
  return { wipedTables, wipedRows };
}

export async function restoreAdminTestModeAfterHotpay(opts: {
  adminUserId: number;
  sessionId: string;
  paymentIsTest?: number | null;
}): Promise<boolean> {
  const fromPrefix = isHotpayTestSessionId(opts.sessionId);
  const fromPayment = Number(opts.paymentIsTest) === 1;
  if (!fromPrefix && !fromPayment) return false;
  if (!isTestModeConfigured()) return false;
  await persistAdminTestModeFlag(opts.adminUserId);
  await setTestModeCookie(true);
  return true;
}
