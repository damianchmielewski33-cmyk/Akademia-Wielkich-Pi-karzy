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
      wallet_kind TEXT NOT NULL DEFAULT 'admin',
      note TEXT,
      is_test INTEGER NOT NULL DEFAULT 0,
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
    CREATE TABLE match_wallet_charges (
      match_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      amount_pln REAL NOT NULL,
      note TEXT,
      created_by_admin_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (match_id, user_id)
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
    // Stała zaliczka MATCH_PREPAYMENT_PLN = 25
    const result = await applyMatchCartFromWallet({
      payerUserId: 1,
      matchId: 10,
      beneficiaryUserIds: [2, 3],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.amount_pln).toBe(50);
    expect(result.paid_user_ids.sort()).toEqual([2, 3]);
    expect(await getUserWalletBalancePln(1)).toBe(150);

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
    sqlite.prepare(`INSERT INTO wallet_transactions (user_id, kind, amount_pln) VALUES (1, 'deposit', 40)`).run();

    const fail = await applyMatchCartFromWallet({
      payerUserId: 1,
      matchId: 10,
      beneficiaryUserIds: [1, 2],
    });
    expect(fail).toEqual({ ok: false, error: "INSUFFICIENT_FUNDS" });
    expect(await getUserWalletBalancePln(1)).toBe(40);
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

  it("po HotPay (walletKind=operator) nie zostawia salda na portfelu operatora", async () => {
    sqlite.prepare(`DELETE FROM wallet_transactions`).run();
    sqlite
      .prepare(
        `INSERT INTO wallet_transactions (user_id, kind, amount_pln, wallet_kind) VALUES (1, 'deposit', 25, 'operator')`
      )
      .run();

    const result = await applyMatchCartFromWallet({
      payerUserId: 1,
      matchId: 10,
      beneficiaryUserIds: [1],
      walletKind: "operator",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const { getWalletBalances } = await import("@/lib/wallet");
    const balances = await getWalletBalances(1);
    expect(balances.operator).toBe(0);
    expect(balances.admin).toBe(0);
    expect(balances.total).toBe(0);

    const charge = sqlite
      .prepare(
        `SELECT wallet_kind, amount_pln FROM wallet_transactions WHERE kind = 'match_charge' AND user_id = 1`
      )
      .get() as { wallet_kind: string; amount_pln: number };
    expect(charge.wallet_kind).toBe("operator");
    expect(Number(charge.amount_pln)).toBe(-25);
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
    expect(refund.refunded_pln).toBe(25);
    expect(await getUserWalletBalancePln(1)).toBe(200);

    const paid2 = sqlite.prepare(`SELECT paid FROM match_signups WHERE user_id = 2 AND match_id = 10`).get() as {
      paid: number;
    };
    expect(paid2.paid).toBe(0);
  });

  it("przy zwrocie dzieli G/O proporcjonalnie do debetu koszyka", async () => {
    sqlite.prepare(`DELETE FROM wallet_transactions`).run();
    // Ani O (10), ani G (20) nie pokrywa 25 sam — koszyk musi zsplitować.
    sqlite
      .prepare(
        `INSERT INTO wallet_transactions (user_id, kind, amount_pln, wallet_kind) VALUES (1, 'deposit', 10, 'operator')`
      )
      .run();
    sqlite
      .prepare(
        `INSERT INTO wallet_transactions (user_id, kind, amount_pln, wallet_kind) VALUES (1, 'deposit', 20, 'admin')`
      )
      .run();

    const pay = await applyMatchCartFromWallet({
      payerUserId: 1,
      matchId: 10,
      beneficiaryUserIds: [2],
    });
    expect(pay.ok).toBe(true);

    const { getWalletBalances } = await import("@/lib/wallet");
    expect(await getWalletBalances(1)).toEqual({ admin: 5, operator: 0, total: 5 });

    const { refundMatchCartBeneficiary } = await import("@/lib/match-cart");
    const refund = await refundMatchCartBeneficiary({
      matchId: 10,
      beneficiaryUserId: 2,
      actorUserId: 1,
      reason: "split test",
    });
    expect(refund.ok).toBe(true);
    if (!refund.ok) return;
    expect(refund.refunded_pln).toBe(25);

    const balances = await getWalletBalances(1);
    expect(balances.operator).toBe(10);
    expect(balances.admin).toBe(20);
    expect(balances.total).toBe(30);

    const adjustments = sqlite
      .prepare(
        `SELECT wallet_kind, amount_pln FROM wallet_transactions
         WHERE user_id = 1 AND kind = 'adjustment' AND match_id = 10
         ORDER BY wallet_kind`
      )
      .all() as { wallet_kind: string; amount_pln: number }[];
    expect(adjustments).toEqual([
      { wallet_kind: "admin", amount_pln: 15 },
      { wallet_kind: "operator", amount_pln: 10 },
    ]);
  });

  it("przy rozliczeniu nie obciąża opłaconego i zwraca nadpłatę gdy składka niższa", async () => {
    const pay = await applyMatchCartFromWallet({
      payerUserId: 1,
      matchId: 10,
      beneficiaryUserIds: [2],
    });
    expect(pay.ok).toBe(true);
    // Po koszyku: 200 - 25 = 175
    expect(await getUserWalletBalancePln(1)).toBe(175);

    const { settlePrepaidPlayerWithoutCharge } = await import("@/lib/match-cart");
    const settle = await settlePrepaidPlayerWithoutCharge({
      matchId: 10,
      beneficiaryUserId: 2,
      finalFeePln: 20,
      adminId: 1,
    });
    expect(settle.ok).toBe(true);
    if (!settle.ok) return;
    expect(settle.credited_pln).toBe(5);
    expect(settle.payer_user_id).toBe(1);
    // 175 + 5 zwrotu = 180
    expect(await getUserWalletBalancePln(1)).toBe(180);

    const chargeRow = sqlite
      .prepare(`SELECT amount_pln FROM match_wallet_charges WHERE match_id = 10 AND user_id = 2`)
      .get() as { amount_pln: number };
    expect(Number(chargeRow.amount_pln)).toBe(20);

    const again = await settlePrepaidPlayerWithoutCharge({
      matchId: 10,
      beneficiaryUserId: 2,
      finalFeePln: 20,
      adminId: 1,
    });
    expect(again.ok).toBe(true);
    if (!again.ok) return;
    expect(again.already_settled).toBe(true);
    expect(await getUserWalletBalancePln(1)).toBe(180);
  });

  it("przy anulowaniu meczu zwraca środki na portfel (także po rozliczeniu prepaid)", async () => {
    const pay = await applyMatchCartFromWallet({
      payerUserId: 1,
      matchId: 10,
      beneficiaryUserIds: [2],
    });
    expect(pay.ok).toBe(true);

    const { settlePrepaidPlayerWithoutCharge, refundAllMatchPaymentsOnCancel } = await import(
      "@/lib/match-cart"
    );
    await settlePrepaidPlayerWithoutCharge({
      matchId: 10,
      beneficiaryUserId: 2,
      finalFeePln: 20,
      adminId: 1,
    });
    expect(await getUserWalletBalancePln(1)).toBe(180);

    const refunds = await refundAllMatchPaymentsOnCancel({
      matchId: 10,
      actorUserId: 1,
      reason: "odwołanie meczu",
    });
    // Zwraca pozostałe 20 (5 już wróciło jako nadpłata) → z powrotem 200
    expect(refunds.refunded_pln).toBe(20);
    expect(await getUserWalletBalancePln(1)).toBe(200);
  });

  it("przy nieobecności zwraca całą zaliczkę koszyka", async () => {
    const pay = await applyMatchCartFromWallet({
      payerUserId: 1,
      matchId: 10,
      beneficiaryUserIds: [2],
    });
    expect(pay.ok).toBe(true);
    expect(await getUserWalletBalancePln(1)).toBe(175);

    const { refundMatchCartBeneficiary } = await import("@/lib/match-cart");
    const refund = await refundMatchCartBeneficiary({
      matchId: 10,
      beneficiaryUserId: 2,
      actorUserId: 1,
      reason: "nieobecność — zwrot zaliczki",
    });
    expect(refund.ok).toBe(true);
    if (!refund.ok) return;
    expect(refund.refunded_pln).toBe(25);
    expect(await getUserWalletBalancePln(1)).toBe(200);

    const paid2 = sqlite.prepare(`SELECT paid FROM match_signups WHERE user_id = 2 AND match_id = 10`).get() as {
      paid: number;
    };
    expect(paid2.paid).toBe(0);
  });

  it("opłaca gościa tymczasowego z koszyka", async () => {
    sqlite
      .prepare(
        `INSERT INTO users (id, first_name, last_name, player_alias, is_temporary)
         VALUES (9, 'Gość', 'Test', 'guest9', 1)`
      )
      .run();
    sqlite.prepare(`INSERT INTO match_signups (user_id, match_id, paid) VALUES (9, 10, 0)`).run();

    const result = await applyMatchCartFromWallet({
      payerUserId: 1,
      matchId: 10,
      beneficiaryUserIds: [9],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.amount_pln).toBe(25);
    expect(await getUserWalletBalancePln(1)).toBe(175);

    const paidGuest = sqlite
      .prepare(`SELECT paid FROM match_signups WHERE user_id = 9 AND match_id = 10`)
      .get() as { paid: number };
    expect(paidGuest.paid).toBe(1);

    const item = sqlite
      .prepare(
        `SELECT i.beneficiary_user_id FROM wallet_match_cart_items i
         JOIN wallet_match_carts c ON c.id = i.cart_id
         WHERE c.match_id = 10 AND i.beneficiary_user_id = 9 AND c.status = 'completed'`
      )
      .get() as { beneficiary_user_id: number } | undefined;
    expect(item?.beneficiary_user_id).toBe(9);
  });
});
