import type { AppDb } from "@/lib/db";
import { getAppSettings } from "@/lib/app-settings";
import { getDb } from "@/lib/db";
import { formatMatchFeePln, perPersonMatchFeePln } from "@/lib/match-fee";
import { isAdminTestModeActive, sqlMatchTestFilter } from "@/lib/test-mode";
import { getUserWalletBalancePln } from "@/lib/wallet";

export type MatchCartPlayer = {
  user_id: number;
  first_name: string;
  last_name: string;
  zawodnik: string;
  paid: number;
  commitment: number;
};

export type MatchCartMatchOption = {
  match_id: number;
  match_date: string;
  match_time: string;
  location: string;
  signed_up: number;
  fee_per_person_pln: number;
  unpaid_players: MatchCartPlayer[];
};

function roundPln(n: number): number {
  return Math.round(n * 100) / 100;
}

function playerLabel(p: { first_name: string; last_name: string; zawodnik?: string; player_alias?: string }) {
  const name = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
  return name || p.zawodnik || p.player_alias || "Gracz";
}

export async function resolveMatchCartFeePerPerson(
  db: AppDb,
  match: { fee_pln: number | null; signed_up: number }
): Promise<number | null> {
  const fromRental = perPersonMatchFeePln(match.fee_pln, match.signed_up);
  if (fromRental != null && fromRental > 0) return fromRental;
  const settings = await getAppSettings(db);
  const def = settings.default_match_fee_pln;
  if (def != null && Number.isFinite(def) && def > 0) return roundPln(def);
  return null;
}

/** Nadchodzące mecze z nieopłaconymi zapisami (commitment=1). */
export async function listMatchCartOptions(): Promise<MatchCartMatchOption[]> {
  const db = await getDb();
  const testMode = await isAdminTestModeActive();
  const matches = (await db
    .prepare(
      `
      SELECT id, match_date, match_time, location, signed_up, fee_pln
      FROM matches
      WHERE COALESCE(played, 0) = 0
        AND COALESCE(cancelled, 0) = 0
        AND ${sqlMatchTestFilter("", testMode)}
        AND date(match_date) >= date('now', '-1 day')
      ORDER BY match_date ASC, match_time ASC
      LIMIT 20
    `
    )
    .all()) as {
    id: number;
    match_date: string;
    match_time: string;
    location: string;
    signed_up: number;
    fee_pln: number | null;
  }[];

  const out: MatchCartMatchOption[] = [];
  for (const m of matches) {
    const fee = await resolveMatchCartFeePerPerson(db, m);
    if (fee == null) continue;

    const unpaid = (await db
      .prepare(
        `
        SELECT u.id AS user_id, u.first_name, u.last_name, u.player_alias AS zawodnik,
               COALESCE(ms.paid, 0) AS paid, COALESCE(ms.commitment, 1) AS commitment
        FROM match_signups ms
        JOIN users u ON u.id = ms.user_id
        WHERE ms.match_id = ?
          AND COALESCE(ms.commitment, 1) = 1
          AND COALESCE(ms.paid, 0) = 0
          AND COALESCE(u.is_temporary, 0) = 0
        ORDER BY u.first_name ASC, u.last_name ASC
      `
      )
      .all(m.id)) as MatchCartPlayer[];

    if (unpaid.length === 0) continue;

    out.push({
      match_id: m.id,
      match_date: m.match_date,
      match_time: m.match_time,
      location: m.location,
      signed_up: Number(m.signed_up),
      fee_per_person_pln: fee,
      unpaid_players: unpaid,
    });
  }
  return out;
}

export type ApplyMatchCartResult =
  | {
      ok: true;
      cart_id: number;
      amount_pln: number;
      balance_pln: number;
      paid_user_ids: number[];
    }
  | {
      ok: false;
      error:
        | "MATCH_NOT_FOUND"
        | "MATCH_CLOSED"
        | "NO_FEE"
        | "NO_BENEFICIARIES"
        | "INVALID_BENEFICIARIES"
        | "INSUFFICIENT_FUNDS"
        | "CART_NOT_FOUND"
        | "CART_NOT_PENDING";
    };

