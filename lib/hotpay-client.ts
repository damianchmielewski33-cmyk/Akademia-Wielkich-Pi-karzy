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
