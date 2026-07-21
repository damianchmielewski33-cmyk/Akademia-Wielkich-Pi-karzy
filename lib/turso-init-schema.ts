import type { Client } from "@libsql/client";
import { isDuplicateColumnError, migrateAppSettingsColumnsLibsql } from "@/lib/app-settings";
import { migrateRealmSchemaLibsql } from "@/lib/realm-migration";

async function pragmaColumnNames(
  client: Client,
  table:
    | "users"
    | "matches"
    | "match_stats"
    | "match_signups"
    | "app_settings"
    | "public_share_links"
    | "standalone_match_stats"
    | "admin_messages"
): Promise<string[]> {
  const rs = await client.execute(`PRAGMA table_info(${table})`);
  let nameIdx = rs.columns.indexOf("name");
  if (nameIdx === -1) {
    // libSQL: standard PRAGMA table_info — kolumna `name` jest druga (indeks 1).
    nameIdx = 1;
  }
  return rs.rows
    .map((row) => {
      const rec = row as unknown as Record<string | number, unknown>;
      if (typeof rec.name === "string" || typeof rec.name === "number") {
        return String(rec.name);
      }
      return String(rec[nameIdx] ?? "");
    })
    .filter(Boolean);
}

async function addColumnIfMissing(
  client: Client,
  existingNames: string[],
  column: string,
  ddl: string
): Promise<void> {
  if (existingNames.includes(column)) return;
  try {
    await client.execute(ddl);
    existingNames.push(column);
  } catch (err) {
    if (isDuplicateColumnError(err)) {
      existingNames.push(column);
      return;
    }
    throw err;
  }
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
      kind TEXT NOT NULL CHECK (kind IN ('deposit','match_charge','adjustment')),
      amount_pln REAL NOT NULL,
      deposit_request_id INTEGER,
      match_id INTEGER,
      note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (deposit_request_id) REFERENCES wallet_deposit_requests(id),
      FOREIGN KEY (match_id) REFERENCES matches(id)
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
   if (!names.includes("cancelled")) {
     await client.execute("ALTER TABLE matches ADD COLUMN cancelled INTEGER NOT NULL DEFAULT 0");
   }
   if (!names.includes("cancellation_reason")) {
     await client.execute("ALTER TABLE matches ADD COLUMN cancellation_reason TEXT");
   }
   if (!names.includes("gate_pin")) {
     await client.execute("ALTER TABLE matches ADD COLUMN gate_pin TEXT");
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
  if (!names.includes("ui_theme")) {
    await client.execute("ALTER TABLE users ADD COLUMN ui_theme TEXT NOT NULL DEFAULT 'light'");
  }
  if (!names.includes("is_temporary")) {
    await client.execute("ALTER TABLE users ADD COLUMN is_temporary INTEGER NOT NULL DEFAULT 0");
  }
  if (!names.includes("temporary_guest_match_id")) {
    await client.execute("ALTER TABLE users ADD COLUMN temporary_guest_match_id INTEGER");
  }
  if (!names.includes("can_pzu_cup")) {
    await client.execute("ALTER TABLE users ADD COLUMN can_pzu_cup INTEGER NOT NULL DEFAULT 0");
  }
  if (!names.includes("push_notifications_consent")) {
    await client.execute(
      "ALTER TABLE users ADD COLUMN push_notifications_consent INTEGER NOT NULL DEFAULT 0"
    );
  }

  names = await pragmaColumnNames(client, "match_stats");
  if (!names.includes("season_id")) {
    await client.execute("ALTER TABLE match_stats ADD COLUMN season_id INTEGER REFERENCES ranking_seasons(id)");
  }
  names = await pragmaColumnNames(client, "standalone_match_stats");
  if (!names.includes("season_id")) {
    await client.execute(
      "ALTER TABLE standalone_match_stats ADD COLUMN season_id INTEGER REFERENCES ranking_seasons(id)"
    );
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
  if (!names.includes("commitment")) {
    await client.execute("ALTER TABLE match_signups ADD COLUMN commitment INTEGER NOT NULL DEFAULT 1");
  }

  names = await pragmaColumnNames(client, "app_settings");
  await migrateAppSettingsColumnsLibsql(names, (sql) => client.execute(sql));

  await migrateRealmSchemaLibsql(client);

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

  names = await pragmaColumnNames(client, "public_share_links");
  if (!names.includes("match_id")) {
    await client.execute("ALTER TABLE public_share_links ADD COLUMN match_id INTEGER");
  }
  if (!names.includes("user_id")) {
    await client.execute("ALTER TABLE public_share_links ADD COLUMN user_id INTEGER");
  }

  const pslSqlRs = await client.execute(
    `SELECT sql FROM sqlite_master WHERE type='table' AND name='public_share_links'`
  );
  if (pslSqlRs.rows.length > 0) {
    const pslSql = String((pslSqlRs.rows[0] as Record<string, unknown>).sql ?? "");
    if (pslSql.includes("CHECK") && pslSql.includes("kind") && !pslSql.includes("'all_wallets'")) {
      await client.executeMultiple(`
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
  }

  const lineupSqlRs = await client.execute(
    `SELECT sql FROM sqlite_master WHERE type='table' AND name='match_lineup_slots'`
  );
  if (lineupSqlRs.rows.length > 0) {
    const first = lineupSqlRs.rows[0] as Record<string, unknown>;
    const legacySql = String(first.sql ?? "");
    if (legacySql.includes("slot_index <= 6") && !legacySql.includes("slot_index <= 7")) {
      await client.executeMultiple(`
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
  }

  await migrateRealmSchemaLibsql(client);

  const adminMsgNames = await pragmaColumnNames(client, "admin_messages");
  await addColumnIfMissing(
    client,
    adminMsgNames,
    "recipient_key",
    "ALTER TABLE admin_messages ADD COLUMN recipient_key TEXT"
  );
  await addColumnIfMissing(
    client,
    adminMsgNames,
    "direction",
    "ALTER TABLE admin_messages ADD COLUMN direction TEXT DEFAULT 'inbound'"
  );
  await addColumnIfMissing(
    client,
    adminMsgNames,
    "conversation_key",
    "ALTER TABLE admin_messages ADD COLUMN conversation_key TEXT"
  );
  await addColumnIfMissing(
    client,
    adminMsgNames,
    "admin_user_id",
    "ALTER TABLE admin_messages ADD COLUMN admin_user_id INTEGER"
  );
  await addColumnIfMissing(
    client,
    adminMsgNames,
    "attachment_url",
    "ALTER TABLE admin_messages ADD COLUMN attachment_url TEXT"
  );
  await client.execute(
    "CREATE INDEX IF NOT EXISTS idx_admin_messages_conversation ON admin_messages(conversation_key, created_at)"
  );

  await client.execute(`
    CREATE TABLE IF NOT EXISTS rate_limit_buckets (
      bucket_key TEXT PRIMARY KEY,
      count INTEGER NOT NULL DEFAULT 0,
      reset_at TEXT NOT NULL
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS user_devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      fcm_token TEXT NOT NULL UNIQUE,
      platform TEXT NOT NULL DEFAULT 'android',
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
  await client.execute(
    "CREATE INDEX IF NOT EXISTS idx_user_devices_user ON user_devices(user_id)"
  );

  const rs = await client.execute("SELECT 1 AS ok FROM app_settings WHERE realm = 'academy'");
  if (rs.rows.length === 0) {
    await client.execute(
      "INSERT INTO app_settings (realm, match_notification_prompt_enabled) VALUES ('academy', 0)"
    );
  }
}
