"use client";

import { useEffect, useState } from "react";
import { Banknote, Wallet } from "lucide-react";
import { toast } from "@/lib/app-toast";
import { BlikSettleModal } from "@/components/blik-settle-modal";
import { PayMatchButton } from "@/components/pay-match-button";
import { PlayerAvatar, PlayerNameStack } from "@/components/player-avatar";
import { LoadingIndicator } from "@/components/preloaders";
import { Button } from "@/components/ui/button";
import type { BlikSettleOutcome } from "@/lib/blik-settle";
import type { PublicWalletPlayerRow } from "@/lib/public-payment-share";
import { signupFeePaymentStatus } from "@/lib/signup-fee-status";
import { formatMatchFeePln } from "@/lib/match-fee";
import { cn } from "@/lib/utils";

function playerLabel(p: PublicWalletPlayerRow) {
  return [p.first_name, p.last_name].filter(Boolean).join(" ").trim() || p.zawodnik;
}

function formatDelta(n: number) {
  const abs = formatMatchFeePln(Math.abs(n));
  if (n > 0) return `+${abs}`;
  if (n < 0) return `−${abs}`;
  return abs;
}

export function MatchSignupFeesList({
  token,
  rows,
  contributionPln,
  blikPhone,
  hotpayEnabled,
  isAdmin,
  light,
}: {
  token: string;
  rows: PublicWalletPlayerRow[];
  contributionPln: number;
  blikPhone: string;
  hotpayEnabled: boolean;
  isAdmin: boolean;
  light: boolean;
}) {
  const [adminViewer, setAdminViewer] = useState(isAdmin);
  const [paidIds, setPaidIds] = useState<Set<number>>(
    () => new Set(rows.filter((r) => Number(r.match_paid) === 1).map((r) => r.id))
  );
  const [pendingIds, setPendingIds] = useState<Set<number>>(
    () =>
      new Set(
        rows
          .filter((r) => Number(r.match_paid) !== 1 && Number(r.blik_declared) === 1)
          .map((r) => r.id)
      )
  );
  const [receivedById, setReceivedById] = useState<Record<number, number>>(() => {
    const next: Record<number, number> = {};
    for (const r of rows) {
      const received = Number(r.blik_received_pln ?? 0);
      if (received > 0) next[r.id] = received;
    }
    return next;
  });
  const [hotpayBusyId, setHotpayBusyId] = useState<number | null>(null);
  const [settleBusy, setSettleBusy] = useState(false);
  const [settlePlayer, setSettlePlayer] = useState<PublicWalletPlayerRow | null>(null);

  useEffect(() => {
    setAdminViewer(isAdmin);
  }, [isAdmin]);

  useEffect(() => {
    const paid = new Set(rows.filter((r) => Number(r.match_paid) === 1).map((r) => r.id));
    setPaidIds(paid);
    setPendingIds((prev) => {
      const next = new Set(
        rows.filter((r) => Number(r.match_paid) !== 1 && Number(r.blik_declared) === 1).map((r) => r.id)
      );
      for (const id of prev) {
        if (!paid.has(id)) next.add(id);
      }
      return next;
    });
    setReceivedById(() => {
      const next: Record<number, number> = {};
      for (const r of rows) {
        const received = Number(r.blik_received_pln ?? 0);
        if (received > 0) next[r.id] = received;
      }
      return next;
    });
  }, [rows]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "same-origin" });
        const data = (await res.json().catch(() => ({}))) as { user?: { is_admin?: number } | null };
        if (!cancelled && Number(data.user?.is_admin) === 1) {
          setAdminViewer(true);
        }
      } catch {
        /* zostaw isAdmin z SSR */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function declareBlik(userId: number) {
    const res = await fetch(`/api/platnosci-public/${encodeURIComponent(token)}/blik-paid`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string; pending?: boolean; already?: boolean };
    if (!res.ok) {
      toast.error(typeof data.error === "string" ? data.error : "Nie udało się zgłosić przelewu");
      return;
    }
    setPendingIds((prev) => new Set(prev).add(userId));
    toast.success(
      data.already
        ? "To zgłoszenie już czeka na potwierdzenie admina"
        : "Zgłoszono przelew do potwierdzenia admina"
    );
  }

  async function settleBlik(args: { outcome: BlikSettleOutcome; receivedPln?: number }) {
    const player = settlePlayer;
    if (!player || settleBusy) return;
    setSettleBusy(true);
    try {
      const res = await fetch(`/api/platnosci-public/${encodeURIComponent(token)}/blik-confirm`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: player.id,
          outcome: args.outcome,
          received_pln: args.receivedPln,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        paid?: boolean;
        received_pln?: number;
        wallet_delta_pln?: number;
        wallet_balance_pln?: number;
      };
      if (!res.ok) {
        toast.error(
          typeof data.error === "string"
            ? data.error
            : "Nie udało się rozliczyć przelewu. Zaloguj się jako admin i odśwież stronę."
        );
        return;
      }
      const received = Number(data.received_pln ?? 0);
      const paid = Boolean(data.paid);
      setReceivedById((prev) => ({ ...prev, [player.id]: received }));
      setPaidIds((prev) => {
        const next = new Set(prev);
        if (paid) next.add(player.id);
        else next.delete(player.id);
        return next;
      });
      setPendingIds((prev) => {
        const next = new Set(prev);
        if (paid || received > 0) next.delete(player.id);
        else if (args.outcome === "not_received") next.delete(player.id);
        return next;
      });
      const delta = Number(data.wallet_delta_pln ?? 0);
      const balance = data.wallet_balance_pln;
      toast.success(
        paid
          ? "Przelew zaksięgowany — opłacone"
          : received > 0
            ? "Zaksięgowano niedopłatę na portfelu"
            : "Oznaczono brak przelewu",
        {
          description:
            balance != null
              ? `Portfel: ${formatDelta(delta)} · saldo ${formatMatchFeePln(balance)}`
              : undefined,
        }
      );
      setSettlePlayer(null);
    } finally {
      setSettleBusy(false);
    }
  }

  async function payHotpay(userId: number) {
    if (hotpayBusyId != null) return;
    setHotpayBusyId(userId);
    try {
      const res = await fetch(`/api/platnosci-public/${encodeURIComponent(token)}/hotpay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        toast.error(typeof data.error === "string" ? data.error : "Nie udało się rozpocząć płatności");
        return;
      }
      toast.info("Przekierowanie do płatności online… Status zmieni się na opłacony po potwierdzeniu wpłaty.");
      window.setTimeout(() => window.location.assign(data.url!), 400);
    } finally {
      setHotpayBusyId(null);
    }
  }

  if (rows.length === 0) {
    return (
      <p className={light ? "text-sm text-zinc-600" : "text-sm text-white/80"}>
        Nikt jeszcze nie jest zapisany na ten mecz.
      </p>
    );
  }

  return (
    <>
      <ul className="space-y-3">
        {rows.map((p) => {
          const received = receivedById[p.id] ?? 0;
          const status = signupFeePaymentStatus({
            match_paid: paidIds.has(p.id) ? 1 : 0,
            blik_declared: pendingIds.has(p.id) ? 1 : 0,
            blik_received_pln: received,
          });
          const paid = status === "paid";
          const pending = status === "pending_blik";
          const underpaid = status === "underpaid";
          return (
            <li
              key={p.id}
              className={cn(
                "overflow-hidden rounded-2xl border px-3 py-3",
                light
                  ? paid
                    ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30"
                    : underpaid
                      ? "border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/30"
                      : pending
                        ? "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30"
                        : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
                  : paid
                    ? "border-emerald-400/40 bg-emerald-950/25"
                    : underpaid
                      ? "border-orange-400/40 bg-orange-950/25"
                      : pending
                        ? "border-amber-400/40 bg-amber-950/25"
                        : "border-white/15 bg-black/20"
              )}
            >
              <div className="flex min-w-0 flex-wrap items-center gap-2 sm:flex-nowrap sm:gap-3">
                <PlayerAvatar
                  photoPath={p.profile_photo_path}
                  firstName={p.first_name}
                  lastName={p.last_name}
                  size="sm"
                  className="shrink-0"
                />
                <PlayerNameStack
                  firstName={p.first_name}
                  lastName={p.last_name}
                  nick={p.zawodnik}
                  className="min-w-0 flex-1 overflow-hidden"
                  primaryClassName={cn("truncate", light ? "text-zinc-950 dark:text-white" : "text-white")}
                  secondaryClassName={cn("truncate", light ? "text-zinc-500" : "text-white/70")}
                />
                <span className="shrink-0 text-sm font-bold tabular-nums">
                  {formatMatchFeePln(contributionPln)}
                </span>
              </div>
              {adminViewer ? (
                <div className="mt-2">
                  <Button
                    type="button"
                    className="h-auto min-h-10 w-full shrink-0 rounded-full px-3 text-xs font-bold sm:min-h-11 sm:w-auto sm:text-sm"
                    disabled={settleBusy}
                    onClick={() => setSettlePlayer(p)}
                  >
                    <Wallet className="h-4 w-4" aria-hidden />
                    Rozlicz przelew
                  </Button>
                </div>
              ) : null}
              {paid ? (
                <p className="mt-2 pl-11 text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                  Opłacone
                  {received > contributionPln
                    ? ` · nadpłata ${formatMatchFeePln(received)}`
                    : received > 0
                      ? ` · ${formatMatchFeePln(received)}`
                      : ""}
                </p>
              ) : underpaid ? (
                <p className="mt-2 pl-11 text-xs font-semibold uppercase tracking-wide text-orange-800 dark:text-orange-200">
                  Niedopłata {formatMatchFeePln(received)} / {formatMatchFeePln(contributionPln)} — reszta na portfelu
                </p>
              ) : pending ? (
                <p className="mt-2 pl-11 text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">
                  Czeka na potwierdzenie przelewu
                </p>
              ) : (
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <PayMatchButton
                    compact
                    className="flex-1"
                    blikPhoneDisplay={blikPhone}
                    defaultMatchFeePln={contributionPln}
                    amountPln={contributionPln}
                    balancePln={null}
                    playerLabel={playerLabel(p)}
                    onAfterPay={() => declareBlik(p.id)}
                  />
                  {hotpayEnabled ? (
                    <Button
                      type="button"
                      className="h-auto min-h-12 flex-1 rounded-full font-bold"
                      disabled={hotpayBusyId != null}
                      onClick={() => void payHotpay(p.id)}
                    >
                      {hotpayBusyId === p.id ? (
                        <LoadingIndicator variant="button" size="sm" />
                      ) : (
                        <Banknote className="h-4 w-4" aria-hidden />
                      )}
                      Zapłać online
                    </Button>
                  ) : null}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <BlikSettleModal
        open={settlePlayer != null}
        player={settlePlayer}
        contributionPln={contributionPln}
        recordedPln={settlePlayer ? receivedById[settlePlayer.id] ?? 0 : 0}
        busy={settleBusy}
        onOpenChange={(open) => {
          if (!open) setSettlePlayer(null);
        }}
        onSettle={(args) => void settleBlik(args)}
      />
    </>
  );
}
