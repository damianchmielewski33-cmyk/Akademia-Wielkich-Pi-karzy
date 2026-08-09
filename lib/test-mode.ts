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
 * Aktywny tryb testowy: cookie + ważna sesja admina.
 * Dane produkcyjne i testowe są w tej samej bazie (kolumna is_test).
 */
export async function isAdminTestModeActive(): Promise<boolean> {
  if (!(await isTestModeCookiePresent())) return false;

  const token = await readSessionTokenFromRequest();
  if (!token) return false;

  try {
    const session = await verifySessionToken(token);
    if (!session.isAdmin) return false;

    const db = await getDb();
    const row = (await db
      .prepare("SELECT is_admin, auth_version FROM users WHERE id = ?")
      .get(session.userId)) as { is_admin: number; auth_version: number } | undefined;

    return Boolean(row && row.is_admin === 1 && Number(row.auth_version) === session.authVersion);
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

export async function setTestModeCookie(enabled: boolean) {
  const jar = await cookies();
  if (enabled) {
    jar.set(TEST_MODE_COOKIE, "1", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      secure: process.env.NODE_ENV === "production",
    });
  } else {
    jar.set(TEST_MODE_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
      secure: process.env.NODE_ENV === "production",
    });
  }
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
