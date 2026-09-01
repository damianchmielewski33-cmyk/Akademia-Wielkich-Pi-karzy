"use client";

import { useState } from "react";
import { Banknote, Loader2 } from "lucide-react";
import { toast } from "@/lib/app-toast";
import { PayMatchButton } from "@/components/pay-match-button";
import { PlayerAvatar, PlayerNameStack } from "@/components/player-avatar";
import { Button } from "@/components/ui/button";
import type { PublicWalletPlayerRow } from "@/lib/public-payment-share";
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
  light,
}: {
  token: string;
  rows: PublicWalletPlayerRow[];
  contributionPln: number;
  blikPhone: string;
  hotpayEnabled: boolean;
  light: boolean;
}) {
  const [paidIds, setPaidIds] = useState<Set<number>>(
    () => new Set(rows.filter((r) => Number(r.match_paid) === 1).map((r) => r.id))
  );
  const [hotpayBusyId, setHotpayBusyId] = useState<number | null>(null);

  async function markBlikPaid(userId: number) {
    const res = await fetch(`/api/platnosci-public/${encodeURIComponent(token)}/blik-paid`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      toast.error(typeof data.error === "string" ? data.error : "Nie udało się oznaczyć opłaty");
      return;
    }
    setPaidIds((prev) => new Set(prev).add(userId));
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
        const paid = paidIds.has(p.id);
        return (
          <li
            key={p.id}
            className={cn(
              "overflow-hidden rounded-2xl border px-3 py-3",
              light
                ? paid
                  ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30"
                  : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
                : paid
                  ? "border-emerald-400/40 bg-emerald-950/25"
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
            ) : (
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <PayMatchButton
                  compact
                  className="flex-1"
                  blikPhoneDisplay={blikPhone}
                  defaultMatchFeePln={contributionPln}
                  amountPln={contributionPln}
                  balancePln={null}
                  playerLabel={playerLabel(p)}
                  onAfterPay={() => markBlikPaid(p.id)}
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
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
