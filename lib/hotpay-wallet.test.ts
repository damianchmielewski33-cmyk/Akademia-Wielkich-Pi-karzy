import Database from "better-sqlite3";
import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AppDb } from "@/lib/db";
import { buildMockNotification, HOTPAY_TEST_CONFIG, HOTPAY_TEST_ORDER } from "@/lib/hotpay-fixtures";
import { processHotpayNotification } from "@/lib/hotpay-wallet";

vi.mock("@/lib/guest-cleanup", () => ({
  tryRemoveTemporaryGuestIfBalanceZero: vi.fn(async () => undefined),
}));

function createTestDb(): { db: AppDb; sqlite: Database.Database; dbPath: string } {
  const dbPath = path.join(os.tmpdir(), `awp-hotpay-test-${Date.now()}-${Math.random()}.sqlite`);
  const sqlite = new Database(dbPath);
  sqlite.pragma("foreign_keys = ON");
  sqlite.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      player_alias TEXT UNIQUE NOT NULL,
      is_admin INTEGER DEFAULT 0
    );
    CREATE TABLE wallet_deposit_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      amount_pln REAL NOT NULL,
      created_by TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      wallet_kind TEXT NOT NULL DEFAULT 'operator',
      note TEXT,
      player_declared_at TEXT,
      admin_confirmed_received_at TEXT,
      admin_declared_received_at TEXT,
      player_confirmed_amount_at TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE TABLE wallet_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      kind TEXT NOT NULL,
      amount_pln REAL NOT NULL,
      deposit_request_id INTEGER,
      match_id INTEGER,
      wallet_kind TEXT NOT NULL DEFAULT 'operator',
      note TEXT,
      is_test INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (deposit_request_id) REFERENCES wallet_deposit_requests(id)
    );
    CREATE TABLE hotpay_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL,
      kind TEXT NOT NULL,
      amount_pln REAL NOT NULL,
      gross_amount_pln REAL,
      status TEXT NOT NULL DEFAULT 'pending',
      hotpay_payment_id TEXT,
      secure TEXT,
      deposit_request_id INTEGER,
      cart_id INTEGER,
      booking_id INTEGER,
      error_message TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT,
      is_test INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (deposit_request_id) REFERENCES wallet_deposit_requests(id)
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

