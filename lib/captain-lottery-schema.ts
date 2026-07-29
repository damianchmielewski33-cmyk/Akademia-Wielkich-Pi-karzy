import type { Client } from "@libsql/client";
import type Database from "better-sqlite3";

export const CAPTAIN_LOTTERY_CREATE_SQL = `
  CREATE TABLE IF NOT EXISTS match_captain_lottery (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    match_id INTEGER NOT NULL,
    round_number INTEGER NOT NULL DEFAULT 1,
    drawn_by_user_id INTEGER,
    captain_count INTEGER,
    captain_user_ids TEXT NOT NULL DEFAULT '[]',
    drawn_at TEXT,
    locked INTEGER NOT NULL DEFAULT 0,
    created_by_admin_id INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
    FOREIGN KEY (drawn_by_user_id) REFERENCES users(id),
    FOREIGN KEY (created_by_admin_id) REFERENCES users(id),
    UNIQUE (match_id, round_number)
  );
  CREATE INDEX IF NOT EXISTS idx_match_captain_lottery_match_round
    ON match_captain_lottery(match_id, round_number DESC);
`;

const MIGRATION_SQL = `
  CREATE TABLE match_captain_lottery_migration (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    match_id INTEGER NOT NULL,
    round_number INTEGER NOT NULL DEFAULT 1,
    drawn_by_user_id INTEGER,
    captain_count INTEGER,
    captain_user_ids TEXT NOT NULL DEFAULT '[]',
    drawn_at TEXT,
    locked INTEGER NOT NULL DEFAULT 0,
    created_by_admin_id INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
    FOREIGN KEY (drawn_by_user_id) REFERENCES users(id),
    FOREIGN KEY (created_by_admin_id) REFERENCES users(id),
    UNIQUE (match_id, round_number)
  );
  INSERT INTO match_captain_lottery_migration (
    match_id, round_number, drawn_by_user_id, captain_count, captain_user_ids, drawn_at, locked, created_at
  )
  SELECT
    match_id,
    1,
    drawn_by_user_id,
    captain_count,
    captain_user_ids,
    drawn_at,
    locked,
    COALESCE(drawn_at, datetime('now'))
  FROM match_captain_lottery;
  DROP TABLE match_captain_lottery;
  ALTER TABLE match_captain_lottery_migration RENAME TO match_captain_lottery;
  CREATE INDEX IF NOT EXISTS idx_match_captain_lottery_match_round
    ON match_captain_lottery(match_id, round_number DESC);
`;

export function migrateCaptainLotterySchemaSqlite(db: Database.Database) {
  const cols = db.prepare("PRAGMA table_info(match_captain_lottery)").all() as { name: string }[];
  if (!cols.length) return;
  if (cols.some((c) => c.name === "id")) return;
  db.exec(MIGRATION_SQL);
}

export async function migrateCaptainLotterySchemaLibsql(client: Client) {
  const rs = await client.execute("PRAGMA table_info(match_captain_lottery)");
  if (rs.rows.length === 0) return;
  let nameIdx = rs.columns.indexOf("name");
  if (nameIdx === -1) nameIdx = 1;
  const names = rs.rows.map((row) => {
    const rec = row as Record<string | number, unknown>;
    if (typeof rec.name === "string" || typeof rec.name === "number") return String(rec.name);
    return String(rec[nameIdx] ?? "");
  });
  if (names.includes("id")) return;
  await client.executeMultiple(MIGRATION_SQL);
}
