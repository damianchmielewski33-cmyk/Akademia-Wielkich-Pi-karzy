"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "@/lib/app-toast";
import { AdminCard, adminEmptyStateClass, adminFieldClass, adminInnerPanelClass } from "@/components/admin-ui";
import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type HotpayDiagRow = {
  id?: number;
  session_id: string;
  user_id?: number;
  kind?: string;
  amount_pln?: number;
  gross_amount_pln?: number | null;
  status?: string;
  hotpay_payment_id?: string | null;
  error_message?: string | null;
  created_at?: string;
  completed_at?: string | null;
  deposit_request_id?: number | null;
  cart_id?: number | null;
  first_name?: string;
  last_name?: string;
  zawodnik?: string;
  diagnosis?: string;
};

type WebhookIpBlocks = {
  count: number;
  latest_at: string | null;
};

type ConfirmAction = {
  sessionId: string;
  action: "credit" | "retry_cart";
  row: HotpayDiagRow;
};

const STATUS_FILTERS = [
  { id: "pending", label: "Pending" },
  { id: "success", label: "Success" },
  { id: "failure", label: "Failure" },
  { id: "cancelled", label: "Anulowane" },
] as const;

function playerLabel(r: HotpayDiagRow) {
  const name = [r.first_name, r.last_name].filter(Boolean).join(" ").trim();
  return name || r.zawodnik || (r.user_id != null ? `#${r.user_id}` : "—");
}

/** Zgodne z `canManualCreditHotpayPayment` po stronie API. */
function canCredit(r: HotpayDiagRow) {
  return (
    r.deposit_request_id == null &&
    (r.status === "pending" ||
      r.status === "cancelled" ||
      r.status === "failure" ||
      r.status === "success")
  );
}

function canRetryCart(r: HotpayDiagRow) {
  return (r.error_message ?? "").startsWith("CART_SETTLE_FAILED") || (r.diagnosis ?? "").includes("retry_cart");
}

function formatAmountLine(r: HotpayDiagRow) {
  const net = typeof r.amount_pln === "number" ? `${r.amount_pln.toFixed(2)} PLN netto` : null;
  const gross =
    typeof r.gross_amount_pln === "number" &&
    (typeof r.amount_pln !== "number" || Math.abs(r.gross_amount_pln - r.amount_pln) > 0.0001)
      ? `${r.gross_amount_pln.toFixed(2)} PLN brutto`
      : null;
  if (net && gross) return `${net} · ${gross}`;
  if (net) return net;
  if (gross) return gross;
  return "—";
}

/**
 * Panel admina: diagnoza i ręczne domknięcie płatności HotPay (gdy webhook nie dojdzie).
 */
