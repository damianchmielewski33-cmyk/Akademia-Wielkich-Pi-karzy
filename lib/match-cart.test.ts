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

vi.mock("@/lib/app-settings", () => ({
  getAppSettings: vi.fn(async () => ({ default_match_fee_pln: 40 })),
}));

vi.mock("@/lib/guest-cleanup", () => ({
  tryRemoveTemporaryGuestIfBalanceZero: vi.fn(async () => undefined),
}));

import { getDb } from "@/lib/db";
import { applyMatchCartFromWallet } from "@/lib/match-cart";
import { getUserWalletBalancePln } from "@/lib/wallet";

function createTestDb(): { db: AppDb; sqlite: Database.Database; dbPath: string } {
  const dbPath = path.join(os.tmpdir(), `awp-match-cart-${Date.now()}-${Math.random()}.sqlite`);
  const sqlite = new Database(dbPath);
  sqlite.pragma("foreign_keys = ON");
  sqlite.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      player_alias TEXT UNIQUE NOT NULL,
      is_temporary INTEGER DEFAULT 0
    );
    CREATE TABLE matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      match_date TEXT NOT NULL,
      match_time TEXT NOT NULL,
      location TEXT NOT NULL,
      signed_up INTEGER NOT NULL DEFAULT 0,
      played INTEGER NOT NULL DEFAULT 0,
      cancelled INTEGER NOT NULL DEFAULT 0,
      fee_pln REAL
    );
    CREATE TABLE match_signups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      match_id INTEGER NOT NULL,
      paid INTEGER NOT NULL DEFAULT 0,
      commitment INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(match_id) REFERENCES matches(id)
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
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE wallet_match_carts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payer_user_id INTEGER NOT NULL,
      match_id INTEGER NOT NULL,
      amount_pln REAL NOT NULL,
      fee_per_person_pln REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      hotpay_session_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT
    );
    CREATE TABLE wallet_match_cart_items (
      cart_id INTEGER NOT NULL,
      beneficiary_user_id INTEGER NOT NULL,
      amount_pln REAL NOT NULL,
      PRIMARY KEY (cart_id, beneficiary_user_id)
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

describe("applyMatchCartFromWallet", () => {
  let sqlite: Database.Database;
  let dbPath: string;
  let db: AppDb;

  beforeEach(() => {
    const created = createTestDb();
    sqlite = created.sqlite;
    dbPath = created.dbPath;
    db = created.db;
    vi.mocked(getDb).mockResolvedValue(db);

    sqlite.prepare(`INSERT INTO users (id, first_name, last_name, player_alias) VALUES (1, 'Jan', 'A', 'a')`).run();
    sqlite.prepare(`INSERT INTO users (id, first_name, last_name, player_alias) VALUES (2, 'Ewa', 'B', 'b')`).run();
    sqlite.prepare(`INSERT INTO users (id, first_name, last_name, player_alias) VALUES (3, 'Ola', 'C', 'c')`).run();
    sqlite
      .prepare(
        `INSERT INTO matches (id, match_date, match_time, location, signed_up, fee_pln)
         VALUES (10, '2099-01-01', '20:00', 'Boisko', 3, 120)`
      )
      .run();
    sqlite.prepare(`INSERT INTO match_signups (user_id, match_id, paid) VALUES (1, 10, 0)`).run();
    sqlite.prepare(`INSERT INTO match_signups (user_id, match_id, paid) VALUES (2, 10, 0)`).run();
    sqlite.prepare(`INSERT INTO match_signups (user_id, match_id, paid) VALUES (3, 10, 0)`).run();
    sqlite.prepare(`INSERT INTO wallet_transactions (user_id, kind, amount_pln) VALUES (1, 'deposit', 200)`).run();
  });

  afterEach(() => {
    sqlite.close();
    try {
      fs.unlinkSync(dbPath);
    } catch {
      /* ignore */
    }
  });

  it("opłaca wybranych graczy z portfela płatnika", async () => {
    // 120 / 3 = 40 per person, ceil to 0.5 → 40
    const result = await applyMatchCartFromWallet({
      payerUserId: 1,
      matchId: 10,
      beneficiaryUserIds: [2, 3],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.amount_pln).toBe(80);
    expect(result.paid_user_ids.sort()).toEqual([2, 3]);
    expect(await getUserWalletBalancePln(1)).toBe(120);

    const paid2 = sqlite.prepare(`SELECT paid FROM match_signups WHERE user_id = 2 AND match_id = 10`).get() as {
      paid: number;
    };
    const paid3 = sqlite.prepare(`SELECT paid FROM match_signups WHERE user_id = 3 AND match_id = 10`).get() as {
      paid: number;
    };
    const paid1 = sqlite.prepare(`SELECT paid FROM match_signups WHERE user_id = 1 AND match_id = 10`).get() as {
      paid: number;
    };
    expect(paid2.paid).toBe(1);
    expect(paid3.paid).toBe(1);
    expect(paid1.paid).toBe(0);
  });

  it("odrzuca brak środków", async () => {
    sqlite.prepare(`DELETE FROM wallet_transactions`).run();
    sqlite.prepare(`INSERT INTO wallet_transactions (user_id, kind, amount_pln) VALUES (1, 'deposit', 50)`).run();

    const fail = await applyMatchCartFromWallet({
      payerUserId: 1,
      matchId: 10,
      beneficiaryUserIds: [1, 2],
    });
    expect(fail).toEqual({ ok: false, error: "INSUFFICIENT_FUNDS" });
    expect(await getUserWalletBalancePln(1)).toBe(50);
  });

  it("odrzuca już opłaconych", async () => {
    sqlite.prepare(`UPDATE match_signups SET paid = 1 WHERE user_id = 2`).run();
    const result = await applyMatchCartFromWallet({
      payerUserId: 1,
      matchId: 10,
      beneficiaryUserIds: [2, 3],
    });
    expect(result).toEqual({ ok: false, error: "INVALID_BENEFICIARIES" });
  });

  it("zwraca koszyk przy refundMatchCartBeneficiary", async () => {
    const pay = await applyMatchCartFromWallet({
      payerUserId: 1,
      matchId: 10,
      beneficiaryUserIds: [2],
    });
    expect(pay.ok).toBe(true);

    const { refundMatchCartBeneficiary } = await import("@/lib/match-cart");
    const refund = await refundMatchCartBeneficiary({
      matchId: 10,
      beneficiaryUserId: 2,
      actorUserId: 1,
      reason: "test",
    });
    expect(refund.ok).toBe(true);
    if (!refund.ok) return;
    expect(refund.refunded_pln).toBe(40);
    expect(await getUserWalletBalancePln(1)).toBe(200);

    const paid2 = sqlite.prepare(`SELECT paid FROM match_signups WHERE user_id = 2 AND match_id = 10`).get() as {
      paid: number;
    };
    expect(paid2.paid).toBe(0);
  });
});
