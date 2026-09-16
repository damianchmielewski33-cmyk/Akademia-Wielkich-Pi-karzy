"use client";

import { useState } from "react";
import { Banknote, Check, Loader2 } from "lucide-react";
import { toast } from "@/lib/app-toast";
import { PayMatchButton } from "@/components/pay-match-button";
import { PlayerAvatar, PlayerNameStack } from "@/components/player-avatar";
import { Button } from "@/components/ui/button";
import type { PublicWalletPlayerRow } from "@/lib/public-payment-share";
import { signupFeePaymentStatus } from "@/lib/signup-fee-status";
import { formatMatchFeePln } from "@/lib/match-fee";
import { cn } from "@/lib/utils";

function playerLabel(p: PublicWalletPlayerRow) {
  return [p.first_name, p.last_name].filter(Boolean).join(" ").trim() || p.zawodnik;
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
  const [hotpayBusyId, setHotpayBusyId] = useState<number | null>(null);
  const [confirmBusyId, setConfirmBusyId] = useState<number | null>(null);

  async function declareBlik(userId: number) {
    const res = await fetch(`/api/platnosci-public/${encodeURIComponent(token)}/blik-paid`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string; pending?: boolean };
    if (!res.ok) {
      toast.error(typeof data.error === "string" ? data.error : "Nie udało się zgłosić przelewu");
      return;
    }
    setPendingIds((prev) => new Set(prev).add(userId));
    toast.success("Zgłoszono przelew", {
      description: "Status zmieni się na opłacony, gdy admin potwierdzi, że pieniądze doszły.",
      duration: 7000,
    });
  }

  async function confirmBlik(userId: number) {
    if (confirmBusyId != null) return;
    setConfirmBusyId(userId);
    try {
      const res = await fetch(`/api/platnosci-public/${encodeURIComponent(token)}/blik-confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Nie udało się potwierdzić przelewu");
        return;
      }
      setPaidIds((prev) => new Set(prev).add(userId));
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
      toast.success("Przelew potwierdzony — oznaczono jako opłacone");
    } finally {
      setConfirmBusyId(null);
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
      toast.info("Przekierowanie do operatora… Status zmieni się na opłacony po potwierdzeniu wpłaty.");
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
    <ul className="space-y-3">
      {rows.map((p) => {
        const status = signupFeePaymentStatus({
          match_paid: paidIds.has(p.id) ? 1 : 0,
          blik_declared: pendingIds.has(p.id) ? 1 : 0,
        });
        const paid = status === "paid";
        const pending = status === "pending_blik";
        return (
          <li
            key={p.id}
            className={cn(
              "overflow-hidden rounded-2xl border px-3 py-3",
              light
                ? paid
                  ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30"
                  : pending
                    ? "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30"
                    : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
                : paid
                  ? "border-emerald-400/40 bg-emerald-950/25"
                  : pending
                    ? "border-amber-400/40 bg-amber-950/25"
                    : "border-white/15 bg-black/20"
            )}
          >
            <div className="flex min-w-0 items-center gap-3">
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
            {paid ? (
              <p className="mt-2 pl-11 text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                Opłacone
              </p>
            ) : pending ? (
              <div className="mt-3 space-y-2">
                <p className="pl-11 text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">
                  Czeka na potwierdzenie przelewu
                </p>
                <p className="pl-11 text-xs text-zinc-600 dark:text-zinc-400">
                  Zawodnik zgłosił przelew BLIK na telefon. Opłacone pojawi się po potwierdzeniu admina.
                </p>
                {isAdmin ? (
                  <Button
                    type="button"
                    className="h-auto min-h-12 w-full rounded-full font-bold sm:w-auto"
                    disabled={confirmBusyId != null}
                    onClick={() => void confirmBlik(p.id)}
                  >
                    {confirmBusyId === p.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      <Check className="h-4 w-4" aria-hidden />
                    )}
                    Potwierdź przelew
                  </Button>
                ) : null}
              </div>
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
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      <Banknote className="h-4 w-4" aria-hidden />
                    )}
                    Zapłać przez stronę
                  </Button>
                ) : null}
                {isAdmin ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-auto min-h-12 rounded-full font-bold"
                    disabled={confirmBusyId != null}
                    onClick={() => void confirmBlik(p.id)}
                  >
                    {confirmBusyId === p.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      <Check className="h-4 w-4" aria-hidden />
                    )}
                    Potwierdź przelew
                  </Button>
                ) : null}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