export function AdminHotpayConfirmPanel() {
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]["id"]>("pending");
  const [sessionQuery, setSessionQuery] = useState("");
  const [rows, setRows] = useState<HotpayDiagRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busySession, setBusySession] = useState<string | null>(null);
  const [webhookIpBlocks, setWebhookIpBlocks] = useState<WebhookIpBlocks | null>(null);
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null);

  const load = useCallback(
    async (opts?: { quiet?: boolean }) => {
      if (!opts?.quiet) setLoading(true);
      try {
        const q = sessionQuery.trim();
        const url = q
          ? `/api/admin/wallet/hotpay/confirm?session_id=${encodeURIComponent(q)}`
          : `/api/admin/wallet/hotpay/confirm?status=${encodeURIComponent(status)}&limit=40`;
        const res = await fetch(url, { credentials: "same-origin" });
        const data = (await res.json().catch(() => null)) as {
          error?: string;
          payment?: HotpayDiagRow;
          diagnosis?: string;
          payments?: HotpayDiagRow[];
          webhook_ip_blocks?: WebhookIpBlocks;
        } | null;
        if (!res.ok) {
          if (!opts?.quiet) toast.error(typeof data?.error === "string" ? data.error : "Nie udało się wczytać");
          return;
        }
        if (data?.webhook_ip_blocks) setWebhookIpBlocks(data.webhook_ip_blocks);
        if (q && data?.payment) {
          setRows([{ ...data.payment, diagnosis: data.diagnosis ?? data.payment.diagnosis }]);
        } else {
          setRows(Array.isArray(data?.payments) ? data.payments : []);
        }
      } catch {
        if (!opts?.quiet) toast.error("Błąd sieci");
      } finally {
        if (!opts?.quiet) setLoading(false);
      }
    },
    [sessionQuery, status]
  );

  useEffect(() => {
    void load();
    const onVisible = () => {
      if (document.visibilityState === "visible") void load({ quiet: true });
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void load({ quiet: true });
    }, 30_000);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      window.clearInterval(id);
    };
  }, [load]);

  async function postAction(sessionId: string, action: "credit" | "retry_cart") {
    setBusySession(sessionId);
    const toastId = toast.loading(action === "credit" ? "Księgowanie…" : "Ponawianie koszyka…");
    try {
      const res = await fetch("/api/admin/wallet/hotpay/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ session_id: sessionId, action }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        ok?: boolean;
        diagnosis?: string | null;
      } | null;
      if (!res.ok) {
        toast.error(typeof data?.error === "string" ? data.error : "Operacja nie powiodła się", { id: toastId });
        return;
      }
      toast.success(action === "credit" ? "Zaksięgowano / domknięto" : "Koszyk zaaplikowany", { id: toastId });
      setConfirm(null);
      await load({ quiet: true });
    } catch {
      toast.error("Błąd sieci", { id: toastId });
    } finally {
      setBusySession(null);
    }
  }

  const confirmBusy = confirm ? busySession === confirm.sessionId : false;

  return (
    <AdminCard
      title="Diagnoza HotPay"
      description="Gdy webhook nie dojdzie: zaksięguj ręcznie albo ponów settle koszyka. Wymaga uprawnienia Finanse. Lista odświeża się automatycznie."
    >
      {webhookIpBlocks && webhookIpBlocks.count > 0 ? (
        <div className="mb-4 rounded-lg border border-amber-400/40 bg-amber-500/15 px-3 py-2 text-sm text-amber-50">
          <p className="font-semibold">Webhook HotPay: odrzucone IP ({webhookIpBlocks.count} w 24 h)</p>
          <p className="mt-1 text-xs leading-relaxed text-amber-100/90">
            Powiadomienia z niedozwolonego adresu wracają 403 — płatność u operatora może być OK, a lokalnie
            zostać jako pending/anulowana. Sprawdź{" "}
            <code className="rounded bg-black/20 px-1">HOTPAY_NOTIFICATION_IPS</code> / proxy albo użyj
            „Zaksięguj” po weryfikacji w panelu HotPay.
            {webhookIpBlocks.latest_at ? ` Ostatni: ${webhookIpBlocks.latest_at}.` : ""}
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition",
              status === f.id && !sessionQuery.trim()
                ? "bg-white/20 text-white ring-1 ring-white/40"
                : "bg-white/5 text-emerald-100/80 hover:bg-white/10"
            )}
            onClick={() => {
              setSessionQuery("");
              setStatus(f.id);
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="hotpay-session-q">Szukaj session_id</Label>
          <Input
            id="hotpay-session-q"
            className={adminFieldClass}
            placeholder="hp_…"
            value={sessionQuery}
            onChange={(e) => setSessionQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void load();
            }}
          />
        </div>
        <Button type="button" variant="gold" disabled={loading} onClick={() => void load()}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
          Szukaj
        </Button>
      </div>

      {loading && rows.length === 0 ? (
        <p className={cn(adminEmptyStateClass, "mt-4")}>Ładowanie…</p>
      ) : rows.length === 0 ? (
        <p className={cn(adminEmptyStateClass, "mt-4")}>Brak płatności dla tego filtra.</p>
      ) : (
        <ul className="mt-4 max-h-[28rem] space-y-2 overflow-y-auto">
          {rows.map((r) => {
            const busy = busySession === r.session_id;
            return (
              <li key={r.session_id} className={cn(adminInnerPanelClass, "space-y-2 p-3 text-sm")}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-white">{playerLabel(r)}</p>
                    <p className="mt-0.5 break-all font-mono text-[11px] text-emerald-100/70">{r.session_id}</p>
                    <p className="mt-1 text-xs text-emerald-100/85">
                      {r.kind ?? "—"} · {formatAmountLine(r)} · {r.status ?? "—"}
                      {r.created_at ? ` · ${r.created_at}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {canCredit(r) ? (
                      <Button
                        type="button"
                        variant="gold"
                        size="sm"
                        disabled={busy}
                        onClick={() => setConfirm({ sessionId: r.session_id, action: "credit", row: r })}
                      >
                        Zaksięguj
                      </Button>
                    ) : null}
                    {canRetryCart(r) ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        onClick={() => setConfirm({ sessionId: r.session_id, action: "retry_cart", row: r })}
                      >
                        Ponów koszyk
                      </Button>
                    ) : null}
                  </div>
                </div>
                {r.diagnosis ? (
                  <p
                    className={cn(
                      "rounded-md px-2 py-1.5 text-xs",
                      r.diagnosis.startsWith("OK")
                        ? "bg-emerald-500/15 text-emerald-100"
                        : r.diagnosis.startsWith("BŁĄD") ||
                            r.diagnosis.startsWith("PENDING") ||
                            r.diagnosis.includes('action:"credit"')
                          ? "bg-amber-500/20 text-amber-100"
                          : "bg-white/10 text-emerald-100/90"
                    )}
                  >
                    {r.diagnosis}
                  </p>
                ) : null}
                {r.error_message ? (
                  <p className="text-[11px] text-red-200/90">{r.error_message}</p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <AppModal
        open={confirm != null}
        onOpenChange={(open) => {
          if (!open && !confirmBusy) setConfirm(null);
        }}
        title={confirm?.action === "retry_cart" ? "Ponów settle koszyka?" : "Zaksięguj płatność HotPay?"}
        description={
          confirm
            ? confirm.action === "retry_cart"
              ? `Sesja ${confirm.sessionId}: wpłata jest OK, ponowisz aplikację koszyka meczowego.`
              : confirm.row.status === "failure" || confirm.row.status === "cancelled"
                ? `Sesja ${confirm.sessionId} ma status „${confirm.row.status}”. Księguj tylko po potwierdzeniu SUCCESS w panelu HotPay — to dopisze środki na portfel.`
                : `Sesja ${confirm.sessionId}: awaryjne księgowanie ${formatAmountLine(confirm.row)} na portfel gracza.`
            : undefined
        }
        preventDismiss={confirmBusy}
        size="sm"
      >
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={confirmBusy}
            onClick={() => setConfirm(null)}
          >
            Anuluj
          </Button>
          <Button
            type="button"
            variant="gold"
            disabled={!confirm || confirmBusy}
            onClick={() => {
              if (!confirm) return;
              void postAction(confirm.sessionId, confirm.action);
            }}
          >
            {confirmBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
            {confirm?.action === "retry_cart" ? "Ponów koszyk" : "Zaksięguj"}
          </Button>
        </div>
      </AppModal>
    </AdminCard>
  );
}