async function loadOpenMatch(db: AppDb, matchId: number) {
  return (await db
    .prepare(
      `
      SELECT id, match_date, match_time, location, signed_up, fee_pln,
             COALESCE(played, 0) AS played, COALESCE(cancelled, 0) AS cancelled,
             COALESCE(is_test, 0) AS is_test
      FROM matches WHERE id = ?
    `
    )
    .get(matchId)) as
    | {
        id: number;
        match_date: string;
        match_time: string;
        location: string;
        signed_up: number;
        fee_pln: number | null;
        played: number;
        cancelled: number;
        is_test: number;
      }
    | undefined;
}

/**
 * Opłaca wybranych zawodników z salda płatnika: debet portfela + paid=1 na zapisach.
 * Atomowość przez kompensację przy braku środków po debecie.
 */
export async function applyMatchCartFromWallet(args: {
  payerUserId: number;
  matchId: number;
  beneficiaryUserIds: number[];
  existingCartId?: number;
}): Promise<ApplyMatchCartResult> {
  const db = await getDb();
  const match = await loadOpenMatch(db, args.matchId);
  if (!match) return { ok: false, error: "MATCH_NOT_FOUND" };
  if (match.played === 1 || match.cancelled === 1) return { ok: false, error: "MATCH_CLOSED" };

  const fee = await resolveMatchCartFeePerPerson(db, match);
  if (fee == null || fee <= 0) return { ok: false, error: "NO_FEE" };

  const uniqueIds = [...new Set(args.beneficiaryUserIds.map((id) => Number(id)).filter((id) => id > 0))];
  if (uniqueIds.length === 0) return { ok: false, error: "NO_BENEFICIARIES" };

  const placeholders = uniqueIds.map(() => "?").join(",");
  const eligible = (await db
    .prepare(
      `
      SELECT u.id AS user_id, u.first_name, u.last_name, u.player_alias AS zawodnik
      FROM match_signups ms
      JOIN users u ON u.id = ms.user_id
      WHERE ms.match_id = ?
        AND ms.user_id IN (${placeholders})
        AND COALESCE(ms.commitment, 1) = 1
        AND COALESCE(ms.paid, 0) = 0
        AND COALESCE(u.is_temporary, 0) = 0
    `
    )
    .all(args.matchId, ...uniqueIds)) as {
    user_id: number;
    first_name: string;
    last_name: string;
    zawodnik: string;
  }[];

  if (eligible.length !== uniqueIds.length) {
    return { ok: false, error: "INVALID_BENEFICIARIES" };
  }

  const amountPln = roundPln(fee * eligible.length);
  const balanceBefore = await getUserWalletBalancePln(args.payerUserId);
  if (balanceBefore < amountPln) {
    return { ok: false, error: "INSUFFICIENT_FUNDS" };
  }

  const matchLabel = `${match.match_date} ${match.match_time} · ${match.location}`;
  let cartId = args.existingCartId;

  if (cartId == null) {
    const cartInsert = await db
      .prepare(
        `
        INSERT INTO wallet_match_carts
          (payer_user_id, match_id, amount_pln, fee_per_person_pln, status)
        VALUES (?, ?, ?, ?, 'pending')
      `
      )
      .run(args.payerUserId, args.matchId, amountPln, fee);
    cartId = Number(cartInsert.lastInsertRowid);
    for (const p of eligible) {
      await db
        .prepare(
          `INSERT INTO wallet_match_cart_items (cart_id, beneficiary_user_id, amount_pln)
           VALUES (?, ?, ?)`
        )
        .run(cartId, p.user_id, fee);
    }
  } else {
    const cart = (await db
      .prepare(`SELECT id, status, payer_user_id FROM wallet_match_carts WHERE id = ?`)
      .get(cartId)) as { id: number; status: string; payer_user_id: number } | undefined;
    if (!cart) return { ok: false, error: "CART_NOT_FOUND" };
    if (cart.status !== "pending") return { ok: false, error: "CART_NOT_PENDING" };
    if (cart.payer_user_id !== args.payerUserId) return { ok: false, error: "CART_NOT_FOUND" };
  }

  const debit = await db
    .prepare(
      `INSERT INTO wallet_transactions (user_id, kind, amount_pln, match_id, note, is_test)
       VALUES (?, 'match_charge', ?, ?, ?, ?)`
    )
    .run(
      args.payerUserId,
      -amountPln,
      args.matchId,
      `Koszyk meczowy — ${eligible.length}× ${formatMatchFeePln(fee)} · ${matchLabel}`,
      match.is_test ? 1 : 0
    );

  const balanceAfterDebit = await getUserWalletBalancePln(args.payerUserId);
  if (balanceAfterDebit < 0) {
    await db.prepare(`DELETE FROM wallet_transactions WHERE id = ?`).run(Number(debit.lastInsertRowid));
    return { ok: false, error: "INSUFFICIENT_FUNDS" };
  }

  const paidUserIds: number[] = [];
  for (const p of eligible) {
    const upd = await db
      .prepare(
        `UPDATE match_signups SET paid = 1
         WHERE match_id = ? AND user_id = ? AND COALESCE(paid, 0) = 0`
      )
      .run(args.matchId, p.user_id);
    if (upd.changes > 0) paidUserIds.push(p.user_id);
  }

  if (paidUserIds.length !== eligible.length) {
    await db.prepare(`DELETE FROM wallet_transactions WHERE id = ?`).run(Number(debit.lastInsertRowid));
    for (const uid of paidUserIds) {
      await db
        .prepare(`UPDATE match_signups SET paid = 0 WHERE match_id = ? AND user_id = ?`)
        .run(args.matchId, uid);
    }
    return { ok: false, error: "INVALID_BENEFICIARIES" };
  }

  const names = eligible.map((p) => playerLabel(p)).join(", ");
  await db
    .prepare(`UPDATE wallet_transactions SET note = ? WHERE id = ?`)
    .run(
      `Koszyk meczowy — opłacono: ${names} (${eligible.length}× ${formatMatchFeePln(fee)}) · ${matchLabel}`,
      Number(debit.lastInsertRowid)
    );

  await db
    .prepare(
      `UPDATE wallet_match_carts
       SET status = 'completed', completed_at = datetime('now')
       WHERE id = ? AND status = 'pending'`
    )
    .run(cartId);

  const balance_pln = await getUserWalletBalancePln(args.payerUserId);
  return {
    ok: true,
    cart_id: cartId,
    amount_pln: amountPln,
    balance_pln,
    paid_user_ids: paidUserIds,
  };
}

