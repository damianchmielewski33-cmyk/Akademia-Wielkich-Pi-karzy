/**
 * Low-level client-side helper for HotPay payment initiation.
 * This function is framework-agnostic and can be used both in React hooks
 * and in standalone async flows (e.g. inside dialog submit handlers).
 */
export async function createHotpayTopup(amountPln: number): Promise<string> {
  const res = await fetch("/api/wallet/hotpay/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "topup", amount_pln: amountPln }),
  });
  const data = (await res.json().catch(() => ({}))) as { url?: string; error?: unknown };
  if (!res.ok || !data.url) {
    const msg =
      typeof data.error === "string" && data.error
        ? data.error
        : "Nie udało się rozpocząć płatności";
    throw new Error(msg);
  }
  return data.url;
}

export type MatchCartPayResult =
  | { method: "wallet"; amount_pln: number; paid_user_ids: number[] }
  | { method: "hotpay"; url: string; amount_pln: number };

/**
 * Opłata wpisowego za wybranych graczy: najpierw portfel, przy braku środków — URL do HotPay.
 */
export async function payMatchCart(args: {
  matchId: number;
  userIds: number[];
  allowHotpay?: boolean;
}): Promise<MatchCartPayResult> {
  const res = await fetch("/api/wallet/match-cart", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      match_id: args.matchId,
      user_ids: args.userIds,
      allow_hotpay: args.allowHotpay !== false,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    error?: unknown;
    method?: string;
    url?: string;
    amount_pln?: number;
    paid_user_ids?: number[];
  };
  if (!res.ok) {
    const msg =
      typeof data.error === "string" && data.error
        ? data.error
        : "Nie udało się rozpocząć opłaty za mecz";
    throw new Error(msg);
  }
  if (data.method === "hotpay" && data.url) {
    return {
      method: "hotpay",
      url: data.url,
      amount_pln: Number(data.amount_pln ?? 0),
    };
  }
  return {
    method: "wallet",
    amount_pln: Number(data.amount_pln ?? 0),
    paid_user_ids: Array.isArray(data.paid_user_ids) ? data.paid_user_ids : args.userIds,
  };
}
