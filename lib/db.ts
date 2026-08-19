import { createClient, type Client, type InArgs, type Row } from "@libsql/client";
import Database from "better-sqlite3";
import fs from "fs";
import * as path from "path";
import { isVercel, resolveDatabaseFilePath, resolveTestDatabaseFilePath } from "@/lib/runtime-paths";
import { ensureStandaloneMatchStatsLibsql, initLibsqlSchema } from "@/lib/turso-init-schema";
import { isDuplicateColumnError, migrateAppSettingsColumnsSqlite } from "@/lib/app-settings";
import { migrateRealmSchemaSqlite } from "@/lib/realm-migration";
import { CAPTAIN_LOTTERY_CREATE_SQL, migrateCaptainLotterySchemaSqlite } from "@/lib/captain-lottery-schema";
import { migrateAdImpressionsSchemaSqlite } from "@/lib/ad-impressions-schema";
import { withTransientNetworkRetries } from "@/lib/transient-network-retry";
import { BOOKING_SCHEMA_SQL } from "@/lib/booking";

/** Lokalny plik SQLite (dev) lub Turso (gdy TURSO_DATABASE_URL). */
export type AppDb = {
  prepare(sql: string): {
    run(...params: unknown[]): Promise<{ lastInsertRowid: bigint; changes: number }>;
    get<T = unknown>(...params: unknown[]): Promise<T | undefined>;
    all<T = unknown>(...params: unknown[]): Promise<T[]>;
  };
  exec(sql: string): Promise<void>;
  /**
   * Atomowa transakcja zapisu. Na SQLite: BEGIN IMMEDIATE.
   * Na Turso: interaktywna transakcja libsql — wszystkie zapytania muszą iść przez `tx`.
   */
  transaction?<T>(fn: (tx: AppDb) => Promise<T>): Promise<T>;
};

function hasTursoEnv(): boolean {
  return Boolean(process.env.TURSO_DATABASE_URL?.trim());
}

function hasTursoTestEnv(): boolean {
  return Boolean(process.env.TURSO_TEST_DATABASE_URL?.trim());
}

/**
 * Osobna baza TEST: Turso TEST (inna niż PROD), albo lokalny SQLite gdy PROD też jest plikiem.
 */
