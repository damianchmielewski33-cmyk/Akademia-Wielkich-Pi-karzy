import Database from "better-sqlite3";
import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";
import type { AppDb } from "@/lib/db";
import {
  ensureMarketplaceCustomer,
  ensurePartnerUser,
  MARKETPLACE_GUEST_ALIAS_PREFIX,
} from "@/lib/booking-accounts";

function createTestDb(): { db: AppDb; sqlite: Database.Database; dbPath: string } {
  const dbPath = path.join(os.tmpdir(), `awp-accounts-test-${Date.now()}-${Math.random()}.sqlite`);
  const sqlite = new Database(dbPath);
  sqlite.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      player_alias TEXT UNIQUE NOT NULL,
      is_admin INTEGER DEFAULT 0,
      email TEXT,
      pin_hash TEXT
    );
  `);
  const db: AppDb = {
    prepare(sql: string) {
      const stmt = sqlite.prepare(sql);
      return {
        run(...params: unknown[]) {
          const r = stmt.run(...(params as never[]));
          return Promise.resolve({
            lastInsertRowid: BigInt(r.lastInsertRowid ?? 0),
            changes: r.changes ?? 0,
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
      sqlite.exec(sql);
      return Promise.resolve();
    },
    async transaction<T>(fn: (tx: AppDb) => Promise<T>): Promise<T> {
      return fn(db);
    },
  };
  return { db, sqlite, dbPath };
}

describe("booking accounts", () => {
  const dbs: { sqlite: Database.Database; dbPath: string }[] = [];

  afterEach(() => {
    for (const { sqlite, dbPath } of dbs.splice(0)) {
      sqlite.close();
      fs.rmSync(dbPath, { force: true });
    }
  });

  it("does not attach a guest booking to an academy player who shares the email", async () => {
    const { db, sqlite, dbPath } = createTestDb();
    dbs.push({ sqlite, dbPath });
    sqlite
      .prepare(
        "INSERT INTO users (first_name, last_name, player_alias, is_admin, email, pin_hash) VALUES ('Jan', 'Kowalski', 'janek', 0, 'jan@example.com', 'hash')"
      )
      .run();

    const guest = await ensureMarketplaceCustomer(db, {
      name: "Atakujący",
      email: "jan@example.com",
    });
    expect(guest.created).toBe(true);
    expect(guest.userId).not.toBe(1);

    const row = sqlite.prepare("SELECT player_alias FROM users WHERE id = ?").get(guest.userId) as {
      player_alias: string;
    };
    expect(row.player_alias.startsWith(`${MARKETPLACE_GUEST_ALIAS_PREFIX}-`)).toBe(true);
  });

  it("reuses only an existing marketplace guest for the same email", async () => {
    const { db, sqlite, dbPath } = createTestDb();
    dbs.push({ sqlite, dbPath });
    const first = await ensureMarketplaceCustomer(db, { name: "Jan Gość", email: "gosc@example.com" });
    const second = await ensureMarketplaceCustomer(db, { name: "Jan Gość", email: "gosc@example.com" });
    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(second.userId).toBe(first.userId);
  });

  it("creates a partner without a reusable PIN in the database", async () => {
    const { db, sqlite, dbPath } = createTestDb();
    dbs.push({ sqlite, dbPath });
    const partner = await ensurePartnerUser(db, { name: "Anna Hala", email: "anna@hala.pl" });
    expect(partner.created).toBe(true);
    expect(partner.needsPinSetup).toBe(true);
    const row = sqlite.prepare("SELECT pin_hash FROM users WHERE id = ?").get(partner.userId) as {
      pin_hash: string | null;
    };
    expect(row.pin_hash).toBeNull();
  });
});
