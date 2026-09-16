"use client";

import { useEffect, useMemo, useState } from "react";
import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/ui/form-field";
import { parseBlikAmountInput, type BlikSettleOutcome } from "@/lib/blik-settle";
import { formatMatchFeePln } from "@/lib/match-fee";

type Player = {
  id: number;
  first_name: string;
  last_name: string;
  zawodnik: string;
};

function playerLabel(p: Player) {
  return [p.first_name, p.last_name].filter(Boolean).join(" ").trim() || p.zawodnik;
}

export function BlikSettleModal({
  open,
  player,
  contributionPln,
  recordedPln,
  busy,
  onOpenChange,
  onSettle,
}: {
  open: boolean;
  player: Player | null;
  contributionPln: number;
  recordedPln: number;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onSettle: (args: { outcome: BlikSettleOutcome; receivedPln?: number }) => void;
}) {
  const [outcome, setOutcome] = useState<BlikSettleOutcome>("received");
  const [amountRaw, setAmountRaw] = useState("");

  useEffect(() => {
    if (!open) return;
    setOutcome("received");
    setAmountRaw(
      recordedPln > 0 && recordedPln !== contributionPln ? String(recordedPln).replace(".", ",") : ""
    );
  }, [open, player?.id, recordedPln, contributionPln]);

  const needsAmount = outcome === "underpaid" || outcome === "overpaid";
  const parsedAmount = useMemo(() => parseBlikAmountInput(amountRaw), [amountRaw]);

  function choose(next: BlikSettleOutcome) {
    setOutcome(next);
  }

  function submit() {
    if (outcome === "not_received") {
      onSettle({ outcome });
      return;
    }
    if (outcome === "received") {
      onSettle({ outcome, receivedPln: contributionPln });
      return;
    }
    if (parsedAmount == null) return;
    onSettle({ outcome, receivedPln: parsedAmount });
  }

  const amountError =
    needsAmount && amountRaw.trim()
      ? parsedAmount == null
        ? "Podaj kwotę, np. 20,00"
        : outcome === "underpaid" && parsedAmount >= contributionPln
          ? "Kwota musi być niższa niż składka"
          : outcome === "overpaid" && parsedAmount <= contributionPln
            ? "Kwota musi być wyższa niż składka"
            : undefined
      : needsAmount && !amountRaw.trim()
        ? "Podaj otrzymaną kwotę"
        : undefined;

  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      title="Rozlicz przelew BLIK"
      description={
        player
          ? `${playerLabel(player)} · składka ${formatMatchFeePln(contributionPln)}`
          : undefined
      }
      footer={
        <>
          <Button type="button" variant="outline" className="rounded-full font-bold" onClick={() => onOpenChange(false)}>
            Anuluj
          </Button>
          <Button
            type="button"
            className="rounded-full font-bold"
            disabled={busy || Boolean(amountError) || (needsAmount && !amountRaw.trim())}
            onClick={submit}
          >
            Zapisz na portfelu
          </Button>
        </>
      }
    >
      <p className="text-sm text-zinc-600 dark:text-zinc-300">
        Kwota, którą naprawdę dostałeś, trafia na główny portfel gracza. Niedopłata zostaje jako zaległość, nadpłata
        jako saldo.
      </p>
      {recordedPln > 0 ? (
        <p className="text-sm font-medium tabular-nums text-zinc-800 dark:text-zinc-100">
          Już zaksięgowano: {formatMatchFeePln(recordedPln)}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-2">
        <Button
          type="button"
          variant={outcome === "not_received" ? "default" : "outline"}
          className="h-auto min-h-11 justify-start rounded-xl px-3 text-left font-semibold"
          onClick={() => choose("not_received")}
        >
          Nie otrzymałem przelewu
        </Button>
        <Button
          type="button"
          variant={outcome === "underpaid" ? "default" : "outline"}
          className="h-auto min-h-11 justify-start rounded-xl px-3 text-left font-semibold"
          onClick={() => choose("underpaid")}
        >
          Otrzymałem za mało
        </Button>
        <Button
          type="button"
          variant={outcome === "received" ? "default" : "outline"}
          className="h-auto min-h-11 justify-start rounded-xl px-3 text-left font-semibold"
          onClick={() => choose("received")}
        >
          Otrzymałem składkę {formatMatchFeePln(contributionPln)}
        </Button>
        <Button
          type="button"
          variant={outcome === "overpaid" ? "default" : "outline"}
          className="h-auto min-h-11 justify-start rounded-xl px-3 text-left font-semibold"
          onClick={() => choose("overpaid")}
        >
          Otrzymałem za dużo
        </Button>
      </div>

      {needsAmount ? (
        <FormInput
          id="blik-received-amount"
          label="Otrzymana kwota"
          inputMode="decimal"
          placeholder="np. 20,00"
          value={amountRaw}
          onChange={(e) => setAmountRaw(e.target.value)}
          error={amountRaw.trim() ? amountError : undefined}
          hint={`Składka to ${formatMatchFeePln(contributionPln)}.`}
        />
      ) : null}
    </AppModal>
  );
}
