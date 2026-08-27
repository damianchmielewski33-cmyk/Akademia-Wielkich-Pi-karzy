import type { AppDb } from "@/lib/db";
import { getDb } from "@/lib/db";
import { formatMatchFeePln, MATCH_PREPAYMENT_PLN } from "@/lib/match-fee";
import { getUserWalletBalancePln, getWalletBalances } from "@/lib/wallet";

export type MatchCartPlayer = {
  user_id: number;
  first_name: string;
  last_name: string;
  zawodnik: string;
  paid: number;
  commitment: number;
  is_temporary?: number;
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

/**
 * Kredytuje zwrot proporcjonalnie do oryginalnych debetów `match_charge` (admin/operator).
 * Unika błędu „ostatni wallet_kind wygrywa” przy splitcie G/O lub wielu koszykach na ten sam mecz.
 */
async function creditRefundSplitByMatchCharges(args: {
  db: AppDb;
  payerUserId: number;
  matchId: number;
  amountPln: number;
  relatedUserId?: number | null;
  note: string;
}): Promise<void> {
  const amount = roundPln(args.amountPln);
  if (!(amount > 0)) return;

  const parts = (await args.db
    .prepare(
      `
      SELECT wallet_kind, COALESCE(SUM(amount_pln), 0) AS s
      FROM wallet_transactions
      WHERE user_id = ? AND match_id = ? AND kind = 'match_charge' AND amount_pln < 0
      GROUP BY wallet_kind
    `
    )
    .all(args.payerUserId, args.matchId)) as { wallet_kind: string; s: number }[];

  const weights = parts
    .map((p) => ({
      wallet_kind: (p.wallet_kind === "operator" ? "operator" : "admin") as "admin" | "operator",
      abs: roundPln(Math.abs(Number(p.s))),
    }))
    .filter((p) => p.abs > 0);

  const totalDebited = roundPln(weights.reduce((sum, w) => sum + w.abs, 0));

  const credits: { wallet_kind: "admin" | "operator"; amount_pln: number }[] = [];
  if (totalDebited <= 0 || weights.length === 0) {
    credits.push({ wallet_kind: "admin", amount_pln: amount });
  } else if (weights.length === 1) {
    credits.push({ wallet_kind: weights[0].wallet_kind, amount_pln: amount });
  } else {
    let remaining = amount;
    for (let i = 0; i < weights.length; i++) {
      const isLast = i === weights.length - 1;
      const share = isLast ? remaining : roundPln((amount * weights[i].abs) / totalDebited);
      if (!(share > 0)) continue;
      credits.push({ wallet_kind: weights[i].wallet_kind, amount_pln: share });
      remaining = roundPln(remaining - share);
    }
    if (credits.length === 0) {
      credits.push({ wallet_kind: "admin", amount_pln: amount });
    }
  }

  for (const c of credits) {
    await args.db
      .prepare(
        `INSERT INTO wallet_transactions (user_id, kind, amount_pln, match_id, related_user_id, wallet_kind, note, is_test)
         VALUES (?, 'adjustment', ?, ?, ?, ?, ?, ?)`
      )
      .run(
        args.payerUserId,
        c.amount_pln,
        args.matchId,
        args.relatedUserId ?? null,
        c.wallet_kind,
        args.note,
        0
      );
  }
}

/**
 * Kwota koszyka / zaliczki na osobę przed meczem.
 * Stała zaliczka — ostateczna składka przy rozliczeniu może być niższa (zwrot nadpłaty).
 */
export async function resolveMatchCartFeePerPerson(): Promise<number> {
  return MATCH_PREPAYMENT_PLN;
}

/** Nadchodzące mecze z nieopłaconymi zapisami (commitment=1). */
export async function listMatchCartOptions(): Promise<MatchCartMatchOption[]> {
  const db = await getDb();
  const matches = (await db
    .prepare(
      `
      SELECT id, match_date, match_time, location, signed_up, fee_pln
      FROM matches
      WHERE COALESCE(played, 0) = 0
        AND COALESCE(cancelled, 0) = 0
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
    const fee = await resolveMatchCartFeePerPerson();
    if (fee == null) continue;

    const unpaid = (await db
      .prepare(
        `
        SELECT u.id AS user_id, u.first_name, u.last_name, u.player_alias AS zawodnik,
               COALESCE(ms.paid, 0) AS paid, COALESCE(ms.commitment, 1) AS commitment,
               COALESCE(u.is_temporary, 0) AS is_temporary
        FROM match_signups ms
        JOIN users u ON u.id = ms.user_id
        WHERE ms.match_id = ?
          AND COALESCE(ms.commitment, 1) = 1
          AND COALESCE(ms.paid, 0) = 0
          AND NOT EXISTS (
            SELECT 1 FROM match_wallet_charges mwc
            WHERE mwc.match_id = ms.match_id AND mwc.user_id = ms.user_id
          )
        ORDER BY COALESCE(u.is_temporary, 0) DESC, u.first_name ASC, u.last_name ASC
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
             COALESCE(played, 0) AS played, COALESCE(cancelled, 0) AS cancelled
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
      }
    | undefined;
}

/**
 * Dobiera portfel do debetu koszyka.
 * HotPay księguje na `operator` — debet musi iść na ten sam kind, inaczej
 * saldo operatora rośnie jak „doładowanie”, a admin idzie w minus.
 */
function resolveMatchCartDebitParts(
  balances: { admin: number; operator: number; total: number },
  amountPln: number,
  forcedKind?: "admin" | "operator"
): { ok: true; parts: { wallet_kind: "admin" | "operator"; amount_pln: number }[] } | { ok: false } {
  if (balances.total < amountPln) return { ok: false };
  if (forcedKind) {
    const bucket = forcedKind === "operator" ? balances.operator : balances.admin;
    if (bucket + 1e-9 < amountPln) return { ok: false };
    return { ok: true, parts: [{ wallet_kind: forcedKind, amount_pln: amountPln }] };
  }
  if (balances.operator >= amountPln) {
    return { ok: true, parts: [{ wallet_kind: "operator", amount_pln: amountPln }] };
  }
  if (balances.admin >= amountPln) {
    return { ok: true, parts: [{ wallet_kind: "admin", amount_pln: amountPln }] };
  }
  const fromOperator = roundPln(Math.max(0, balances.operator));
  const fromAdmin = roundPln(amountPln - fromOperator);
  const parts: { wallet_kind: "admin" | "operator"; amount_pln: number }[] = [];
  if (fromOperator > 0) parts.push({ wallet_kind: "operator", amount_pln: fromOperator });
  if (fromAdmin > 0) parts.push({ wallet_kind: "admin", amount_pln: fromAdmin });
  if (parts.length === 0) return { ok: false };
  return { ok: true, parts };
}

/**
 * Opłaca wybranych zawodników z salda płatnika: debet portfela + paid=1 na zapisach.
 * W transakcji DB (gdy dostępna): zajęcie paid=1 + debet atomowo —
 * chroni przed podwójnym obciążeniem przy równoległych requestach.
 */
export async function applyMatchCartFromWallet(args: {
  payerUserId: number;
  matchId: number;
  beneficiaryUserIds: number[];
  existingCartId?: number;
  /** Po HotPay (wpłata na operator) — wymusza debet z tego samego portfela. */
  walletKind?: "admin" | "operator";
}): Promise<ApplyMatchCartResult> {
  const db = await getDb();
  if (typeof db.transaction === "function") {
    return db.transaction((tx) => applyMatchCartFromWalletTx(tx, args));
  }
  return applyMatchCartFromWalletTx(db, args);
}

async function applyMatchCartFromWalletTx(
  db: AppDb,
  args: {
    payerUserId: number;
    matchId: number;
    beneficiaryUserIds: number[];
    existingCartId?: number;
    walletKind?: "admin" | "operator";
  }
): Promise<ApplyMatchCartResult> {
  const match = await loadOpenMatch(db, args.matchId);
  if (!match) return { ok: false, error: "MATCH_NOT_FOUND" };
  if (match.played === 1 || match.cancelled === 1) return { ok: false, error: "MATCH_CLOSED" };

  let fee = await resolveMatchCartFeePerPerson();
  if (args.existingCartId != null) {
    const cartFee = (await db
      .prepare(`SELECT fee_per_person_pln FROM wallet_match_carts WHERE id = ?`)
      .get(args.existingCartId)) as { fee_per_person_pln: number } | undefined;
    if (cartFee != null && Number(cartFee.fee_per_person_pln) > 0) {
      fee = roundPln(Number(cartFee.fee_per_person_pln));
    }
  }
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
        AND NOT EXISTS (
          SELECT 1 FROM match_wallet_charges mwc
          WHERE mwc.match_id = ms.match_id AND mwc.user_id = ms.user_id
        )
    `
    )
    .all(args.matchId, ...uniqueIds)) as {
    user_id: number;
    first_name: string;
    last_name: string;
    zawodnik: string;
  }[];

  if (eligible.length !== uniqueIds.length) return { ok: false, error: "INVALID_BENEFICIARIES" };

  const amountPln = roundPln(fee * eligible.length);
  const balances = await getWalletBalances(args.payerUserId, db);
  const debitPlan = resolveMatchCartDebitParts(balances, amountPln, args.walletKind);
  if (!debitPlan.ok) return { ok: false, error: "INSUFFICIENT_FUNDS" };

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

  // Atomowe zajęcie miejsc (paid=1) przed debetem — drugi równoległy request dostanie 0 changes.
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
    for (const uid of paidUserIds) {
      await db
        .prepare(`UPDATE match_signups SET paid = 0 WHERE match_id = ? AND user_id = ?`)
        .run(args.matchId, uid);
    }
    return { ok: false, error: "INVALID_BENEFICIARIES" };
  }

  const baseNote = `Koszyk meczowy — ${eligible.length}× ${formatMatchFeePln(fee)} · ${matchLabel}`;
  const debitIds: number[] = [];
  for (const part of debitPlan.parts) {
    const debit = await db
      .prepare(
        `INSERT INTO wallet_transactions (user_id, kind, amount_pln, match_id, wallet_kind, note, is_test)
         VALUES (?, 'match_charge', ?, ?, ?, ?, ?)`
      )
      .run(args.payerUserId, -part.amount_pln, args.matchId, part.wallet_kind, baseNote, 0);
    debitIds.push(Number(debit.lastInsertRowid));
  }

  const balanceAfterDebit = await getUserWalletBalancePln(args.payerUserId, db);
  if (balanceAfterDebit < 0) {
    for (const id of debitIds) {
      await db.prepare(`DELETE FROM wallet_transactions WHERE id = ?`).run(id);
    }
    for (const uid of paidUserIds) {
      await db
        .prepare(`UPDATE match_signups SET paid = 0 WHERE match_id = ? AND user_id = ?`)
        .run(args.matchId, uid);
    }
    return { ok: false, error: "INSUFFICIENT_FUNDS" };
  }

  const names = eligible.map((p) => playerLabel(p)).join(", ");
  const finalNote = `Koszyk meczowy — opłacono: ${names} (${eligible.length}× ${formatMatchFeePln(fee)}) · ${matchLabel}`;
  for (const id of debitIds) {
    await db.prepare(`UPDATE wallet_transactions SET note = ? WHERE id = ?`).run(finalNote, id);
  }

  const cartDone = await db
    .prepare(
      `UPDATE wallet_match_carts
       SET status = 'completed', completed_at = datetime('now')
       WHERE id = ? AND status = 'pending'`
    )
    .run(cartId);
  if (cartDone.changes === 0 && args.existingCartId != null) {
    for (const id of debitIds) {
      await db.prepare(`DELETE FROM wallet_transactions WHERE id = ?`).run(id);
    }
    for (const uid of paidUserIds) {
      await db
        .prepare(`UPDATE match_signups SET paid = 0 WHERE match_id = ? AND user_id = ?`)
        .run(args.matchId, uid);
    }
    return { ok: false, error: "CART_NOT_PENDING" };
  }

  const balance_pln = await getUserWalletBalancePln(args.payerUserId, db);
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
  /** Nadpisuje stałą zaliczkę 25 zł — np. aktualna składka z linku opłat. */
  feePerPersonPln?: number;
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

  const fee =
    args.feePerPersonPln != null && Number.isFinite(args.feePerPersonPln) && args.feePerPersonPln > 0
      ? Math.round(args.feePerPersonPln * 100) / 100
      : await resolveMatchCartFeePerPerson();
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
        AND NOT EXISTS (
          SELECT 1 FROM match_wallet_charges mwc
          WHERE mwc.match_id = ms.match_id AND mwc.user_id = ms.user_id
        )
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
    // Wpłata HotPay zawsze na portfel operatora — debet musi zneutralizować tę samą półkę.
    walletKind: "operator",
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

/** Kwota koszyka zapłacona z góry za beneficjenta (completed), albo null. */
export async function getPrepaidMatchCartAmount(
  matchId: number,
  beneficiaryUserId: number
): Promise<{ payer_user_id: number; amount_pln: number; cart_id: number } | null> {
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
    .get(matchId, beneficiaryUserId)) as
    | { cart_id: number; payer_user_id: number; amount_pln: number }
    | undefined;
  if (!row) return null;
  const amount = roundPln(Number(row.amount_pln));
  if (!(amount > 0)) return null;
  return { cart_id: row.cart_id, payer_user_id: row.payer_user_id, amount_pln: amount };
}

/**
 * Przy rozliczeniu meczu: gracz z paid=1 nie jest obciążany ponownie.
 * Jeśli zapłacił koszykiem więcej niż ostateczna składka — różnica wraca na portfel płatnika.
 * Zapisuje wiersz match_wallet_charges (bez debetu), żeby nie rozliczać dwa razy.
 */
export async function settlePrepaidPlayerWithoutCharge(args: {
  matchId: number;
  beneficiaryUserId: number;
  finalFeePln: number;
  adminId: number;
}): Promise<
  | {
      ok: true;
      credited_pln: number;
      payer_user_id: number | null;
      prepaid_pln: number;
      /** cart = realna wpłata koszykiem; flag = sama flaga paid bez pozycji koszyka */
      source: "cart" | "flag";
      already_settled?: boolean;
    }
  | { ok: false; error: "ALREADY_CHARGED" | "ERROR"; message?: string }
> {
  const db = await getDb();
  const finalFee = roundPln(Math.max(0, Number(args.finalFeePln) || 0));
  const prepaid = await getPrepaidMatchCartAmount(args.matchId, args.beneficiaryUserId);
  const prepaidPln = prepaid?.amount_pln ?? 0;
  const source: "cart" | "flag" = prepaidPln > 0 ? "cart" : "flag";
  const note =
    source === "cart"
      ? `Rozliczenie — opłacone z góry (koszyk ${formatMatchFeePln(prepaidPln)})`
      : `Rozliczenie — opłacone z góry (ręczna flaga paid, bez koszyka)`;

  try {
    await db
      .prepare(
        `INSERT INTO match_wallet_charges (match_id, user_id, amount_pln, note, created_by_admin_id)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(args.matchId, args.beneficiaryUserId, finalFee, note, args.adminId);
  } catch (e) {
    const msg = String((e as { message?: string } | undefined)?.message ?? "");
    if (msg.includes("UNIQUE") || msg.includes("constraint") || msg.includes("PRIMARY")) {
      return {
        ok: true,
        credited_pln: 0,
        payer_user_id: null,
        prepaid_pln: prepaidPln,
        source,
        already_settled: true,
      };
    }
    return { ok: false, error: "ERROR", message: msg };
  }

  // Brak koszyka albo składka ≥ wpłaty — bez korekty salda.
  if (!prepaid || prepaidPln <= finalFee) {
    return {
      ok: true,
      credited_pln: 0,
      payer_user_id: prepaid?.payer_user_id ?? null,
      prepaid_pln: prepaidPln,
      source,
    };
  }

  const surplus = roundPln(prepaidPln - finalFee);
  await creditRefundSplitByMatchCharges({
    db,
    payerUserId: prepaid.payer_user_id,
    matchId: args.matchId,
    amountPln: surplus,
    relatedUserId: args.beneficiaryUserId,
    note: `Zwrot nadpłaty koszyka — składka ${formatMatchFeePln(finalFee)} (było ${formatMatchFeePln(prepaidPln)})`,
  });

  return {
    ok: true,
    credited_pln: surplus,
    payer_user_id: prepaid.payer_user_id,
    prepaid_pln: prepaidPln,
    source,
  };
}

/**
 * Zwrot opłaty koszykowej za jednego beneficjenta (np. wypisanie / odwołanie meczu).
 * Kredytuje płatnika koszyka. Jeśli mecz był już rozliczony (match_wallet_charges),
 * zwraca tylko pozostałą składkę (nadpłata mogła wrócić wcześniej przy rozliczeniu).
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

  const prepaidPln = roundPln(Number(row.amount_pln));
  if (!(prepaidPln > 0)) return { ok: true, refunded_pln: 0 };

  // Po rozliczeniu prepaid: w charges jest ostateczna składka (bez debetu) —
  // nadpłata mogła już wrócić; przy anulowaniu zwracamy tylko tę składkę.
  const settled = (await db
    .prepare(
      `SELECT amount_pln FROM match_wallet_charges WHERE match_id = ? AND user_id = ?`
    )
    .get(args.matchId, args.beneficiaryUserId)) as { amount_pln: number } | undefined;
  const amount = settled
    ? roundPln(Math.min(prepaidPln, Math.max(0, Number(settled.amount_pln))))
    : prepaidPln;

  if (amount > 0) {
    await creditRefundSplitByMatchCharges({
      db,
      payerUserId: row.payer_user_id,
      matchId: args.matchId,
      amountPln: amount,
      relatedUserId: args.beneficiaryUserId,
      note: `Zwrot koszyka meczowego — ${args.reason}`,
    });
  }

  await db
    .prepare(`DELETE FROM wallet_match_cart_items WHERE cart_id = ? AND beneficiary_user_id = ?`)
    .run(row.cart_id, args.beneficiaryUserId);

  await db
    .prepare(`UPDATE match_signups SET paid = 0 WHERE match_id = ? AND user_id = ?`)
    .run(args.matchId, args.beneficiaryUserId);

  if (settled) {
    await db
      .prepare(`DELETE FROM match_wallet_charges WHERE match_id = ? AND user_id = ?`)
      .run(args.matchId, args.beneficiaryUserId);
  }

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

/**
 * Przy odwołaniu meczu: zwrot koszyków + cofnięcie obciążeń z rozliczenia (match_wallet_charges).
 * Środki wracają na portfel gracza / płatnika.
 */
export async function refundAllMatchPaymentsOnCancel(args: {
  matchId: number;
  actorUserId: number | null;
  reason: string;
}): Promise<{ refunded_count: number; refunded_pln: number }> {
  const cart = await refundAllMatchCartsForMatch(args);
  const db = await getDb();

  const charges = (await db
    .prepare(
      `SELECT user_id, amount_pln FROM match_wallet_charges WHERE match_id = ?`
    )
    .all(args.matchId)) as { user_id: number; amount_pln: number }[];

  let refunded_count = cart.refunded_count;
  let refunded_pln = cart.refunded_pln;

  for (const c of charges) {
    const amount = roundPln(Number(c.amount_pln));
    if (!(amount > 0)) {
      await db
        .prepare(`DELETE FROM match_wallet_charges WHERE match_id = ? AND user_id = ?`)
        .run(args.matchId, c.user_id);
      continue;
    }

    // Odtwórz podział portfeli z oryginalnych match_charge (admin/operator).
    const parts = (await db
      .prepare(
        `
        SELECT wallet_kind, COALESCE(SUM(amount_pln), 0) AS s
        FROM wallet_transactions
        WHERE user_id = ? AND match_id = ? AND kind = 'match_charge' AND amount_pln < 0
        GROUP BY wallet_kind
      `
      )
      .all(c.user_id, args.matchId)) as { wallet_kind: string; s: number }[];

    if (parts.length > 0) {
      for (const p of parts) {
        const credit = roundPln(Math.abs(Number(p.s)));
        if (!(credit > 0)) continue;
        const walletKind = p.wallet_kind === "operator" ? "operator" : "admin";
        await db
          .prepare(
            `INSERT INTO wallet_transactions (user_id, kind, amount_pln, match_id, wallet_kind, note, is_test)
             VALUES (?, 'adjustment', ?, ?, ?, ?, ?)`
          )
          .run(
            c.user_id,
            credit,
            args.matchId,
            walletKind,
            `Zwrot obciążenia meczu — ${args.reason}`,
            0
          );
      }
    } else {
      await db
        .prepare(
          `INSERT INTO wallet_transactions (user_id, kind, amount_pln, match_id, wallet_kind, note, is_test)
           VALUES (?, 'adjustment', ?, ?, 'admin', ?, ?)`
        )
        .run(
          c.user_id,
          amount,
          args.matchId,
          `Zwrot obciążenia meczu — ${args.reason}`,
          0
        );
    }

    await db
      .prepare(`DELETE FROM match_wallet_charges WHERE match_id = ? AND user_id = ?`)
      .run(args.matchId, c.user_id);

    refunded_count += 1;
    refunded_pln = roundPln(refunded_pln + amount);
  }

  return { refunded_count, refunded_pln };
}