/** Tworzy koszyk pending (przed HotPay). */
export async function createPendingMatchCart(args: {
  payerUserId: number;
  matchId: number;
  beneficiaryUserIds: number[];
}): Promise<
  | { ok: true; cart_id: number; amount_pln: number; fee_per_person_pln: number; beneficiaries: number[] }
  | {
      ok: false;
      error:
        | "MATCH_NOT_FOUND"
        | "MATCH_CLOSED"
        | "NO_FEE"
        | "NO_BENEFICIARIES"
        | "INVALID_BENEFICIARIES";
    }
> {
  const db = await getDb();
  const match = await loadOpenMatch(db, args.matchId);
  if (!match) return { ok: false, error: "MATCH_NOT_FOUND" };
  if (match.played === 1 || match.cancelled === 1) return { ok: false, error: "MATCH_CLOSED" };

  const fee = await resolveMatchCartFeePerPerson(db, match);
  if (fee == null || fee <= 0) return { ok: false, error: "NO_FEE" };

  const uniqueIds = [...new Set(args.beneficiaryUserIds.map((id) => Number(id)).filter((id) => id > 0))];
  if (uniqueIds.length === 0) return { ok: false, error: "NO_BENEFICIARIES" };

  const placeholders = uniqueIds.map(() => "?").join(",");
  const eligible = (await db
    .prepare(
      `
      SELECT u.id AS user_id
      FROM match_signups ms
      JOIN users u ON u.id = ms.user_id
      WHERE ms.match_id = ?
        AND ms.user_id IN (${placeholders})
        AND COALESCE(ms.commitment, 1) = 1
        AND COALESCE(ms.paid, 0) = 0
        AND COALESCE(u.is_temporary, 0) = 0
    `
    )
    .all(args.matchId, ...uniqueIds)) as { user_id: number }[];

  if (eligible.length !== uniqueIds.length) {
    return { ok: false, error: "INVALID_BENEFICIARIES" };
  }

  const amountPln = roundPln(fee * eligible.length);
  const cartInsert = await db
    .prepare(
      `
      INSERT INTO wallet_match_carts
        (payer_user_id, match_id, amount_pln, fee_per_person_pln, status)
      VALUES (?, ?, ?, ?, 'pending')
    `
    )
    .run(args.payerUserId, args.matchId, amountPln, fee);
  const cartId = Number(cartInsert.lastInsertRowid);
  for (const p of eligible) {
    await db
      .prepare(
        `INSERT INTO wallet_match_cart_items (cart_id, beneficiary_user_id, amount_pln)
         VALUES (?, ?, ?)`
      )
      .run(cartId, p.user_id, fee);
  }

  return {
    ok: true,
    cart_id: cartId,
    amount_pln: amountPln,
    fee_per_person_pln: fee,
    beneficiaries: eligible.map((e) => e.user_id),
  };
}