describe("processHotpayNotification", () => {
  let sqlite: Database.Database;
  let db: AppDb;
  let dbPath: string;
  let userId: number;

  afterEach(() => {
    sqlite.close();
    try {
      fs.unlinkSync(dbPath);
    } catch {
      /* ignore */
    }
  });

  function seedPendingPayment() {
    ({ db, sqlite, dbPath } = createTestDb());
    userId = Number(
      sqlite
        .prepare("INSERT INTO users (first_name, last_name, player_alias) VALUES (?,?,?)")
        .run("Jan", "Kowalski", "janek").lastInsertRowid
    );
    sqlite
      .prepare(
        `INSERT INTO hotpay_payments (session_id, user_id, kind, amount_pln, status)
         VALUES (?, ?, 'topup', ?, 'pending')`
      )
      .run(HOTPAY_TEST_ORDER.orderId, userId, HOTPAY_TEST_ORDER.amountPln);
  }

  it("credits wallet on SUCCESS once (idempotent)", async () => {
    seedPendingPayment();
    const payload = buildMockNotification({ status: "SUCCESS" });

    const first = await processHotpayNotification(
      db,
      payload,
      HOTPAY_TEST_CONFIG.notificationPassword,
      HOTPAY_TEST_CONFIG.sekret
    );
    expect(first).toEqual({ ok: true, outcome: "credited" });

    const balance = sqlite
      .prepare("SELECT COALESCE(SUM(amount_pln),0) AS b FROM wallet_transactions WHERE user_id = ?")
      .get(userId) as { b: number };
    expect(Number(balance.b)).toBe(50);

    const second = await processHotpayNotification(
      db,
      payload,
      HOTPAY_TEST_CONFIG.notificationPassword,
      HOTPAY_TEST_CONFIG.sekret
    );
    expect(second).toEqual({ ok: true, outcome: "already_credited" });

    const balance2 = sqlite
      .prepare("SELECT COALESCE(SUM(amount_pln),0) AS b FROM wallet_transactions WHERE user_id = ?")
      .get(userId) as { b: number };
    expect(Number(balance2.b)).toBe(50);

    const txCount = sqlite
      .prepare("SELECT COUNT(*) AS c FROM wallet_transactions WHERE user_id = ?")
      .get(userId) as { c: number };
    expect(Number(txCount.c)).toBe(1);
  });

  it("does not double-credit under concurrent SUCCESS notifications", async () => {
    seedPendingPayment();
    const payload = buildMockNotification({ status: "SUCCESS" });

    const [a, b] = await Promise.all([
      processHotpayNotification(
        db,
        payload,
        HOTPAY_TEST_CONFIG.notificationPassword,
        HOTPAY_TEST_CONFIG.sekret
      ),
      processHotpayNotification(
        db,
        payload,
        HOTPAY_TEST_CONFIG.notificationPassword,
        HOTPAY_TEST_CONFIG.sekret
      ),
    ]);

    expect(a.ok && b.ok).toBe(true);
    const outcomes = [a, b].map((r) => (r.ok ? r.outcome : r.error));
    expect(outcomes.filter((o) => o === "credited")).toHaveLength(1);
    expect(outcomes.filter((o) => o === "already_credited")).toHaveLength(1);

    const balance = sqlite
      .prepare("SELECT COALESCE(SUM(amount_pln),0) AS b FROM wallet_transactions WHERE user_id = ?")
      .get(userId) as { b: number };
    expect(Number(balance.b)).toBe(50);

    const txCount = sqlite
      .prepare("SELECT COUNT(*) AS c FROM wallet_transactions WHERE user_id = ?")
      .get(userId) as { c: number };
    expect(Number(txCount.c)).toBe(1);
  });

  it("marks failure without crediting on FAILURE", async () => {
    seedPendingPayment();
    const payload = buildMockNotification({ status: "FAILURE" });
    const result = await processHotpayNotification(
      db,
      payload,
      HOTPAY_TEST_CONFIG.notificationPassword,
      HOTPAY_TEST_CONFIG.sekret
    );
    expect(result).toEqual({ ok: true, outcome: "failed" });

    const payment = sqlite
      .prepare("SELECT status, error_message FROM hotpay_payments WHERE session_id = ?")
      .get(HOTPAY_TEST_ORDER.orderId) as { status: string; error_message: string };
    expect(payment.status).toBe("failure");
    expect(payment.error_message).toMatch(/odrzucona/i);

    const balance = sqlite
      .prepare("SELECT COALESCE(SUM(amount_pln),0) AS b FROM wallet_transactions WHERE user_id = ?")
      .get(userId) as { b: number };
    expect(Number(balance.b)).toBe(0);
  });

  it("credits SUCCESS even after local cancel/abandon", async () => {
    const { markHotpayPaymentCancelledByUser, getHotpayPaymentBySessionId } = await import(
      "@/lib/hotpay-wallet"
    );
    seedPendingPayment();
    const pending = await getHotpayPaymentBySessionId(db, HOTPAY_TEST_ORDER.orderId);
    expect(pending).toBeTruthy();
    await markHotpayPaymentCancelledByUser(db, pending!);

    const payload = buildMockNotification({ status: "SUCCESS" });
    const result = await processHotpayNotification(
      db,
      payload,
      HOTPAY_TEST_CONFIG.notificationPassword,
      HOTPAY_TEST_CONFIG.sekret
    );
    expect(result).toEqual({ ok: true, outcome: "credited" });

    const balance = sqlite
      .prepare("SELECT COALESCE(SUM(amount_pln),0) AS b FROM wallet_transactions WHERE user_id = ?")
      .get(userId) as { b: number };
    expect(Number(balance.b)).toBe(50);
  });

  it("admin-style credit recovers cancelled and failure without deposit", async () => {
    const {
      applyHotpaySuccessCredit,
      canManualCreditHotpayPayment,
      getHotpayPaymentBySessionId,
      markHotpayPaymentCancelledByUser,
      markHotpayPaymentFailure,
    } = await import("@/lib/hotpay-wallet");

    seedPendingPayment();
    const pending = await getHotpayPaymentBySessionId(db, HOTPAY_TEST_ORDER.orderId);
    expect(pending).toBeTruthy();
    await markHotpayPaymentCancelledByUser(db, pending!);
    const cancelled = await getHotpayPaymentBySessionId(db, HOTPAY_TEST_ORDER.orderId);
    expect(cancelled?.status).toBe("cancelled");
    expect(canManualCreditHotpayPayment(cancelled!)).toBe(true);

    const creditCancelled = await applyHotpaySuccessCredit(db, cancelled!, {
      hotpayPaymentId: "admin-manual-1",
      secure: "admin-confirm",
    });
    expect(creditCancelled).toEqual({ ok: true, alreadyApplied: false });
    expect(
      Number(
        (
          sqlite
            .prepare("SELECT COALESCE(SUM(amount_pln),0) AS b FROM wallet_transactions WHERE user_id = ?")
            .get(userId) as { b: number }
        ).b
      )
    ).toBe(50);

    // Druga sesja: failure → ręczne księgowanie
    const order2 = `${HOTPAY_TEST_ORDER.orderId}_fail`;
    sqlite
      .prepare(
        `INSERT INTO hotpay_payments (session_id, user_id, kind, amount_pln, status)
         VALUES (?, ?, 'topup', ?, 'pending')`
      )
      .run(order2, userId, 25);
    const failPending = await getHotpayPaymentBySessionId(db, order2);
    await markHotpayPaymentFailure(db, failPending!.id, {
      hotpayPaymentId: "hp-fail",
      secure: "sec",
      errorMessage: "Płatność została odrzucona",
    });
    const failed = await getHotpayPaymentBySessionId(db, order2);
    expect(failed?.status).toBe("failure");
    expect(canManualCreditHotpayPayment(failed!)).toBe(true);
    const creditFailed = await applyHotpaySuccessCredit(db, failed!, {
      hotpayPaymentId: "admin-manual-2",
      secure: "admin-confirm",
    });
    expect(creditFailed).toEqual({ ok: true, alreadyApplied: false });
    expect(
      Number(
        (
          sqlite
            .prepare("SELECT COALESCE(SUM(amount_pln),0) AS b FROM wallet_transactions WHERE user_id = ?")
            .get(userId) as { b: number }
        ).b
      )
    ).toBe(75);
  });

  it("rejects bad HASH", async () => {
    seedPendingPayment();
    const payload = buildMockNotification({ status: "SUCCESS", invalidHash: true });
    const result = await processHotpayNotification(
      db,
      payload,
      HOTPAY_TEST_CONFIG.notificationPassword,
      HOTPAY_TEST_CONFIG.sekret
    );
    expect(result).toEqual({ ok: false, error: "BAD_HASH" });
  });

  it("rejects amount mismatch", async () => {
    seedPendingPayment();
    const payload = buildMockNotification({ status: "SUCCESS", amount: "10.00" });
    const result = await processHotpayNotification(
      db,
      payload,
      HOTPAY_TEST_CONFIG.notificationPassword,
      HOTPAY_TEST_CONFIG.sekret
    );
    expect(result).toEqual({ ok: false, error: "AMOUNT_MISMATCH" });
  });

  it("keeps pending on PENDING status", async () => {
    seedPendingPayment();
    const payload = buildMockNotification({ status: "PENDING" });
    const result = await processHotpayNotification(
      db,
      payload,
      HOTPAY_TEST_CONFIG.notificationPassword,
      HOTPAY_TEST_CONFIG.sekret
    );
    expect(result).toEqual({ ok: true, outcome: "pending" });
    const payment = sqlite
      .prepare("SELECT status, hotpay_payment_id FROM hotpay_payments WHERE session_id = ?")
      .get(HOTPAY_TEST_ORDER.orderId) as { status: string; hotpay_payment_id: string };
    expect(payment.status).toBe("pending");
    expect(payment.hotpay_payment_id).toBe(HOTPAY_TEST_ORDER.paymentId);
  });
});

describe("diagnoseHotpayPayment / canManualCreditHotpayPayment", () => {
  it("exposes credit recovery for failure and cancelled without deposit", async () => {
    const { canManualCreditHotpayPayment, diagnoseHotpayPayment } = await import("@/lib/hotpay-wallet");

    expect(
      canManualCreditHotpayPayment({ status: "failure", deposit_request_id: null })
    ).toBe(true);
    expect(
      canManualCreditHotpayPayment({ status: "cancelled", deposit_request_id: null })
    ).toBe(true);
    expect(
      canManualCreditHotpayPayment({ status: "success", deposit_request_id: 12 })
    ).toBe(false);

    expect(diagnoseHotpayPayment({ status: "failure", deposit_request_id: null, error_message: "x" })).toContain(
      'action:"credit"'
    );
    expect(diagnoseHotpayPayment({ status: "cancelled", deposit_request_id: null })).toContain(
      'action:"credit"'
    );
    expect(diagnoseHotpayPayment({ status: "pending", created_at: "2099-01-01 00:00:00" })).toContain(
      'action:"credit"'
    );
    expect(
      diagnoseHotpayPayment({ status: "success", deposit_request_id: 1 })
    ).toBe("OK — zaksięgowano");
  });
});
