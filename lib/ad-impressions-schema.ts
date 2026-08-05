import type { Client } from "@libsql/client";
import type Database from "better-sqlite3";
import { isDuplicateColumnError } from "@/lib/app-settings";

const AD_IMPRESSION_COLUMNS: { name: string; ddl: string }[] = [
  {
    name: "placement",
    ddl: "ALTER TABLE ad_impressions ADD COLUMN placement TEXT NOT NULL DEFAULT 'footer'",
  },
  {
    name: "fill_status",
    ddl: "ALTER TABLE ad_impressions ADD COLUMN fill_status TEXT NOT NULL DEFAULT 'pending'",
  },
];

async function libsqlColumnNames(client: Client, table: string): Promise<Set<string>> {
  const rs = await client.execute(`PRAGMA table_info(${table})`);
  let nameIdx = rs.columns.indexOf("name");
  if (nameIdx === -1) nameIdx = 1;
  const names = new Set<string>();
  for (const row of rs.rows) {
    const rec = row as unknown as Record<string | number, unknown>;
    if (typeof rec.name === "string" || typeof rec.name === "number") {
      names.add(String(rec.name));
      continue;
    }
    const v = rec[nameIdx];
    if (v != null && String(v)) names.add(String(v));
  }
  return names;
}

export function migrateAdImpressionsSchemaSqlite(db: Database.Database) {
  const cols = db.prepare("PRAGMA table_info(ad_impressions)").all() as { name: string }[];
  const names = new Set(cols.map((c) => c.name));
  for (const col of AD_IMPRESSION_COLUMNS) {
    if (names.has(col.name)) continue;
    try {
      db.exec(col.ddl);
      names.add(col.name);
    } catch (err) {
      if (!isDuplicateColumnError(err)) throw err;
    }
  }
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_ad_impressions_placement_created ON ad_impressions(placement, created_at)"
  );
  db.exec(`
    CREATE TABLE IF NOT EXISTS cookie_consent_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      choice TEXT NOT NULL,
      visitor_id TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
  db.exec("CREATE INDEX IF NOT EXISTS idx_cookie_consent_created ON cookie_consent_events(created_at)");
}

export async function migrateAdImpressionsSchemaLibsql(client: Client) {
  const names = await libsqlColumnNames(client, "ad_impressions");
  for (const col of AD_IMPRESSION_COLUMNS) {
    if (names.has(col.name)) continue;
    try {
      await client.execute(col.ddl);
      names.add(col.name);
    } catch (err) {
      if (!isDuplicateColumnError(err)) throw err;
    }
  }
  await client.execute(
    "CREATE INDEX IF NOT EXISTS idx_ad_impressions_placement_created ON ad_impressions(placement, created_at)"
  );
  await client.execute(`
    CREATE TABLE IF NOT EXISTS cookie_consent_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      choice TEXT NOT NULL,
      visitor_id TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
  await client.execute("CREATE INDEX IF NOT EXISTS idx_cookie_consent_created ON cookie_consent_events(created_at)");
}