export async function applyPendingMatchCartAfterHotpay(
  cartId: number,
  payerUserId: number
): Promise<ApplyMatchCartResult> {
  const db = await getDb();
  const cart = (await db
    .prepare(
      `SELECT id, payer_user_id, match_id, status FROM wallet_match_carts WHERE id = ?`
    )
    .get(cartId)) as
    | { id: number; payer_user_id: number; match_id: number; status: string }
    | undefined;
  if (!cart) return { ok: false, error: "CART_NOT_FOUND" };
  if (cart.status === "completed") {
    const balance_pln = await getUserWalletBalancePln(payerUserId);
    return { ok: true, cart_id: cartId, amount_pln: 0, balance_pln, paid_user_ids: [] };
  }
  if (cart.status !== "pending") return { ok: false, error: "CART_NOT_PENDING" };
  if (cart.payer_user_id !== payerUserId) return { ok: false, error: "CART_NOT_FOUND" };

  const items = (await db
    .prepare(`SELECT beneficiary_user_id FROM wallet_match_cart_items WHERE cart_id = ?`)
    .all(cartId)) as { beneficiary_user_id: number }[];

  return applyMatchCartFromWallet({
    payerUserId,
    matchId: cart.match_id,
    beneficiaryUserIds: items.map((i) => i.beneficiary_user_id),
    existingCartId: cartId,
  });
}

export async function linkHotpaySessionToCart(cartId: number, sessionId: string) {
  const db = await getDb();
  await db
    .prepare(`UPDATE wallet_match_carts SET hotpay_session_id = ? WHERE id = ? AND status = 'pending'`)
    .run(sessionId, cartId);
}

export async function getCartIdByHotpaySession(sessionId: string): Promise<number | null> {
  const db = await getDb();
  const row = (await db
    .prepare(`SELECT id FROM wallet_match_carts WHERE hotpay_session_id = ? LIMIT 1`)
    .get(sessionId)) as { id: number } | undefined;
  return row?.id ?? null;
}

/**
 * Zwrot opłaty koszykowej za jednego beneficjenta (np. wypisanie z meczu).
 * Kredytuje płatnika koszyka, kasuje pozycję, stawia paid=0 jeśli zapis jeszcze istnieje.
 */