export function canOpenTestDatabase(): boolean {
  if (hasTursoTestEnv()) {
    const testUrl = (process.env.TURSO_TEST_DATABASE_URL ?? "")
      .trim()
      .replace(/^["']|["']$/g, "");
    const prodUrl = (process.env.TURSO_DATABASE_URL ?? "")
      .trim()
      .replace(/^["']|["']$/g, "");
    // Ta sama URL co PROD = ryzyko wipe produkcji — wyłącz TEST.
    if (prodUrl && testUrl && prodUrl === testUrl) {
      console.error(
        "[db] TURSO_TEST_DATABASE_URL jest identyczny z TURSO_DATABASE_URL — tryb testowy wyłączony"
      );
      return false;
    }
    return Boolean(testUrl);
  }
  if (hasTursoEnv()) return false;
  if (isVercel()) return false;
  return true;
}

type DbSlot = {
  sqlite: Database.Database | null;
  libsql: Client | null;
  schemaReady: boolean;
  schemaInitPromise: Promise<void> | null;
};

const prodSlot: DbSlot = {
  sqlite: null,
  libsql: null,
  schemaReady: false,
  schemaInitPromise: null,
};

const testSlot: DbSlot = {
  sqlite: null,
  libsql: null,
  schemaReady: false,
  schemaInitPromise: null,
};

function rowToRecord(row: Row, columns: string[]): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  for (const c of columns) {
    const v = row[c];
    // libSQL/Turso często zwraca INTEGER jako bigint — `1n === 1` jest false.
    o[c] = typeof v === "bigint" ? Number(v) : v;
  }
  return o;
}

function createSqliteFacade(db: Database.Database): AppDb {
  const facade: AppDb = {
    prepare(sql: string) {
      const stmt = db.prepare(sql);
      return {
        run(...params: unknown[]) {
          const r = stmt.run(...(params as never[]));
          return Promise.resolve({
            lastInsertRowid: BigInt(r.lastInsertRowid ?? 0),
            changes: Number(r.changes ?? 0),
          });
        },
        get<T = unknown>(...params: unknown[]) {
          return Promise.resolve(stmt.get(...(params as never[])) as T | undefined);
        },
        all<T = unknown>(...params: unknown[]) {
          return Promise.resolve(stmt.all(...(params as never[])) as T[]);
        },
      };
    },
    exec(sql: string) {
      db.exec(sql);
      return Promise.resolve();
    },
    async transaction<T>(fn: (tx: AppDb) => Promise<T>): Promise<T> {
      db.exec("BEGIN IMMEDIATE");
      try {
        const result = await fn(facade);
        db.exec("COMMIT");
        return result;
      } catch (e) {
        try {
          db.exec("ROLLBACK");
        } catch {
          /* ignore */
        }
        throw e;
      }
    },
  };
  return facade;
}

/** Stare bazy: CHECK(kind IN ('last_match_wallets')) — blokowało all_wallets / match_wallets / player_wallets. */
function migratePublicShareLinksKind(db: Database.Database) {
  const pslCols = db.prepare("PRAGMA table_info(public_share_links)").all() as { name: string }[];
  if (!pslCols.length) return;
  if (!pslCols.some((c) => c.name === "match_id")) {
    db.exec("ALTER TABLE public_share_links ADD COLUMN match_id INTEGER");
  }
  if (!pslCols.some((c) => c.name === "user_id")) {
    db.exec("ALTER TABLE public_share_links ADD COLUMN user_id INTEGER");
  }

  const row = db
    .prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='public_share_links'`)
    .get() as { sql: string } | undefined;
  const pslSql = row?.sql ?? "";
  if (!pslSql.includes("CHECK") || !pslSql.includes("kind") || pslSql.includes("'all_wallets'")) return;

  db.exec(`
    CREATE TABLE public_share_links_migration (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT NOT NULL UNIQUE,
      kind TEXT NOT NULL,
      created_by_admin_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT,
      revoked_at TEXT,
      match_id INTEGER,
      user_id INTEGER,
      FOREIGN KEY (created_by_admin_id) REFERENCES users(id)
    );
    INSERT INTO public_share_links_migration (id, token, kind, created_by_admin_id, created_at, expires_at, revoked_at, match_id, user_id)
    SELECT id, token, kind, created_by_admin_id, created_at, expires_at, revoked_at, match_id, user_id FROM public_share_links;
    DROP TABLE public_share_links;
    ALTER TABLE public_share_links_migration RENAME TO public_share_links;
    CREATE INDEX IF NOT EXISTS idx_public_share_links_kind_created ON public_share_links(kind, created_at);
  `);
}

/** Stare bazy: CHECK bez 'transfer' / brak related_user_id. */
function migrateWalletTransactionsTransfer(db: Database.Database) {
  const cols = db.prepare("PRAGMA table_info(wallet_transactions)").all() as { name: string }[];
  if (!cols.length) return;

  const hasRelated = cols.some((c) => c.name === "related_user_id");
  if (!hasRelated) {
    db.exec("ALTER TABLE wallet_transactions ADD COLUMN related_user_id INTEGER");
  }

  const row = db
    .prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='wallet_transactions'`)
    .get() as { sql: string } | undefined;
  const sql = row?.sql ?? "";
  if (!sql.includes("CHECK") || !sql.includes("kind") || sql.includes("'transfer'")) return;

  db.exec(`
    CREATE TABLE wallet_transactions_migration (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      kind TEXT NOT NULL CHECK (kind IN ('deposit','match_charge','adjustment','transfer')),
      amount_pln REAL NOT NULL,
      deposit_request_id INTEGER,
      match_id INTEGER,
      related_user_id INTEGER,
      note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (deposit_request_id) REFERENCES wallet_deposit_requests(id),
      FOREIGN KEY (match_id) REFERENCES matches(id),
      FOREIGN KEY (related_user_id) REFERENCES users(id)
    );
    INSERT INTO wallet_transactions_migration
      (id, user_id, kind, amount_pln, deposit_request_id, match_id, related_user_id, note, created_at)
    SELECT id, user_id, kind, amount_pln, deposit_request_id, match_id, related_user_id, note, created_at
    FROM wallet_transactions;
    DROP TABLE wallet_transactions;
    ALTER TABLE wallet_transactions_migration RENAME TO wallet_transactions;
    CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_created
    ON wallet_transactions(user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_wallet_transactions_match
    ON wallet_transactions(match_id);
  `);
}

/** Stare bazy: HotPay bez nowszych typów / powiązań płatności. */
function migrateHotpayPaymentsKinds(db: Database.Database) {
  const cols = db.prepare("PRAGMA table_info(hotpay_payments)").all() as { name: string }[];
  if (!cols.length) return;

  if (!cols.some((c) => c.name === "cart_id")) {
    db.exec("ALTER TABLE hotpay_payments ADD COLUMN cart_id INTEGER");
  }
  if (!cols.some((c) => c.name === "booking_id")) {
    db.exec("ALTER TABLE hotpay_payments ADD COLUMN booking_id INTEGER");
  }

  if (!cols.some((c) => c.name === "gross_amount_pln")) {
    db.exec("ALTER TABLE hotpay_payments ADD COLUMN gross_amount_pln REAL");
  }
  if (!cols.some((c) => c.name === "is_test")) {
    const again = db.prepare("PRAGMA table_info(hotpay_payments)").all() as { name: string }[];
    if (!again.some((c) => c.name === "is_test")) {
      db.exec("ALTER TABLE hotpay_payments ADD COLUMN is_test INTEGER NOT NULL DEFAULT 0");
    }
  }

  const row = db
    .prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='hotpay_payments'`)
    .get() as { sql: string } | undefined;
  const sql = row?.sql ?? "";
  if (!sql.includes("CHECK") || !sql.includes("kind") || sql.includes("'booking'")) return;

  db.exec(`
    CREATE TABLE hotpay_payments_migration (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL,
      kind TEXT NOT NULL CHECK (kind IN ('match','topup','match_cart','booking')),
      amount_pln REAL NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('pending','success','failure','cancelled')) DEFAULT 'pending',
      hotpay_payment_id TEXT,
      secure TEXT,
      deposit_request_id INTEGER,
      cart_id INTEGER,
      booking_id INTEGER,
      gross_amount_pln REAL,
      error_message TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT,
      is_test INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (deposit_request_id) REFERENCES wallet_deposit_requests(id)
    );
    INSERT INTO hotpay_payments_migration
      (id, session_id, user_id, kind, amount_pln, status, hotpay_payment_id, secure,
       deposit_request_id, cart_id, booking_id, gross_amount_pln, error_message, created_at, completed_at, is_test)
    SELECT id, session_id, user_id, kind, amount_pln, status, hotpay_payment_id, secure,
           deposit_request_id, cart_id,
           NULL,
           gross_amount_pln,
           error_message, created_at, completed_at,
           COALESCE(is_test, 0)
    FROM hotpay_payments;
    DROP TABLE hotpay_payments;
    ALTER TABLE hotpay_payments_migration RENAME TO hotpay_payments;
    CREATE INDEX IF NOT EXISTS idx_hotpay_payments_user_created ON hotpay_payments(user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_hotpay_payments_status_created ON hotpay_payments(status, created_at);
  `);
}

/** Stare bazy: dodanie wallet_kind do portfeli (admin vs operator). */
function migrateWalletKindColumns(db: Database.Database) {
  const txCols = db.prepare("PRAGMA table_info(wallet_transactions)").all() as { name: string }[];
  if (txCols.length > 0 && !txCols.some((c) => c.name === "wallet_kind")) {
    db.exec(
      "ALTER TABLE wallet_transactions ADD COLUMN wallet_kind TEXT NOT NULL DEFAULT 'admin' CHECK (wallet_kind IN ('admin','operator'))"
    );
  }
  if (txCols.length > 0 && !txCols.some((c) => c.name === "is_test")) {
    // odśwież listę po ewentualnym ALTER powyżej
    const again = db.prepare("PRAGMA table_info(wallet_transactions)").all() as { name: string }[];
    if (!again.some((c) => c.name === "is_test")) {
      db.exec("ALTER TABLE wallet_transactions ADD COLUMN is_test INTEGER NOT NULL DEFAULT 0");
    }
  }
  const drCols = db.prepare("PRAGMA table_info(wallet_deposit_requests)").all() as { name: string }[];
  if (drCols.length > 0 && !drCols.some((c) => c.name === "wallet_kind")) {
    db.exec(
      "ALTER TABLE wallet_deposit_requests ADD COLUMN wallet_kind TEXT NOT NULL DEFAULT 'admin' CHECK (wallet_kind IN ('admin','operator'))"
    );
  }
}

/** Stare bazy: CHECK(slot_index <= 6) — potrzebne do 8 pozycji na połowę. */
function migrateMatchLineupSlotsSlotIndexMax(db: Database.Database) {
  const row = db
    .prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='match_lineup_slots'`)
    .get() as { sql: string } | undefined;
  if (!row?.sql || row.sql.includes("slot_index <= 7")) return;
  if (!row.sql.includes("slot_index <= 6")) return;

  db.exec(`
    CREATE TABLE match_lineup_slots_migration (
      match_id INTEGER NOT NULL,
      team TEXT NOT NULL CHECK (team IN ('home', 'away')),
      slot_index INTEGER NOT NULL CHECK (slot_index >= 0 AND slot_index <= 7),
      user_id INTEGER NOT NULL,
      PRIMARY KEY (match_id, team, slot_index),
      FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    INSERT INTO match_lineup_slots_migration SELECT * FROM match_lineup_slots;
    DROP TABLE match_lineup_slots;
    ALTER TABLE match_lineup_slots_migration RENAME TO match_lineup_slots;
  `);
}

function createLibsqlFacade(client: Client): AppDb {
  /** Turso HTTP 400 przy bigint / undefined w args. */
  const sanitize = (params: unknown[]): InArgs =>
    params.map((v) => {
      if (v === undefined) return null;
      if (typeof v === "bigint") {
        if (v > BigInt(Number.MAX_SAFE_INTEGER) || v < BigInt(Number.MIN_SAFE_INTEGER)) {
          return v.toString();
        }
        return Number(v);
      }
      return v;
    }) as InArgs;

  type Executor = {
    execute: Client["execute"];
    executeMultiple?: Client["executeMultiple"];
  };

  function facadeFor(executor: Executor, withTransaction: boolean): AppDb {
    const facade: AppDb = {
      prepare(sql: string) {
        return {
          async run(...params: unknown[]) {
            const rs = await executor.execute({ sql, args: sanitize(params) });
            return {
              lastInsertRowid: rs.lastInsertRowid ?? BigInt(0),
              changes: Number(rs.rowsAffected ?? 0),
            };
          },
          async get<T = unknown>(...params: unknown[]) {
            const rs = await executor.execute({ sql, args: sanitize(params) });
            if (rs.rows.length === 0) return undefined;
            return rowToRecord(rs.rows[0], rs.columns) as T;
          },
          async all<T = unknown>(...params: unknown[]) {
            const rs = await executor.execute({ sql, args: sanitize(params) });
            return rs.rows.map((row) => rowToRecord(row, rs.columns) as T);
          },
        };
      },
      exec(sql: string) {
        if (executor.executeMultiple) return executor.executeMultiple(sql);
        return executor.execute(sql).then(() => undefined);
      },
    };
    if (withTransaction) {
      facade.transaction = async <T>(fn: (tx: AppDb) => Promise<T>): Promise<T> => {
        const tx = await client.transaction("write");
        try {
          const result = await fn(facadeFor(tx, false));
          await tx.commit();
          return result;
        } catch (e) {
          try {
            await tx.rollback();
          } catch {
            /* ignore */
          }
          throw e;
        }
      };
    }
    return facade;
  }

  return facadeFor(client, true);
}

function initSchemaSync(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      player_alias TEXT UNIQUE NOT NULL,
      is_admin INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      match_date TEXT NOT NULL,
      match_time TEXT NOT NULL,
      location TEXT NOT NULL,
      max_slots INTEGER NOT NULL,
      signed_up INTEGER NOT NULL DEFAULT 0,
      played INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS match_signups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      match_id INTEGER NOT NULL,
      paid INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(match_id) REFERENCES matches(id)
    );

    CREATE TABLE IF NOT EXISTS match_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      match_id INTEGER NOT NULL,
      goals INTEGER DEFAULT 0,
      assists INTEGER DEFAULT 0,
      distance REAL DEFAULT 0,
      saves INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(match_id) REFERENCES matches(id)
    );

    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS page_views (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      screen_key TEXT NOT NULL,
      pathname TEXT NOT NULL,
      user_id INTEGER,
      visitor_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_page_views_created ON page_views(created_at);
    CREATE INDEX IF NOT EXISTS idx_page_views_screen_created ON page_views(screen_key, created_at);
    CREATE INDEX IF NOT EXISTS idx_page_views_user_created ON page_views(user_id, created_at);

    CREATE TABLE IF NOT EXISTS ad_impressions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slot_id TEXT NOT NULL,
      screen_key TEXT NOT NULL,
      pathname TEXT NOT NULL,
      user_id INTEGER,
      visitor_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      placement TEXT NOT NULL DEFAULT 'footer',
      fill_status TEXT NOT NULL DEFAULT 'pending',
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_ad_impressions_created ON ad_impressions(created_at);
    CREATE INDEX IF NOT EXISTS idx_ad_impressions_screen_created ON ad_impressions(screen_key, created_at);
    CREATE INDEX IF NOT EXISTS idx_ad_impressions_placement_created ON ad_impressions(placement, created_at);

    CREATE TABLE IF NOT EXISTS cookie_consent_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      choice TEXT NOT NULL,
      visitor_id TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_cookie_consent_created ON cookie_consent_events(created_at);

    CREATE INDEX IF NOT EXISTS idx_matches_played_date_time ON matches(played, match_date, match_time);

    CREATE TABLE IF NOT EXISTS match_lineup_slots (
      match_id INTEGER NOT NULL,
      team TEXT NOT NULL CHECK (team IN ('home', 'away')),
      slot_index INTEGER NOT NULL CHECK (slot_index >= 0 AND slot_index <= 7),
      user_id INTEGER NOT NULL,
      PRIMARY KEY (match_id, team, slot_index),
      FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      match_notification_prompt_enabled INTEGER NOT NULL DEFAULT 0,
      home_youtube_url TEXT
    );

    CREATE TABLE IF NOT EXISTS wallet_deposit_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      amount_pln REAL NOT NULL,
      created_by TEXT NOT NULL CHECK (created_by IN ('player','admin')),
      status TEXT NOT NULL CHECK (status IN ('pending','completed','cancelled')) DEFAULT 'pending',
      note TEXT,
      player_declared_at TEXT,
      admin_confirmed_received_at TEXT,
      admin_declared_received_at TEXT,
      player_confirmed_amount_at TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_wallet_deposit_requests_status_created
    ON wallet_deposit_requests(status, created_at);
    CREATE INDEX IF NOT EXISTS idx_wallet_deposit_requests_user_created
    ON wallet_deposit_requests(user_id, created_at);

    CREATE TABLE IF NOT EXISTS wallet_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      kind TEXT NOT NULL CHECK (kind IN ('deposit','match_charge','adjustment','transfer')),
      amount_pln REAL NOT NULL,
      deposit_request_id INTEGER,
      match_id INTEGER,
      related_user_id INTEGER,
      note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (deposit_request_id) REFERENCES wallet_deposit_requests(id),
      FOREIGN KEY (match_id) REFERENCES matches(id),
      FOREIGN KEY (related_user_id) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_created
    ON wallet_transactions(user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_wallet_transactions_match
    ON wallet_transactions(match_id);

    CREATE TABLE IF NOT EXISTS match_wallet_charges (
      match_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      amount_pln REAL NOT NULL,
      note TEXT,
      created_by_admin_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (match_id, user_id),
      FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (created_by_admin_id) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_match_wallet_charges_match_created
    ON match_wallet_charges(match_id, created_at);

    CREATE TABLE IF NOT EXISTS hotpay_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL,
      kind TEXT NOT NULL CHECK (kind IN ('match','topup','match_cart','booking')),
      amount_pln REAL NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('pending','success','failure','cancelled')) DEFAULT 'pending',
      hotpay_payment_id TEXT,
      secure TEXT,
      deposit_request_id INTEGER,
      cart_id INTEGER,
      booking_id INTEGER,
      error_message TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (deposit_request_id) REFERENCES wallet_deposit_requests(id)
    );
    CREATE INDEX IF NOT EXISTS idx_hotpay_payments_user_created
    ON hotpay_payments(user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_hotpay_payments_status_created
    ON hotpay_payments(status, created_at);

    CREATE TABLE IF NOT EXISTS public_share_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT NOT NULL UNIQUE,
      kind TEXT NOT NULL CHECK (kind IN ('last_match_wallets', 'all_wallets', 'match_wallets', 'player_wallets')),
      created_by_admin_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT,
      revoked_at TEXT,
      FOREIGN KEY (created_by_admin_id) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_public_share_links_kind_created
    ON public_share_links(kind, created_at);
  `);

  const cols = db.prepare("PRAGMA table_info(match_stats)").all() as { name: string }[];
  if (!cols.some((c) => c.name === "saves")) {
    db.exec("ALTER TABLE match_stats ADD COLUMN saves INTEGER NOT NULL DEFAULT 0");
  }

   const matchCols = db.prepare("PRAGMA table_info(matches)").all() as { name: string }[];
   if (!matchCols.some((c) => c.name === "lineup_public")) {
     db.exec("ALTER TABLE matches ADD COLUMN lineup_public INTEGER NOT NULL DEFAULT 0");
   }
   if (!matchCols.some((c) => c.name === "fee_pln")) {
     db.exec("ALTER TABLE matches ADD COLUMN fee_pln REAL");
   }
   if (!matchCols.some((c) => c.name === "cancelled")) {
     db.exec("ALTER TABLE matches ADD COLUMN cancelled INTEGER NOT NULL DEFAULT 0");
   }
   if (!matchCols.some((c) => c.name === "cancellation_reason")) {
     db.exec("ALTER TABLE matches ADD COLUMN cancellation_reason TEXT");
   }
   if (!matchCols.some((c) => c.name === "gate_pin")) {
     db.exec("ALTER TABLE matches ADD COLUMN gate_pin TEXT");
   }
   if (!matchCols.some((c) => c.name === "is_test")) {
     db.exec("ALTER TABLE matches ADD COLUMN is_test INTEGER NOT NULL DEFAULT 0");
   }

  const userCols = db.prepare("PRAGMA table_info(users)").all() as { name: string }[];
  if (!userCols.some((c) => c.name === "profile_photo_path")) {
    db.exec("ALTER TABLE users ADD COLUMN profile_photo_path TEXT");
  }
  if (!userCols.some((c) => c.name === "email")) {
    db.exec("ALTER TABLE users ADD COLUMN email TEXT");
  }
  if (!userCols.some((c) => c.name === "match_notifications_consent")) {
    db.exec("ALTER TABLE users ADD COLUMN match_notifications_consent INTEGER NOT NULL DEFAULT 0");
  }
  if (!userCols.some((c) => c.name === "notification_prompt_completed")) {
    db.exec("ALTER TABLE users ADD COLUMN notification_prompt_completed INTEGER NOT NULL DEFAULT 0");
    db.prepare("UPDATE users SET notification_prompt_completed = 1").run();
  }
  if (!userCols.some((c) => c.name === "pin_hash")) {
    db.exec("ALTER TABLE users ADD COLUMN pin_hash TEXT");
  }
  if (!userCols.some((c) => c.name === "pin_reset_requested")) {
    db.exec("ALTER TABLE users ADD COLUMN pin_reset_requested INTEGER NOT NULL DEFAULT 0");
  }
  if (!userCols.some((c) => c.name === "auth_version")) {
    db.exec("ALTER TABLE users ADD COLUMN auth_version INTEGER NOT NULL DEFAULT 0");
  }
  if (!userCols.some((c) => c.name === "pin_hash_pending")) {
    db.exec("ALTER TABLE users ADD COLUMN pin_hash_pending TEXT");
  }
  if (!userCols.some((c) => c.name === "ui_theme")) {
    db.exec("ALTER TABLE users ADD COLUMN ui_theme TEXT NOT NULL DEFAULT 'light'");
  }
  if (!userCols.some((c) => c.name === "is_temporary")) {
    db.exec("ALTER TABLE users ADD COLUMN is_temporary INTEGER NOT NULL DEFAULT 0");
  }
  if (!userCols.some((c) => c.name === "temporary_guest_match_id")) {
    db.exec("ALTER TABLE users ADD COLUMN temporary_guest_match_id INTEGER");
  }
  if (!userCols.some((c) => c.name === "can_pzu_cup")) {
    db.exec("ALTER TABLE users ADD COLUMN can_pzu_cup INTEGER NOT NULL DEFAULT 0");
  }
  if (!userCols.some((c) => c.name === "push_notifications_consent")) {
    db.exec("ALTER TABLE users ADD COLUMN push_notifications_consent INTEGER NOT NULL DEFAULT 0");
  }
  if (!userCols.some((c) => c.name === "admin_permissions")) {
    db.exec("ALTER TABLE users ADD COLUMN admin_permissions TEXT");
  }
  if (!userCols.some((c) => c.name === "is_test")) {
    db.exec("ALTER TABLE users ADD COLUMN is_test INTEGER NOT NULL DEFAULT 0");
  }
  if (!userCols.some((c) => c.name === "test_mode_enabled")) {
    db.exec("ALTER TABLE users ADD COLUMN test_mode_enabled INTEGER NOT NULL DEFAULT 0");
  }

  // ranking_seasons przed season_id / migrateRealm (świeża baza TEST).
  db.exec(`
    CREATE TABLE IF NOT EXISTS ranking_seasons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      ended_at TEXT,
      started_by_admin_id INTEGER NOT NULL,
      ended_by_admin_id INTEGER,
      FOREIGN KEY (started_by_admin_id) REFERENCES users(id),
      FOREIGN KEY (ended_by_admin_id) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_ranking_seasons_active ON ranking_seasons(ended_at, started_at DESC);
  `);

  const matchStatsCols = db.prepare("PRAGMA table_info(match_stats)").all() as { name: string }[];
  if (matchStatsCols.length > 0 && !matchStatsCols.some((c) => c.name === "season_id")) {
    db.exec("ALTER TABLE match_stats ADD COLUMN season_id INTEGER");
  }
  // standalone_match_stats tworzone niżej — ALTER tylko gdy tabela już istnieje.
  const standaloneStatsCols = db.prepare("PRAGMA table_info(standalone_match_stats)").all() as {
    name: string;
  }[];
  if (standaloneStatsCols.length > 0 && !standaloneStatsCols.some((c) => c.name === "season_id")) {
    db.exec("ALTER TABLE standalone_match_stats ADD COLUMN season_id INTEGER");
  }

  const signupCols = db.prepare("PRAGMA table_info(match_signups)").all() as { name: string }[];
  if (!signupCols.some((c) => c.name === "drives_car")) {
    db.exec("ALTER TABLE match_signups ADD COLUMN drives_car INTEGER NOT NULL DEFAULT 0");
  }
  if (!signupCols.some((c) => c.name === "can_take_passengers")) {
    db.exec("ALTER TABLE match_signups ADD COLUMN can_take_passengers INTEGER NOT NULL DEFAULT 0");
  }
  if (!signupCols.some((c) => c.name === "needs_transport")) {
    db.exec("ALTER TABLE match_signups ADD COLUMN needs_transport INTEGER NOT NULL DEFAULT 0");
  }
  if (!signupCols.some((c) => c.name === "commitment")) {
    db.exec("ALTER TABLE match_signups ADD COLUMN commitment INTEGER NOT NULL DEFAULT 1");
  }

  migratePublicShareLinksKind(db);
  migrateWalletTransactionsTransfer(db);
  migrateHotpayPaymentsKinds(db);
  migrateMatchLineupSlotsSlotIndexMax(db);
  migrateWalletKindColumns(db);

  db.exec(`
    CREATE TABLE IF NOT EXISTS wallet_match_carts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payer_user_id INTEGER NOT NULL,
      match_id INTEGER NOT NULL,
      amount_pln REAL NOT NULL,
      fee_per_person_pln REAL NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('pending','completed','cancelled')) DEFAULT 'pending',
      hotpay_session_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT,
      FOREIGN KEY (payer_user_id) REFERENCES users(id),
      FOREIGN KEY (match_id) REFERENCES matches(id)
    );
    CREATE INDEX IF NOT EXISTS idx_wallet_match_carts_payer_created
    ON wallet_match_carts(payer_user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_wallet_match_carts_match
    ON wallet_match_carts(match_id);

    CREATE TABLE IF NOT EXISTS wallet_match_cart_items (
      cart_id INTEGER NOT NULL,
      beneficiary_user_id INTEGER NOT NULL,
      amount_pln REAL NOT NULL,
      PRIMARY KEY (cart_id, beneficiary_user_id),
      FOREIGN KEY (cart_id) REFERENCES wallet_match_carts(id) ON DELETE CASCADE,
      FOREIGN KEY (beneficiary_user_id) REFERENCES users(id)
    );
  `);

  db.exec(BOOKING_SCHEMA_SQL);
  const venueCols = db.prepare("PRAGMA table_info(venues)").all() as { name: string }[];
  if (venueCols.length > 0 && !venueCols.some((c) => c.name === "owner_user_id")) {
    db.exec("ALTER TABLE venues ADD COLUMN owner_user_id INTEGER");
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS match_transport_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      match_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_transport_msg_match_created
    ON match_transport_messages(match_id, created_at);
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS match_participation_survey (
      user_id INTEGER NOT NULL,
      match_id INTEGER NOT NULL,
      played INTEGER NOT NULL,
      answered_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, match_id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (match_id) REFERENCES matches(id)
    );
    CREATE INDEX IF NOT EXISTS idx_match_participation_survey_match
    ON match_participation_survey(match_id);
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS match_attendance (
      match_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      present INTEGER NOT NULL,
      marked_by_admin_id INTEGER NOT NULL,
      marked_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (match_id, user_id),
      FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (marked_by_admin_id) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_match_attendance_match
    ON match_attendance(match_id);
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS participation_survey_answer (
      user_id INTEGER NOT NULL,
      survey_key TEXT NOT NULL,
      played INTEGER NOT NULL,
      answered_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, survey_key),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS standalone_match_stats (
      user_id INTEGER NOT NULL,
      survey_key TEXT NOT NULL,
      goals INTEGER NOT NULL DEFAULT 0,
      assists INTEGER NOT NULL DEFAULT 0,
      distance REAL NOT NULL DEFAULT 0,
      saves INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, survey_key),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS gallery_videos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      youtube_url TEXT NOT NULL,
      match_date TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      published INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS admin_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      sender_name TEXT NOT NULL,
      sender_email TEXT,
      body TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'read')),
      read_at TEXT,
      read_by_admin_id INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (read_by_admin_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_admin_messages_status_created ON admin_messages(status, created_at DESC);
  `);

  {
    const smsCols = db.prepare("PRAGMA table_info(standalone_match_stats)").all() as { name: string }[];
    if (smsCols.length > 0 && !smsCols.some((c) => c.name === "season_id")) {
      db.exec("ALTER TABLE standalone_match_stats ADD COLUMN season_id INTEGER");
    }
  }

  db.exec(CAPTAIN_LOTTERY_CREATE_SQL);

  migrateCaptainLotterySchemaSqlite(db);
  migrateAdImpressionsSchemaSqlite(db);

  const appSettingsCols = db.prepare("PRAGMA table_info(app_settings)").all() as { name: string }[];
  migrateAppSettingsColumnsSqlite(
    appSettingsCols.map((c) => c.name),
    (sql) => db.exec(sql)
  );

  migrateRealmSchemaSqlite(db);

  const adminMsgCols = db.prepare("PRAGMA table_info(admin_messages)").all() as { name: string }[];
  const adminMsgNames = new Set(adminMsgCols.map((c) => c.name));
  const addAdminMsgColumn = (name: string, ddl: string) => {
    if (adminMsgNames.has(name)) return;
    try {
      db.exec(ddl);
      adminMsgNames.add(name);
    } catch (err) {
      if (isDuplicateColumnError(err)) {
        adminMsgNames.add(name);
        return;
      }
      throw err;
    }
  };
  addAdminMsgColumn("recipient_key", "ALTER TABLE admin_messages ADD COLUMN recipient_key TEXT");
  addAdminMsgColumn(
    "direction",
    "ALTER TABLE admin_messages ADD COLUMN direction TEXT DEFAULT 'inbound'"
  );
  addAdminMsgColumn("conversation_key", "ALTER TABLE admin_messages ADD COLUMN conversation_key TEXT");
  addAdminMsgColumn("admin_user_id", "ALTER TABLE admin_messages ADD COLUMN admin_user_id INTEGER");
  addAdminMsgColumn("attachment_url", "ALTER TABLE admin_messages ADD COLUMN attachment_url TEXT");
  db.exec("CREATE INDEX IF NOT EXISTS idx_admin_messages_conversation ON admin_messages(conversation_key, created_at)");

  db.exec(`
    CREATE TABLE IF NOT EXISTS rate_limit_buckets (
      bucket_key TEXT PRIMARY KEY,
      count INTEGER NOT NULL DEFAULT 0,
      reset_at TEXT NOT NULL
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS user_devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      fcm_token TEXT NOT NULL UNIQUE,
      platform TEXT NOT NULL DEFAULT 'android',
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_user_devices_user ON user_devices(user_id);
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      endpoint TEXT NOT NULL UNIQUE,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      user_agent TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);
  `);

  const hasAcademySettings = db.prepare("SELECT 1 AS ok FROM app_settings WHERE realm = 'academy'").get() as
    | { ok: 1 }
    | undefined;
  if (!hasAcademySettings) {
    db.prepare(
      "INSERT INTO app_settings (realm, match_notification_prompt_enabled) VALUES ('academy', 0)"
    ).run();
  }
}

