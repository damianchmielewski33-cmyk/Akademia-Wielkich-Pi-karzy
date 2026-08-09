import { cookies, headers } from "next/headers";
import { readSessionTokenFromRequest, verifySessionToken } from "@/lib/auth";
import { TEST_MODE_COOKIE, TEST_MODE_HEADER } from "@/lib/constants";
import { getProdDb, getTestDb, hasTestDbEnv, isTestDbAvailable, type AppDb } from "@/lib/db";

export function isTestModeConfigured(): boolean {
  return isTestDbAvailable();
}

export function hasTursoTestEnv(): boolean {
  return hasTestDbEnv();
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
 * Aktywny tryb testowy: skonfigurowana baza testowa + cookie + ważna sesja admina (weryfikacja względem produkcji).
 */
export async function isAdminTestModeActive(): Promise<boolean> {
  if (!isTestModeConfigured()) return false;
  if (!(await isTestModeCookiePresent())) return false;

  const token = await readSessionTokenFromRequest();
  if (!token) return false;

  try {
    const session = await verifySessionToken(token);
    if (!session.isAdmin) return false;

    const prod = await getProdDb();
    const row = (await prod
      .prepare("SELECT is_admin, auth_version FROM users WHERE id = ?")
      .get(session.userId)) as { is_admin: number; auth_version: number } | undefined;

    return Boolean(row && row.is_admin === 1 && Number(row.auth_version) === session.authVersion);
  } catch {
    return false;
  }
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

async function tableColumnNames(db: AppDb, table: string): Promise<string[]> {
  const rows = (await db.prepare(`PRAGMA table_info(${table})`).all()) as { name: string }[];
  return rows.map((r) => String(r.name)).filter(Boolean);
}

async function listUserTables(db: AppDb): Promise<string[]> {
  const rows = (await db
    .prepare(
      `SELECT name FROM sqlite_master
       WHERE type = 'table'
         AND name NOT LIKE 'sqlite_%'
         AND name NOT LIKE '_litestream_%'`
    )
    .all()) as { name: string }[];
  return rows.map((r) => String(r.name)).filter(Boolean);
}

/** Kopiuje adminów (+ wiersze app_settings) z produkcji do bazy testowej. */
export async function syncAdminsProdToTest(): Promise<{ admins: number }> {
  const prod = await getProdDb();
  const test = await getTestDb();

  const userCols = await tableColumnNames(prod, "users");
  if (!userCols.includes("id") || !userCols.includes("is_admin")) {
    throw new Error("Tabela users w produkcji nie ma wymaganych kolumn");
  }

  const admins = (await prod.prepare("SELECT * FROM users WHERE COALESCE(is_admin, 0) = 1").all()) as Record<
    string,
    unknown
  >[];

  const colList = userCols.join(", ");
  const placeholders = userCols.map(() => "?").join(", ");

  for (const admin of admins) {
    const values = userCols.map((c) => admin[c] ?? null);
    await test
      .prepare(
        `INSERT OR REPLACE INTO users (${colList}) VALUES (${placeholders})`
      )
      .run(...values);
  }

  // Ustawienia academy (m.in. hotpay_enabled), żeby test miał te same przełączniki co prod.
  try {
    const settingsCols = await tableColumnNames(prod, "app_settings");
    if (settingsCols.length > 0) {
      const settingsRows = (await prod.prepare("SELECT * FROM app_settings").all()) as Record<
        string,
        unknown
      >[];
      const sCols = settingsCols.join(", ");
      const sPh = settingsCols.map(() => "?").join(", ");
      for (const row of settingsRows) {
        const values = settingsCols.map((c) => row[c] ?? null);
        await test.prepare(`INSERT OR REPLACE INTO app_settings (${sCols}) VALUES (${sPh})`).run(...values);
      }
    }
  } catch {
    /* app_settings może nie istnieć w bardzo starej bazie — sync adminów i tak ważniejszy */
  }

  return { admins: admins.length };
}

/** Kasuje wszystkie tabele w bazie testowej, reinicjuje schemat i ponownie wgrywa adminów. */
export async function wipeAndReseedTestDb(): Promise<{ admins: number }> {
  const test = await getTestDb();
  const tables = await listUserTables(test);

  await test.exec("PRAGMA foreign_keys = OFF");
  for (const name of tables) {
    // Nazwy z sqlite_master — tylko [a-z0-9_].
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) continue;
    await test.exec(`DROP TABLE IF EXISTS ${name}`);
  }
  await test.exec("PRAGMA foreign_keys = ON");

  // Wymuś ponowną inicjalizację schematu (reset flag w getTestDb).
  const { resetTestDbSchemaFlag } = await import("@/lib/db");
  resetTestDbSchemaFlag();
  await getTestDb();

  return syncAdminsProdToTest();
}
