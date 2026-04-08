import type { Client } from "@libsql/client";

async function pragmaColumnNames(
  client: Client,
  table: "users" | "matches" | "match_stats" | "match_signups"
): Promise<string[]> {
  const rs = await client.execute(`PRAGMA table_info(${table})`);
  const nameIdx = rs.columns.indexOf("name");
  if (nameIdx === -1) return [];
  return rs.rows.map((row) => String(row[nameIdx]));
}

/** Tworzy / aktualizuje schemat w zdalnej bazie libSQL (Turso). Wywoływane z getDb() i skryptu db:init-turso. */
export async function initLibsqlSchema(client: Client) {
  await client.executeMultiple(`
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

    CREATE TABLE IF NOT EXISTS app_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      match_notification_prompt_enabled INTEGER NOT NULL DEFAULT 0
    );
  `);

  let names = await pragmaColumnNames(client, "match_stats");
  if (!names.includes("saves")) {
    await client.execute("ALTER TABLE match_stats ADD COLUMN saves INTEGER NOT NULL DEFAULT 0");
  }

  names = await pragmaColumnNames(client, "matches");
  if (!names.includes("lineup_public")) {
    await client.execute("ALTER TABLE matches ADD COLUMN lineup_public INTEGER NOT NULL DEFAULT 0");
  }
  if (!names.includes("fee_pln")) {
    await client.execute("ALTER TABLE matches ADD COLUMN fee_pln REAL");
  }

  names = await pragmaColumnNames(client, "users");
  if (!names.includes("profile_photo_path")) {
    await client.execute("ALTER TABLE users ADD COLUMN profile_photo_path TEXT");
  }
  if (!names.includes("email")) {
    await client.execute("ALTER TABLE users ADD COLUMN email TEXT");
  }
  if (!names.includes("match_notifications_consent")) {
    await client.execute("ALTER TABLE users ADD COLUMN match_notifications_consent INTEGER NOT NULL DEFAULT 0");
  }
  if (!names.includes("notification_prompt_completed")) {
    await client.execute("ALTER TABLE users ADD COLUMN notification_prompt_completed INTEGER NOT NULL DEFAULT 0");
    await client.execute("UPDATE users SET notification_prompt_completed = 1");
  }
  if (!names.includes("pin_hash")) {
    await client.execute("ALTER TABLE users ADD COLUMN pin_hash TEXT");
  }
  if (!names.includes("pin_reset_requested")) {
    await client.execute("ALTER TABLE users ADD COLUMN pin_reset_requested INTEGER NOT NULL DEFAULT 0");
  }
  if (!names.includes("auth_version")) {
    await client.execute("ALTER TABLE users ADD COLUMN auth_version INTEGER NOT NULL DEFAULT 0");
  }
  if (!names.includes("pin_hash_pending")) {
    await client.execute("ALTER TABLE users ADD COLUMN pin_hash_pending TEXT");
  }

  names = await pragmaColumnNames(client, "match_signups");
  if (!names.includes("drives_car")) {
    await client.execute("ALTER TABLE match_signups ADD COLUMN drives_car INTEGER NOT NULL DEFAULT 0");
  }
  if (!names.includes("can_take_passengers")) {
    await client.execute("ALTER TABLE match_signups ADD COLUMN can_take_passengers INTEGER NOT NULL DEFAULT 0");
  }
  if (!names.includes("needs_transport")) {
    await client.execute("ALTER TABLE match_signups ADD COLUMN needs_transport INTEGER NOT NULL DEFAULT 0");
  }

  await client.executeMultiple(`
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
  await client.executeMultiple(`
    CREATE INDEX IF NOT EXISTS idx_transport_msg_match_created
    ON match_transport_messages(match_id, created_at);
  `);

  await client.executeMultiple(`
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

  await client.executeMultiple(`
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

  // Upewnij się, że istnieje pojedynczy wiersz z ustawieniami (id=1).
  const rs = await client.execute("SELECT 1 AS ok FROM app_settings WHERE id = 1");
  if (rs.rows.length === 0) {
    await client.execute(
      "INSERT INTO app_settings (id, match_notification_prompt_enabled) VALUES (1, 0)"
    );
  }
}