/**
 * Otwiera bazę PROD lub TEST (Turso albo lokalny SQLite).
 */
async function openDbSlot(
  slot: DbSlot,
  opts: { kind: "prod" | "test" }
): Promise<AppDb> {
  const useTurso = opts.kind === "prod" ? hasTursoEnv() : hasTursoTestEnv();

  if (opts.kind === "prod" && isVercel() && !hasTursoEnv()) {
    throw new Error(
      "Na Vercelu ustaw TURSO_DATABASE_URL (oraz TURSO_AUTH_TOKEN z panelu Turso). Lokalny plik SQLite nie działa poprawnie na serverless."
    );
  }

  if (opts.kind === "test" && !canOpenTestDatabase()) {
    throw new Error(
      "Baza TEST nie jest skonfigurowana. Ustaw TURSO_TEST_DATABASE_URL (+ TURSO_TEST_AUTH_TOKEN) albo użyj lokalnego SQLite bez Turso PROD."
    );
  }

  if (useTurso) {
    const url = (
      opts.kind === "prod" ? process.env.TURSO_DATABASE_URL! : process.env.TURSO_TEST_DATABASE_URL!
    )
      .trim()
      .replace(/^["']|["']$/g, "");
    const authTokenRaw =
      opts.kind === "prod"
        ? process.env.TURSO_AUTH_TOKEN
        : process.env.TURSO_TEST_AUTH_TOKEN;
    const authToken = authTokenRaw?.trim().replace(/^["']|["']$/g, "") || undefined;

    if (!url) {
      throw new Error(
        opts.kind === "test"
          ? "Brak TURSO_TEST_DATABASE_URL"
          : "Brak TURSO_DATABASE_URL"
      );
    }

    if (!slot.libsql) {
      slot.libsql = createClient({ url, authToken });
    }

    // Najpierw upewnij się o krytycznej tabeli — nawet gdy pełny init jeszcze padnie.
    try {
      await ensureStandaloneMatchStatsLibsql(slot.libsql);
    } catch (e) {
      console.warn(`[db] early ensure standalone_match_stats (${opts.kind}):`, e);
    }

    if (!slot.schemaReady) {
      if (!slot.schemaInitPromise) {
        slot.schemaInitPromise = (async () => {
          try {
            await withTransientNetworkRetries(
              async () => {
                await initLibsqlSchema(slot.libsql!);
              },
              {
                onBeforeRetry: () => {
                  slot.libsql?.close();
                  slot.libsql = createClient({ url, authToken });
                },
              }
            );
            slot.schemaReady = true;
          } catch (err) {
            slot.schemaInitPromise = null;
            console.error(`[db] initLibsqlSchema failed (${opts.kind}):`, err);
            // Nie blokuj PROD: pozwól serwować z częściowym schematem + ensure poniżej.
            if (opts.kind === "test") throw err;
          }
        })();
      }
      await slot.schemaInitPromise;
    }

    try {
      await ensureStandaloneMatchStatsLibsql(slot.libsql!);
    } catch (e) {
      console.error(`[db] ensure standalone_match_stats (${opts.kind}):`, e);
      if (opts.kind === "test") throw e;
    }
    return createLibsqlFacade(slot.libsql!);
  }

  if (!slot.sqlite) {
    const p = opts.kind === "prod" ? resolveDatabaseFilePath() : resolveTestDatabaseFilePath();
    fs.mkdirSync(path.dirname(p), { recursive: true });
    slot.sqlite = new Database(p);
    slot.sqlite.pragma(isVercel() ? "journal_mode = DELETE" : "journal_mode = WAL");
    initSchemaSync(slot.sqlite);
  }
  return createSqliteFacade(slot.sqlite);
}

/** Zawsze baza produkcyjna (auth, flaga trybu testowego, gracze). */
export async function getProdDb(): Promise<AppDb> {
  return openDbSlot(prodSlot, { kind: "prod" });
}

/** Osobna baza trybu testowego admina. */
export async function getTestDb(): Promise<AppDb> {
  try {
    return await openDbSlot(testSlot, { kind: "test" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(
      `Baza TEST niedostępna: ${msg}. Ustaw poprawne TURSO_TEST_DATABASE_URL i TURSO_TEST_AUTH_TOKEN (osobna baza Turso, token bez cudzysłowów w env).`
    );
  }
}

/**
 * Baza kontekstowa: PROD domyślnie; TEST gdy admin ma aktywny tryb testowy.
 * W trybie testowym NIGDY nie fallbackujemy na PROD (żeby nie pisać meczy/płatności na produkcję).
 */
export async function getDb(): Promise<AppDb> {
  let wantTest = false;
  try {
    const { shouldUseTestDatabase } = await import("@/lib/test-mode");
    wantTest = await shouldUseTestDatabase();
  } catch {
    wantTest = false;
  }

  if (wantTest) {
    return getTestDb();
  }
  return getProdDb();
}

/**
 * Baza po session_id HotPay: hp_t_* → TEST, inaczej PROD.
 * Webhooki nie mają cookie admina.
 */
export async function getDbForHotpaySession(sessionId: string): Promise<AppDb> {
  const { isHotpayTestSessionId } = await import("@/lib/hotpay");
  if (isHotpayTestSessionId(sessionId) && canOpenTestDatabase()) {
    return getTestDb();
  }
  return getProdDb();
}

export async function logActivity(userId: number | null, action: string) {
  const db = await getDb();
  await db.prepare("INSERT INTO activity_log (user_id, action) VALUES (?, ?)").run(userId, action);
}

export type UserRow = {
  id: number;
  first_name: string;
  last_name: string;
  player_alias: string;
  is_admin: number;
  profile_photo_path?: string | null;
  /** Adres do powiadomień o meczach (opcjonalny). */
  email?: string | null;
  /** 1 = zgoda na e‑maile o nowych terminach. */
  match_notifications_consent?: number;
  /** 1 = użytkownik udzielił odpowiedzi w oknie powitalnym (nie pokazuj ponownie). */
  notification_prompt_completed?: number;
  /** Skrót bcrypt PIN-u; NULL = wymagane ustawienie przy pierwszym logowaniu lub po resecie. */
  pin_hash?: string | null;
  /** 1 = użytkownik zgłosił „zapomniałem PIN-u” (widoczne dla admina). */
  pin_reset_requested?: number;
  /** Wersja sesji — inkrementacja unieważnia istniejące JWT (np. reset PIN przez admina). */
  auth_version?: number;
  /** Propozycja nowego PIN-u (bcrypt); oczekuje na zatwierdzenie przez admina. */
  pin_hash_pending?: string | null;
  /** Motyw interfejsu: jasny lub ciemny. */
  ui_theme?: string | null;
};

export type MatchRow = {
  id: number;
  match_date: string;
  match_time: string;
  location: string;
  max_slots: number;
  signed_up: number;
  played: number;
  lineup_public: number;
  /** Całkowita kwota wynajmu boiska (PLN); składka na osobę = fee_pln / signed_up (zaokr. w górę do 0,50). */
  fee_pln?: number | null;
  /** 1 = mecz został anulowany. */
  cancelled?: number;
  /** Powód anulacji meczu. */
  cancellation_reason?: string | null;
  /** PIN do bramy / wejścia na boisko (4–6 cyfr). */
  gate_pin?: string | null;
};