export async function refundMatchCartBeneficiary(args: {
  matchId: number;
  beneficiaryUserId: number;
  actorUserId: number | null;
  reason: string;
}): Promise<
  | { ok: true; refunded_pln: number; payer_user_id?: number }
  | { ok: false; error: string }
> {
  const db = await getDb();
  const row = (await db
    .prepare(
      `
      SELECT c.id AS cart_id, c.payer_user_id, i.amount_pln
      FROM wallet_match_cart_items i
      JOIN wallet_match_carts c ON c.id = i.cart_id
      WHERE c.match_id = ?
        AND c.status = 'completed'
        AND i.beneficiary_user_id = ?
      ORDER BY c.id DESC
      LIMIT 1
    `
    )
    .get(args.matchId, args.beneficiaryUserId)) as
    | { cart_id: number; payer_user_id: number; amount_pln: number }
    | undefined;

  if (!row) return { ok: true, refunded_pln: 0 };

  const amount = roundPln(Number(row.amount_pln));
  if (!(amount > 0)) return { ok: true, refunded_pln: 0 };

  const matchMeta = (await db
    .prepare(`SELECT COALESCE(is_test, 0) AS is_test FROM matches WHERE id = ?`)
    .get(args.matchId)) as { is_test: number } | undefined;

  await db
    .prepare(
      `INSERT INTO wallet_transactions (user_id, kind, amount_pln, match_id, related_user_id, note, is_test)
       VALUES (?, 'adjustment', ?, ?, ?, ?, ?)`
    )
    .run(
      row.payer_user_id,
      amount,
      args.matchId,
      args.beneficiaryUserId,
      `Zwrot koszyka meczowego — ${args.reason}`,
      matchMeta?.is_test ? 1 : 0
    );

  await db
    .prepare(`DELETE FROM wallet_match_cart_items WHERE cart_id = ? AND beneficiary_user_id = ?`)
    .run(row.cart_id, args.beneficiaryUserId);

  await db
    .prepare(`UPDATE match_signups SET paid = 0 WHERE match_id = ? AND user_id = ?`)
    .run(args.matchId, args.beneficiaryUserId);

  const remaining = (await db
    .prepare(`SELECT COUNT(*) AS n FROM wallet_match_cart_items WHERE cart_id = ?`)
    .get(row.cart_id)) as { n: number } | undefined;
  if (Number(remaining?.n ?? 0) === 0) {
    await db
      .prepare(`UPDATE wallet_match_carts SET status = 'cancelled' WHERE id = ? AND status = 'completed'`)
      .run(row.cart_id);
  }

  return { ok: true, refunded_pln: amount, payer_user_id: row.payer_user_id };
}

/** Zwrot wszystkich ukończonych koszyków meczu (np. odwołanie meczu). */
export async function refundAllMatchCartsForMatch(args: {
  matchId: number;
  actorUserId: number | null;
  reason: string;
}): Promise<{ refunded_count: number; refunded_pln: number }> {
  const db = await getDb();
  const items = (await db
    .prepare(
      `
      SELECT i.beneficiary_user_id
      FROM wallet_match_cart_items i
      JOIN wallet_match_carts c ON c.id = i.cart_id
      WHERE c.match_id = ? AND c.status = 'completed'
    `
    )
    .all(args.matchId)) as { beneficiary_user_id: number }[];

  let refunded_count = 0;
  let refunded_pln = 0;
  for (const item of items) {
    const r = await refundMatchCartBeneficiary({
      matchId: args.matchId,
      beneficiaryUserId: item.beneficiary_user_id,
      actorUserId: args.actorUserId,
      reason: args.reason,
    });
    if (r.ok && r.refunded_pln > 0) {
      refunded_count += 1;
      refunded_pln = roundPln(refunded_pln + r.refunded_pln);
    }
  }
  return { refunded_count, refunded_pln };
}
