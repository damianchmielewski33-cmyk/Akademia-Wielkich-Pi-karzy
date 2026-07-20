import type Database from "better-sqlite3";
import type { Client } from "@libsql/client";
import { REALMS } from "@/lib/realm";

const APP_SETTINGS_COLUMNS = [
  "match_notification_prompt_enabled",
  "home_youtube_url",
  "site_name",
  "site_description",
  "contact_email",
  "blik_phone",
  "organizer_damian_name",
  "organizer_damian_phone",
  "organizer_damian_email",
  "organizer_mateusz_name",
  "organizer_mateusz_phone",
  "organizer_mateusz_email",
  "facebook_damian_url",
  "facebook_mateusz_url",
  "allow_self_registration",
  "default_match_max_slots",
  "default_match_fee_pln",
  "default_match_location",
  "ranking_pt_goal",
  "ranking_pt_assist",
  "ranking_pt_km",
  "ranking_pt_save",
  "match_email_notifications_enabled",
  "lineup_pitch_slots_min",
  "lineup_pitch_slots_max",
  "match_cancel_reasons_json",
  "asset_logo_header_url",
  "asset_logo_crest_url",
  "asset_logo_login_url",
  "asset_logo_favicon_url",
  "asset_bg_soccer_ball_url",
  "asset_bg_stadium_url",
  "asset_bg_pitch_lines_url",
] as const;

function migrateAppSettingsTableSqlite(db: Database.Database) {
  const cols = db.prepare("PRAGMA table_info(app_settings)").all() as { name: string }[];
  if (cols.some((c) => c.name === "realm")) return;

  const row = db
    .prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='app_settings'`)
    .get() as { sql: string } | undefined;
  const hasIdCheck = row?.sql?.includes("CHECK (id = 1)") ?? false;

  const colDefs = APP_SETTINGS_COLUMNS.map((c) => {
    if (c === "match_notification_prompt_enabled") return `${c} INTEGER NOT NULL DEFAULT 0`;
    if (c === "match_email_notifications_enabled") return `${c} INTEGER NOT NULL DEFAULT 1`;
    return `${c} TEXT`;
  }).join(",\n      ");

  db.exec(`
    CREATE TABLE app_settings_realm_migration (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      realm TEXT NOT NULL UNIQUE CHECK (realm IN ('academy', 'pzu_cup')),
      ${colDefs}
    );
  `);

  const selectCols = APP_SETTINGS_COLUMNS.join(", ");
  if (hasIdCheck) {
    db.exec(`
      INSERT INTO app_settings_realm_migration (realm, ${selectCols})
      SELECT '${REALMS.ACADEMY}', ${selectCols}
      FROM app_settings WHERE id = 1;
    `);
  } else {
    db.exec(`
      INSERT INTO app_settings_realm_migration (realm, ${selectCols})
      SELECT COALESCE(realm, '${REALMS.ACADEMY}'), ${selectCols}
      FROM app_settings;
    `);
  }

  db.exec(`
    DROP TABLE app_settings;
    ALTER TABLE app_settings_realm_migration RENAME TO app_settings;
  `);
}

function seedPzuCupSettingsSqlite(db: Database.Database) {
  const exists = db
    .prepare(`SELECT 1 AS ok FROM app_settings WHERE realm = ?`)
    .get(REALMS.PZU_CUP) as { ok: 1 } | undefined;
  if (exists) return;

  db.prepare(
    `INSERT INTO app_settings (realm, match_notification_prompt_enabled, site_name, site_description)
     VALUES (?, 0, 'PZU Cup 2026', 'Turniej PZU Cup — osobna baza zawodników, meczów i ustawień.')`
  ).run(REALMS.PZU_CUP);
}

function addRealmColumnSqlite(db: Database.Database, table: string) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (cols.some((c) => c.name === "realm")) return;
  db.exec(`ALTER TABLE ${table} ADD COLUMN realm TEXT NOT NULL DEFAULT '${REALMS.ACADEMY}'`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_${table}_realm ON ${table}(realm)`);
}

export function migrateRealmSchemaSqlite(db: Database.Database) {
  addRealmColumnSqlite(db, "users");
  addRealmColumnSqlite(db, "matches");
  addRealmColumnSqlite(db, "ranking_seasons");
  migrateAppSettingsTableSqlite(db);
  seedPzuCupSettingsSqlite(db);
}

async function migrateAppSettingsTableLibsql(client: Client) {
  const rs = await client.execute(`PRAGMA table_info(app_settings)`);
  const names = rs.rows.map((row) => String((row as Record<string, unknown>).name ?? row[1] ?? ""));
  if (names.includes("realm")) return;

  const sqlRs = await client.execute(
    `SELECT sql FROM sqlite_master WHERE type='table' AND name='app_settings'`
  );
  const hasIdCheck = sqlRs.rows.length
    ? String((sqlRs.rows[0] as Record<string, unknown>).sql ?? "").includes("CHECK (id = 1)")
    : false;

  const colDefs = APP_SETTINGS_COLUMNS.map((c) => {
    if (c === "match_notification_prompt_enabled") return `${c} INTEGER NOT NULL DEFAULT 0`;
    if (c === "match_email_notifications_enabled") return `${c} INTEGER NOT NULL DEFAULT 1`;
    return `${c} TEXT`;
  }).join(",\n      ");

  const selectCols = APP_SETTINGS_COLUMNS.join(", ");

  await client.executeMultiple(`
    CREATE TABLE app_settings_realm_migration (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      realm TEXT NOT NULL UNIQUE CHECK (realm IN ('academy', 'pzu_cup')),
      ${colDefs}
    );
    ${
      hasIdCheck
        ? `INSERT INTO app_settings_realm_migration (realm, ${selectCols})
           SELECT '${REALMS.ACADEMY}', ${selectCols}
           FROM app_settings WHERE id = 1;`
        : `INSERT INTO app_settings_realm_migration (realm, ${selectCols})
           SELECT COALESCE(realm, '${REALMS.ACADEMY}'), ${selectCols}
           FROM app_settings;`
    }
    DROP TABLE app_settings;
    ALTER TABLE app_settings_realm_migration RENAME TO app_settings;
  `);
}

async function addRealmColumnLibsql(client: Client, table: string) {
  const rs = await client.execute(`PRAGMA table_info(${table})`);
  const names = rs.rows.map((row) => String((row as Record<string, unknown>).name ?? row[1] ?? ""));
  if (names.includes("realm")) return;
  await client.execute(`ALTER TABLE ${table} ADD COLUMN realm TEXT NOT NULL DEFAULT '${REALMS.ACADEMY}'`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_${table}_realm ON ${table}(realm)`);
}

async function seedPzuCupSettingsLibsql(client: Client) {
  const rs = await client.execute(`SELECT 1 AS ok FROM app_settings WHERE realm = ?`, [REALMS.PZU_CUP]);
  if (rs.rows.length > 0) return;
  await client.execute(
    `INSERT INTO app_settings (realm, match_notification_prompt_enabled, site_name, site_description)
     VALUES (?, 0, 'PZU Cup 2026', 'Turniej PZU Cup — osobna baza zawodników, meczów i ustawień.')`,
    [REALMS.PZU_CUP]
  );
}

export async function migrateRealmSchemaLibsql(client: Client) {
  await addRealmColumnLibsql(client, "users");
  await addRealmColumnLibsql(client, "matches");
  await addRealmColumnLibsql(client, "ranking_seasons");
  await migrateAppSettingsTableLibsql(client);
  await seedPzuCupSettingsLibsql(client);
}
