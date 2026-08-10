/**
 * Low-level client-side helper for HotPay payment initiation.
 * This function is framework-agnostic and can be used both in React hooks
 * and in standalone async flows (e.g. inside dialog submit handlers).
 */

/** Aktualna ścieżka (bez parametrów powrotu HotPay) — do ADRES_WWW po bramce. */
export function currentHotpayReturnPath(fallback = "/platnosci"): string {
  if (typeof window === "undefined") return fallback;
  const u = new URL(window.location.href);
  u.searchParams.delete("payment");
  u.searchParams.delete("session_id");
  const path = `${u.pathname}${u.search}`;
  return path.startsWith("/") ? path : fallback;
}

export async function createHotpayTopup(
  amountPln: number,
  opts?: { returnPath?: string }
): Promise<string> {
  const res = await fetch("/api/wallet/hotpay/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      kind: "topup",
      amount_pln: amountPln,
      return_path: opts?.returnPath ?? currentHotpayReturnPath(),
    }),
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

/** Oznacza lokalnie sesję HotPay jako cancelled (np. po anulowaniu w bramce). */
export async function abandonHotpayPayment(sessionId: string): Promise<void> {
  const id = sessionId.trim();
  if (!id) return;
  try {
    await fetch("/api/wallet/hotpay/abandon", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ session_id: id }),
    });
  } catch {
    /* ignore — webhook SUCCESS i tak może zaksięgować */
  }
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
  returnPath?: string;
}): Promise<MatchCartPayResult> {
  const res = await fetch("/api/wallet/match-cart", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      match_id: args.matchId,
      user_ids: args.userIds,
      allow_hotpay: args.allowHotpay !== false,
      return_path: args.returnPath ?? currentHotpayReturnPath(`/terminarz?mecz=${args.matchId}`),
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
