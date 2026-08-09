import { cookies, headers } from "next/headers";
import { readSessionTokenFromRequest, verifySessionToken } from "@/lib/auth";
import { TEST_MODE_COOKIE, TEST_MODE_HEADER } from "@/lib/constants";
import { getDb, type AppDb } from "@/lib/db";

/** Zawsze dostępny — ta sama baza, dane testowe oznaczane `is_test=1`. */
export function isTestModeConfigured(): boolean {
  return true;
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
 * Aktywny tryb testowy: ważna sesja admina + (cookie albo flaga w bazie).
 * Flaga w DB przetrwa powrót z HotPay, gdy cookie nie wraca z cross-site redirect.
 */
export async function isAdminTestModeActive(): Promise<boolean> {
  const token = await readSessionTokenFromRequest();
  if (!token) return false;

  try {
    const session = await verifySessionToken(token);
    if (!session.isAdmin) return false;

    const db = await getDb();
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

    if (Number(row.test_mode_enabled) === 1) return true;
    return await isTestModeCookiePresent();
  } catch {
    return false;
  }
}

/** 1 gdy admin ma włączony tryb testowy — do INSERT. */
export async function testModeFlag(): Promise<0 | 1> {
  return (await isAdminTestModeActive()) ? 1 : 0;
}

/** Filtr meczy: w teście tylko is_test=1, poza testem tylko produkcja. */
export function sqlMatchTestFilter(alias: string, testMode: boolean): string {
  const col = alias ? `${alias}.is_test` : "is_test";
  return testMode ? `COALESCE(${col}, 0) = 1` : `COALESCE(${col}, 0) = 0`;
}

/**
 * Filtr użytkowników na listach:
 * - produkcja: bez is_test
 * - test: admini (produkcyjni) + gracze is_test=1
 */
export function sqlUserTestFilter(alias: string, testMode: boolean): string {
  const a = alias ? `${alias}.` : "";
  return testMode
    ? `(COALESCE(${a}is_admin, 0) = 1 OR COALESCE(${a}is_test, 0) = 1)`
    : `COALESCE(${a}is_test, 0) = 0`;
}

/** Filtr transakcji portfela / płatności HotPay wg trybu. */
export function sqlWalletTestFilter(alias: string, testMode: boolean): string {
  const col = alias ? `${alias}.is_test` : "is_test";
  return testMode ? `COALESCE(${col}, 0) = 1` : `COALESCE(${col}, 0) = 0`;
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
    // none+secure: cookie wraca z cross-site redirect HotPay; lokalnie zostaje lax.
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

/** Włącza/wyłącza tryb testowy: flaga w DB (trwała) + cookie sesji przeglądarki. */
export async function setAdminTestModeEnabled(adminUserId: number, enabled: boolean) {
  const db = await getDb();
  await db
    .prepare("UPDATE users SET test_mode_enabled = ? WHERE id = ? AND COALESCE(is_admin, 0) = 1")
    .run(enabled ? 1 : 0, adminUserId);
  await setTestModeCookie(enabled);
}

/**
 * Usuwa dane oznaczone is_test=1 (mecze, gracze testowi, portfele/płatności testowe).
 * Admini produkcyjni (is_test=0) zostają.
 */
export async function wipeTestModeData(db?: AppDb): Promise<{
  matches: number;
  users: number;
  wallet_tx: number;
  hotpay: number;
}> {
  const conn = db ?? (await getDb());

  await conn.exec("PRAGMA foreign_keys = OFF");

  const del = async (sql: string) => {
    const r = await conn.prepare(sql).run();
    return Number(r.changes ?? 0);
  };

  // Dzieci meczów testowych
  await del(
    `DELETE FROM match_signups WHERE match_id IN (SELECT id FROM matches WHERE COALESCE(is_test, 0) = 1)`
  );
  await del(
    `DELETE FROM match_stats WHERE match_id IN (SELECT id FROM matches WHERE COALESCE(is_test, 0) = 1)`
  );
  try {
    await del(
      `DELETE FROM match_lineup_slots WHERE match_id IN (SELECT id FROM matches WHERE COALESCE(is_test, 0) = 1)`
    );
  } catch {
    /* tabela może nie istnieć w starej bazie */
  }
  try {
    await del(
      `DELETE FROM match_wallet_charges WHERE match_id IN (SELECT id FROM matches WHERE COALESCE(is_test, 0) = 1)`
    );
  } catch {
    /* */
  }
  try {
    await del(
      `DELETE FROM match_transport_messages WHERE match_id IN (SELECT id FROM matches WHERE COALESCE(is_test, 0) = 1)`
    );
  } catch {
    /* */
  }
  try {
    await del(
      `DELETE FROM captain_lottery_spins WHERE match_id IN (SELECT id FROM matches WHERE COALESCE(is_test, 0) = 1)`
    );
  } catch {
    /* */
  }

  const matches = await del(`DELETE FROM matches WHERE COALESCE(is_test, 0) = 1`);

  const hotpay = await del(`DELETE FROM hotpay_payments WHERE COALESCE(is_test, 0) = 1`);
  const wallet_tx = await del(`DELETE FROM wallet_transactions WHERE COALESCE(is_test, 0) = 1`);

  // Dane powiązane z graczami testowymi
  await del(
    `DELETE FROM match_signups WHERE user_id IN (SELECT id FROM users WHERE COALESCE(is_test, 0) = 1)`
  );
  await del(
    `DELETE FROM match_stats WHERE user_id IN (SELECT id FROM users WHERE COALESCE(is_test, 0) = 1)`
  );
  try {
    await del(
      `DELETE FROM wallet_deposit_requests WHERE user_id IN (SELECT id FROM users WHERE COALESCE(is_test, 0) = 1)`
    );
  } catch {
    /* */
  }
  try {
    await del(
      `DELETE FROM push_subscriptions WHERE user_id IN (SELECT id FROM users WHERE COALESCE(is_test, 0) = 1)`
    );
  } catch {
    /* */
  }
  try {
    await del(
      `DELETE FROM user_devices WHERE user_id IN (SELECT id FROM users WHERE COALESCE(is_test, 0) = 1)`
    );
  } catch {
    /* */
  }

  const users = await del(`DELETE FROM users WHERE COALESCE(is_test, 0) = 1`);

  await conn.exec("PRAGMA foreign_keys = ON");

  return { matches, users, wallet_tx, hotpay };
}
