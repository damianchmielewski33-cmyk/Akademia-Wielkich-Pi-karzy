import { createClient, type Client, type InArgs, type Row } from "@libsql/client";
import Database from "better-sqlite3";
import fs from "fs";
import * as path from "path";
import { isVercel, resolveDatabaseFilePath } from "@/lib/runtime-paths";
import { initLibsqlSchema } from "@/lib/turso-init-schema";

/** Lokalny plik SQLite (dev) lub Turso (gdy TURSO_DATABASE_URL). */
export type AppDb = {
  prepare(sql: string): {
    run(...params: unknown[]): Promise<{ lastInsertRowid: bigint }>;
    get<T = unknown>(...params: unknown[]): Promise<T | undefined>;
    all<T = unknown>(...params: unknown[]): Promise<T[]>;
  };
  exec(sql: string): Promise<void>;
};

function hasTursoEnv(): boolean {
  return Boolean(process.env.TURSO_DATABASE_URL?.trim());
}

let sqliteInstance: Database.Database | null = null;
let libsqlClient: Client | null = null;
let libsqlSchemaReady = false;

function rowToRecord(row: Row, columns: string[]): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  for (const c of columns) {
    o[c] = row[c];
  }
  return o;
}

function createSqliteFacade(db: Database.Database): AppDb {
  return {
    prepare(sql: string) {
      const stmt = db.prepare(sql);
      return {
        run(...params: unknown[]) {
          const r = stmt.run(...(params as never[]));
          return Promise.resolve({
            lastInsertRowid: BigInt(r.lastInsertRowid ?? 0),
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
  };
}

function createLibsqlFacade(client: Client): AppDb {
  return {
    prepare(sql: string) {
      return {
        async run(...params: unknown[]) {
          const rs = await client.execute({ sql, args: params as InArgs });
          return { lastInsertRowid: rs.lastInsertRowid ?? BigInt(0) };
        },
        async get<T = unknown>(...params: unknown[]) {
          const rs = await client.execute({ sql, args: params as InArgs });
          if (rs.rows.length === 0) return undefined;
          return rowToRecord(rs.rows[0], rs.columns) as T;
        },
        async all<T = unknown>(...params: unknown[]) {
          const rs = await client.execute({ sql, args: params as InArgs });
          return rs.rows.map((row) => rowToRecord(row, rs.columns) as T);
        },
      };
    },
    exec(sql: string) {
      return client.executeMultiple(sql);
    },
  };
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

    CREATE INDEX IF NOT EXISTS idx_matches_played_date_time ON matches(played, match_date, match_time);

    CREATE TABLE IF NOT EXISTS match_lineup_slots (
      match_id INTEGER NOT NULL,
      team TEXT NOT NULL CHECK (team IN ('home', 'away')),
      slot_index INTEGER NOT NULL CHECK (slot_index >= 0 AND slot_index <= 6),
      user_id INTEGER NOT NULL,
      PRIMARY KEY (match_id, team, slot_index),
      FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
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
  `);
}

/**
 * Jedna instancja bazy na proces (lokalny plik lub klient Turso).
 * Na Vercelu wymagane jest `TURSO_DATABASE_URL` — lokalny plik w /tmp nie jest współdzielony między instancjami.
 */
export async function getDb(): Promise<AppDb> {
  if (isVercel() && !hasTursoEnv()) {
    throw new Error(
      "Na Vercelu ustaw TURSO_DATABASE_URL (oraz TURSO_AUTH_TOKEN z panelu Turso). Lokalny plik SQLite nie działa poprawnie na serverless."
    );
  }

  if (hasTursoEnv()) {
    if (!libsqlClient) {
      libsqlClient = createClient({
        url: process.env.TURSO_DATABASE_URL!,
        authToken: process.env.TURSO_AUTH_TOKEN?.trim() || undefined,
      });
    }
    if (!libsqlSchemaReady) {
      await initLibsqlSchema(libsqlClient);
      libsqlSchemaReady = true;
    }
    return createLibsqlFacade(libsqlClient);
  }

  if (!sqliteInstance) {
    const p = resolveDatabaseFilePath();
    fs.mkdirSync(path.dirname(p), { recursive: true });
    sqliteInstance = new Database(p);
    sqliteInstance.pragma(isVercel() ? "journal_mode = DELETE" : "journal_mode = WAL");
    initSchemaSync(sqliteInstance);
  }
  return createSqliteFacade(sqliteInstance);
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
  /** Kwota wpisowego za mecz (PLN); ustawiana przez administratora. */
  fee_pln?: number | null;
};
