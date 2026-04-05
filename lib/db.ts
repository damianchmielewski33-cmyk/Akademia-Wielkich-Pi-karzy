import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const defaultPath = path.join(process.cwd(), "data", "database.db");

function resolveDbPath() {
  return process.env.DATABASE_PATH
    ? path.resolve(process.cwd(), process.env.DATABASE_PATH)
    : defaultPath;
}

/** Pojedynczy plik SQLite — naturalny model przy jednej instancji serwera; przy wielu replikach współdzielonym pliku unikaj zapisów równoległych z różnych hostów. */
let dbInstance: Database.Database | null = null;

function initSchema(db: Database.Database) {
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
}

export function getDb(): Database.Database {
  if (dbInstance) return dbInstance;
  const p = resolveDbPath();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  dbInstance = new Database(p);
  dbInstance.pragma("journal_mode = WAL");
  initSchema(dbInstance);
  return dbInstance;
}

export function logActivity(userId: number | null, action: string) {
  const db = getDb();
  db.prepare("INSERT INTO activity_log (user_id, action) VALUES (?, ?)").run(userId, action);
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
