import Database from "better-sqlite3";
import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppDb } from "@/lib/db";

vi.mock("@/lib/db", async () => {
  const actual = await vi.importActual<typeof import("@/lib/db")>("@/lib/db");
  return {
    ...actual,
    getDb: vi.fn(),
    logActivity: vi.fn(async () => undefined),
  };
});

import { getDb } from "@/lib/db";
import { cleanupAbandonedHotpayAndGuests } from "@/lib/guest-cleanup";

function createTestDb(): { db: AppDb; sqlite: Database.Database; dbPath: string } {
  const dbPath = path.join(os.tmpdir(), `awp-guest-cleanup-${Date.now()}-${Math.random()}.sqlite`);
  const sqlite = new Database(dbPath);
  sqlite.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      player_alias TEXT,
      is_temporary INTEGER DEFAULT 0,
      temporary_guest_match_id INTEGER
    );
    CREATE TABLE matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      match_date TEXT NOT NULL,
      match_time TEXT NOT NULL,
      location TEXT NOT NULL,
      played INTEGER NOT NULL DEFAULT 0,
      cancelled INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE match_signups (
      user_id INTEGER NOT NULL,
      match_id INTEGER NOT NULL,
      paid INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE hotpay_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT,
      user_id INTEGER NOT NULL,
      kind TEXT NOT NULL,
      amount_pln REAL NOT NULL DEFAULT 25,
      status TEXT NOT NULL,
      deposit_request_id INTEGER,
      cart_id INTEGER,
      error_message TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE wallet_match_carts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payer_user_id INTEGER NOT NULL,
      match_id INTEGER NOT NULL,
      amount_pln REAL NOT NULL,
      fee_per_person_pln REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      hotpay_session_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT
    );
    CREATE TABLE wallet_match_cart_items (
      cart_id INTEGER NOT NULL,
      beneficiary_user_id INTEGER NOT NULL,
      amount_pln REAL NOT NULL
    );
    CREATE TABLE wallet_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      kind TEXT NOT NULL,
      amount_pln REAL NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
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
  };

  return { db, sqlite, dbPath };
}

describe("cleanupAbandonedHotpayAndGuests", () => {
  let sqlite: Database.Database;
  let dbPath: string;
  let db: AppDb;

  beforeEach(() => {
    const created = createTestDb();
    sqlite = created.sqlite;
    dbPath = created.dbPath;
    db = created.db;
    vi.mocked(getDb).mockResolvedValue(db);
  });

  afterEach(() => {
    sqlite.close();
    try {
      fs.unlinkSync(dbPath);
    } catch {
      /* ignore */
    }
  });

  it("nie anuluje pending match_cart po 2 godzinach — przelew tradycyjny jeszcze może dojść", async () => {
    sqlite
      .prepare(
        `INSERT INTO wallet_match_carts (id, payer_user_id, match_id, amount_pln, fee_per_person_pln, status, hotpay_session_id, created_at)
         VALUES (1, 1, 10, 25, 25, 'pending', 'hp_przelew', datetime('now', '-2 hours'))`
      )
      .run();
    sqlite
      .prepare(
        `INSERT INTO hotpay_payments (session_id, user_id, kind, amount_pln, status, cart_id, created_at)
         VALUES ('hp_przelew', 1, 'match_cart', 25, 'pending', 1, datetime('now', '-2 hours'))`
      )
      .run();
    sqlite
      .prepare(
        `INSERT INTO hotpay_payments (session_id, user_id, kind, amount_pln, status, created_at)
         VALUES ('hp_topup', 1, 'topup', 50, 'pending', datetime('now', '-2 hours'))`
      )
      .run();

    const result = await cleanupAbandonedHotpayAndGuests(60);
    expect(result.cancelled_payments).toBe(1);

    const cart = sqlite.prepare(`SELECT status FROM wallet_match_carts WHERE id = 1`).get() as { status: string };
    expect(cart.status).toBe("pending");
    const matchCartPay = sqlite
      .prepare(`SELECT status FROM hotpay_payments WHERE session_id = 'hp_przelew'`)
      .get() as { status: string };
    expect(matchCartPay.status).toBe("pending");
    const topup = sqlite.prepare(`SELECT status FROM hotpay_payments WHERE session_id = 'hp_topup'`).get() as {
      status: string;
    };
    expect(topup.status).toBe("cancelled");
  });

  it("nie anuluje koszyka gdy HotPay już SUCCESS, a settle jeszcze nie dobiegł", async () => {
    sqlite
      .prepare(
        `INSERT INTO wallet_match_carts (id, payer_user_id, match_id, amount_pln, fee_per_person_pln, status, hotpay_session_id, created_at)
         VALUES (2, 1, 10, 25, 25, 'pending', 'hp_ok', datetime('now', '-3 hours'))`
      )
      .run();
    sqlite
      .prepare(
        `INSERT INTO hotpay_payments (session_id, user_id, kind, amount_pln, status, deposit_request_id, cart_id, created_at)
         VALUES ('hp_ok', 1, 'match_cart', 25, 'success', 9, 2, datetime('now', '-3 hours'))`
      )
      .run();

    await cleanupAbandonedHotpayAndGuests(60);
    const cart = sqlite.prepare(`SELECT status FROM wallet_match_carts WHERE id = 2`).get() as { status: string };
    expect(cart.status).toBe("pending");
  });
});
