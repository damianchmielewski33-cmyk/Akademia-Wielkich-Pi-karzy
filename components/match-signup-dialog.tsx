"use client";

import { useState } from "react";
import { toast } from "@/lib/app-toast";
import { Loader2, Wallet } from "lucide-react";
import { currentHotpayReturnPath, payMatchCart } from "@/lib/hotpay-client";
import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";
import { mpInnerPanelClass } from "@/components/marketplace-section";
import { PayButton } from "@/components/pay-button";
import { formatMatchFeePln, MATCH_PREPAYMENT_PLN } from "@/lib/match-fee";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  matchId: number;
  /** signup = nowy pełny zapis; confirm = upgrade ze statusu «jeszcze nie wiem» */
  intent: "signup" | "confirm";
  onCompleted: () => void;
  hotpayEnabled?: boolean;
};

export function MatchSignupDialog({
  open,
  onOpenChange,
  matchId,
  intent,
  onCompleted,
  hotpayEnabled = false,
}: Props) {
  const [busy, setBusy] = useState(false);

  async function submit(pay: boolean) {
    setBusy(true);
    try {
      const url =
        intent === "confirm"
          ? `/api/terminarz/signup/${matchId}/confirm`
          : `/api/terminarz/signup/${matchId}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Nie udało się zapisać");
        return;
      }

      if (!pay || !hotpayEnabled) {
        toast.successCrowd(intent === "confirm" ? "Potwierdzono zapis" : "Zapisano na mecz");
        onOpenChange(false);
        onCompleted();
        return;
      }

      try {
        const meRes = await fetch("/api/wallet/me");
        const me = (await meRes.json().catch(() => ({}))) as { user_id?: number };
        const myId = Number(me.user_id);
        if (!Number.isFinite(myId) || myId <= 0) {
          toast.successCrowd("Zapisano na mecz. Opłatę uregulujesz w zakładce Płatności.");
          onOpenChange(false);
          onCompleted();
          return;
        }

        const result = await payMatchCart({
          matchId,
          userIds: [myId],
          allowHotpay: true,
          returnPath: currentHotpayReturnPath(`/terminarz?mecz=${matchId}`),
        });

        if (result.method === "hotpay") {
          toast.info("Trwa przekierowanie do płatności…");
          onOpenChange(false);
          onCompleted();
          window.location.assign(result.url);
          return;
        }

        toast.successCrowd(
          intent === "confirm"
            ? `Potwierdzono i opłacono · ${formatMatchFeePln(result.amount_pln)}`
            : `Zapisano i opłacono · ${formatMatchFeePln(result.amount_pln)}`,
          { sound: "cheer" }
        );
        onOpenChange(false);
        onCompleted();
      } catch {
        toast.successCrowd("Zapisano na mecz. Opłatę możesz uregulować z portfela w zakładce Płatności.");
        onOpenChange(false);
        onCompleted();
      }
    } finally {
      setBusy(false);
    }
  }

  if (hotpayEnabled) {
    return (
      <AppModal
        open={open}
        onOpenChange={onOpenChange}
        size="sm"
        title={intent === "confirm" ? "Potwierdź udział w meczu" : "Zapisz się na mecz"}
        description={
          intent === "confirm"
            ? "Potwierdzasz udział — czy chcesz od razu opłacić zaliczkę na wpisowe (koszyk)?"
            : "Zajmujesz miejsce w składzie — czy chcesz od razu opłacić zaliczkę na wpisowe (koszyk)?"
        }
      >
        <div className={mpInnerPanelClass}>
          <div className="flex items-start gap-3">
            <Wallet className="mt-0.5 h-5 w-5 shrink-0 text-[var(--mp-teal-dark)] dark:text-teal-300" aria-hidden />
            <div>
              <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-100">
                Zaliczka na wpisowe:{" "}
                <span className="tabular-nums">{MATCH_PREPAYMENT_PLN},00 zł</span>
              </p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                Jeśli ostateczna składka okaże się niższa niż {MATCH_PREPAYMENT_PLN} zł, różnica zostanie
                automatycznie dopisana do Twojego portfela.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" disabled={busy} onClick={() => void submit(false)}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
            Zapisz bez opłaty
          </Button>
          <PayButton
            variant="default"
            amountPln={MATCH_PREPAYMENT_PLN}
            label="Zapisz i zapłać"
            busy={busy}
            onClick={() => void submit(true)}
          />
        </div>
      </AppModal>
    );
  }

  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      title={intent === "confirm" ? "Potwierdź udział w meczu" : "Zapisz się na mecz"}
      description={
        intent === "confirm"
          ? "Potwierdzasz udział w składzie na ten termin."
          : "Zajmujesz miejsce w składzie na ten mecz."
      }
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Anuluj
          </Button>
          <Button type="button" variant="default" className="rounded-full font-bold" onClick={() => void submit(false)} disabled={busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
            {intent === "confirm" ? "Potwierdź zapis" : "Zapisz się"}
          </Button>
        </>
      }
    />
  );
}
