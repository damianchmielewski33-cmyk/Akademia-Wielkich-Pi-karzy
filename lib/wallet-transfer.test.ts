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
  };
});

vi.mock("@/lib/guest-cleanup", () => ({
  tryRemoveTemporaryGuestIfBalanceZero: vi.fn(async () => undefined),
}));

import { getDb } from "@/lib/db";
import { getUserWalletBalancePln, transferWalletFunds } from "@/lib/wallet";

function createTestDb(): { db: AppDb; sqlite: Database.Database; dbPath: string } {
  const dbPath = path.join(os.tmpdir(), `awp-wallet-transfer-${Date.now()}-${Math.random()}.sqlite`);
  const sqlite = new Database(dbPath);
  sqlite.pragma("foreign_keys = ON");
  sqlite.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      player_alias TEXT UNIQUE NOT NULL,
      is_admin INTEGER DEFAULT 0,
      is_temporary INTEGER DEFAULT 0
    );
    CREATE TABLE wallet_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      kind TEXT NOT NULL,
      amount_pln REAL NOT NULL,
      deposit_request_id INTEGER,
      match_id INTEGER,
      related_user_id INTEGER,
      note TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
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

describe("transferWalletFunds", () => {
  let sqlite: Database.Database;
  let dbPath: string;
  let db: AppDb;

  beforeEach(() => {
    const created = createTestDb();
    sqlite = created.sqlite;
    dbPath = created.dbPath;
    db = created.db;
    vi.mocked(getDb).mockResolvedValue(db);

    sqlite.prepare(
      `INSERT INTO users (id, first_name, last_name, player_alias) VALUES (1, 'Jan', 'Kowalski', 'Lewandowski')`
    ).run();
    sqlite.prepare(
      `INSERT INTO users (id, first_name, last_name, player_alias) VALUES (2, 'Anna', 'Nowak', 'Messi')`
    ).run();
    sqlite.prepare(
      `INSERT INTO wallet_transactions (user_id, kind, amount_pln, note) VALUES (1, 'deposit', 100, 'start')`
    ).run();
  });

  afterEach(() => {
    sqlite.close();
    try {
      fs.unlinkSync(dbPath);
    } catch {
      /* ignore */
    }
  });

  it("przesuwa środki między graczami", async () => {
    const result = await transferWalletFunds({
      fromUserId: 1,
      toUserId: 2,
      amountPln: 25.5,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.amount_pln).toBe(25.5);
    expect(result.balance_pln).toBe(74.5);
    expect(await getUserWalletBalancePln(1)).toBe(74.5);
    expect(await getUserWalletBalancePln(2)).toBe(25.5);

    const txs = sqlite
      .prepare(`SELECT user_id, kind, amount_pln, related_user_id, note FROM wallet_transactions WHERE kind = 'transfer' ORDER BY id`)
      .all() as {
      user_id: number;
      kind: string;
      amount_pln: number;
      related_user_id: number;
      note: string;
    }[];
    expect(txs).toHaveLength(2);
    expect(txs[0]).toMatchObject({
      user_id: 1,
      amount_pln: -25.5,
      related_user_id: 2,
    });
    expect(txs[0].note).toContain("Przelew do Anna Nowak");
    expect(txs[1]).toMatchObject({
      user_id: 2,
      amount_pln: 25.5,
      related_user_id: 1,
    });
    expect(txs[1].note).toContain("Przelew od Jan Kowalski");
  });

  it("odrzuca self-transfer", async () => {
    const result = await transferWalletFunds({ fromUserId: 1, toUserId: 1, amountPln: 10 });
    expect(result).toEqual({ ok: false, error: "SELF_TRANSFER" });
  });

  it("odrzuca kwotę poniżej 1 PLN", async () => {
    const result = await transferWalletFunds({ fromUserId: 1, toUserId: 2, amountPln: 0.5 });
    expect(result).toEqual({ ok: false, error: "INVALID_AMOUNT" });
  });

  it("odrzuca brak środków", async () => {
    const result = await transferWalletFunds({ fromUserId: 1, toUserId: 2, amountPln: 200 });
    expect(result).toEqual({ ok: false, error: "INSUFFICIENT_FUNDS" });
    expect(await getUserWalletBalancePln(1)).toBe(100);
    expect(await getUserWalletBalancePln(2)).toBe(0);
  });

  it("odrzuca nieistniejącego odbiorcę", async () => {
    const result = await transferWalletFunds({ fromUserId: 1, toUserId: 999, amountPln: 10 });
    expect(result).toEqual({ ok: false, error: "RECIPIENT_NOT_FOUND" });
  });
});
