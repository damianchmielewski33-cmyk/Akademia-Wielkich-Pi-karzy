"use client";

import { useEffect, useState } from "react";
import { toast } from "@/lib/app-toast";
import { Car, Loader2, TrainFront, Wallet } from "lucide-react";
import { createHotpayTopup } from "@/lib/hotpay-client";
import type { SignupTransportRow } from "@/lib/transport";
import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PayButton } from "@/components/pay-button";

/** Kwota zaliczki pobierana z góry przy płatnościach operatorem. */
const PREPAYMENT_PLN = 25;

type Mode = "car" | "public" | null;

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  matchId: number;
  /** signup = nowy pełny zapis; confirm = upgrade ze statusu «jeszcze nie wiem»; edit = zmiana transportu */
  intent: "signup" | "edit" | "confirm";
  initial?: SignupTransportRow | null;
  onCompleted: () => void;
  hotpayEnabled?: boolean;
};

export function MatchTransportSignupDialog({
  open,
  onOpenChange,
  matchId,
  intent,
  initial,
  onCompleted,
  hotpayEnabled = false,
}: Props) {
  const [mode, setMode] = useState<Mode>(null);
  const [canTakePassengers, setCanTakePassengers] = useState<boolean | null>(null);
  const [needsTransport, setNeedsTransport] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initial && (intent === "edit" || intent === "confirm")) {
      if (initial.drives_car === 1) {
        setMode("car");
        setCanTakePassengers(initial.can_take_passengers === 1);
        setNeedsTransport(null);
      } else {
        setMode("public");
        setNeedsTransport(initial.needs_transport === 1);
        setCanTakePassengers(null);
      }
      return;
    }
    setMode(null);
    setCanTakePassengers(null);
    setNeedsTransport(null);
  }, [open, initial, intent]);

  /** Zapisuje (bez danych transportu) i opcjonalnie inicjuje płatność HotPay. */
  async function signupNoTransport(pay: boolean) {
    setBusy(true);
    try {
      const url =
        intent === "confirm"
          ? `/api/terminarz/signup/${matchId}/confirm`
          : `/api/terminarz/signup/${matchId}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ drivesCar: false, needsTransport: false }),
      });
      const data = await res.json().catch(() => ({})) as { error?: string };
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Nie udało się zapisać");
        return;
      }

      if (!pay) {
        toast.success(intent === "confirm" ? "Potwierdzono zapis" : "Zapisano na mecz");
        onOpenChange(false);
        onCompleted();
        return;
      }

      try {
        const hotpayUrl = await createHotpayTopup(PREPAYMENT_PLN);
        onOpenChange(false);
        onCompleted();
        window.location.assign(hotpayUrl);
      } catch {
        toast.success("Zapisano na mecz. Opłatę możesz uregulować z portfela w zakładce Płatności.");
        onOpenChange(false);
        onCompleted();
      }
    } finally {
      setBusy(false);
    }
  }

  /** Tradycyjny zapis z pytaniami o transport. */
  async function submitWithTransport() {
    if (!mode) {
      toast.error("Wybierz, jak dotrzesz na mecz.");
      return;
    }
    if (mode === "car" && canTakePassengers === null) {
      toast.error("Odpowiedz, czy możesz zabrać pasażerów (TAK / NIE).");
      return;
    }
    if (mode === "public" && needsTransport === null) {
      toast.error("Odpowiedz, czy potrzebujesz transportu (TAK / NIE).");
      return;
    }

    const payload =
      mode === "car"
        ? { drivesCar: true as const, canTakePassengers: canTakePassengers === true }
        : { drivesCar: false as const, needsTransport: needsTransport === true };

    setBusy(true);
    try {
      const url =
        intent === "edit"
          ? `/api/terminarz/signup/${matchId}/transport`
          : intent === "confirm"
            ? `/api/terminarz/signup/${matchId}/confirm`
            : `/api/terminarz/signup/${matchId}`;
      const method = intent === "edit" ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Nie udało się zapisać");
        return;
      }
      toast.success(
        intent === "edit"
          ? "Zapisano preferencje transportu"
          : intent === "confirm"
            ? "Potwierdzono zapis"
            : "Zapisano"
      );
      onOpenChange(false);
      onCompleted();
    } finally {
      setBusy(false);
    }
  }

  // ── Tryb HotPay: pytanie o płatność zamiast transportu ──────────────────
  if (hotpayEnabled && (intent === "signup" || intent === "confirm")) {
    return (
      <AppModal
        open={open}
        onOpenChange={onOpenChange}
        size="sm"
        title={intent === "confirm" ? "Potwierdź udział w meczu" : "Zapisz się na mecz"}
        description={
          intent === "confirm"
            ? "Potwierdzasz udział — czy chcesz od razu opłacić wpisowe?"
            : "Zajmujesz miejsce w składzie — czy chcesz od razu opłacić wpisowe?"
        }
      >
        <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-4 dark:border-emerald-800/60 dark:bg-emerald-950/40">
          <div className="flex items-start gap-3">
            <Wallet className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-300" aria-hidden />
            <div>
              <p className="text-sm font-semibold text-emerald-950 dark:text-emerald-100">
                Zaliczka na wpisowe:{" "}
                <span className="tabular-nums">{PREPAYMENT_PLN},00 zł</span>
              </p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                Jeśli ostateczna składka okaże się niższa niż {PREPAYMENT_PLN} zł, różnica zostanie
                automatycznie dopisana do Twojego portfela.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => void signupNoTransport(false)}
          >
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
            Zapisz bez opłaty
          </Button>
          <PayButton
            variant="default"
            amountPln={PREPAYMENT_PLN}
            label="Zapisz i zapłać"
            busy={busy}
            onClick={() => void signupNoTransport(true)}
          />
        </div>
      </AppModal>
    );
  }

  // ── Tryb standardowy: pytania o transport ────────────────────────────────
  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      title={
        intent === "edit"
          ? "Transport na mecz"
          : intent === "confirm"
            ? "Potwierdź udział — transport"
            : "Zapis — transport"
      }
      description={
        intent === "signup"
          ? "Powiedz nam, jak planujesz dojazd — pomoże to ustalić transport w grupie."
          : intent === "confirm"
            ? "Potwierdzasz udział w składzie — podaj, jak planujesz dojazd."
            : "Zaktualizuj informacje o dojeździe na ten mecz."
      }
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Anuluj
          </Button>
          <Button type="button" variant="pitch" onClick={() => void submitWithTransport()} disabled={busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
            {intent === "edit" ? "Zapisz" : "Potwierdź zapis"}
          </Button>
        </>
      }
    >
      <div>
        <p className="mb-2 text-sm font-medium text-emerald-950 dark:text-emerald-100">Jak dotrzesz na mecz?</p>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={mode === "car" ? "default" : "outline"}
            className={cn(
              "h-auto flex-col gap-1 py-3",
              mode === "car" &&
                "border-0 bg-emerald-800 hover:bg-emerald-900 dark:bg-emerald-600 dark:hover:bg-emerald-500"
            )}
            onClick={() => {
              setMode("car");
              setNeedsTransport(null);
            }}
          >
            <Car className="h-5 w-5" aria-hidden />
            <span className="text-sm font-semibold">Samochodem</span>
          </Button>
          <Button
            type="button"
            variant={mode === "public" ? "default" : "outline"}
            className={cn(
              "h-auto flex-col gap-1 py-3",
              mode === "public" &&
                "border-0 bg-emerald-800 hover:bg-emerald-900 dark:bg-emerald-600 dark:hover:bg-emerald-500"
            )}
            onClick={() => {
              setMode("public");
              setCanTakePassengers(null);
            }}
          >
            <TrainFront className="h-5 w-5" aria-hidden />
            <span className="text-sm font-semibold">Komunikacja</span>
          </Button>
        </div>
      </div>

      {mode === "car" && (
        <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-3 dark:border-emerald-800/60 dark:bg-emerald-950/40">
          <p className="text-sm font-medium text-emerald-950 dark:text-emerald-100">Możesz zabrać pasażerów?</p>
          <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
            <span className="font-semibold text-emerald-900 dark:text-emerald-200">TAK</span> — masz wolne miejsca w
            aucie.{" "}
            <span className="font-semibold text-emerald-900 dark:text-emerald-200">NIE</span> — jedziesz sam lub nie
            możesz zabrać osób.
          </p>
          <div className="mt-3 flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={canTakePassengers === true ? "default" : "outline"}
              className={cn(
                "flex-1",
                canTakePassengers === true &&
                  "bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500"
              )}
              onClick={() => setCanTakePassengers(true)}
            >
              TAK
            </Button>
            <Button
              type="button"
              size="sm"
              variant={canTakePassengers === false ? "default" : "outline"}
              className={cn(
                "flex-1",
                canTakePassengers === false &&
                  "bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500"
              )}
              onClick={() => setCanTakePassengers(false)}
            >
              NIE
            </Button>
          </div>
        </div>
      )}

      {mode === "public" && (
        <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-3 dark:border-emerald-800/60 dark:bg-emerald-950/40">
          <p className="text-sm font-medium text-emerald-950 dark:text-emerald-100">
            Potrzebujesz transportu od kogoś z drużyny?
          </p>
          <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
            <span className="font-semibold text-emerald-900 dark:text-emerald-200">TAK</span> — szukasz dojazdu.{" "}
            <span className="font-semibold text-emerald-900 dark:text-emerald-200">NIE</span> — dotrzesz samodzielnie
            komunikacją.
          </p>
          <div className="mt-3 flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={needsTransport === true ? "default" : "outline"}
              className={cn(
                "flex-1",
                needsTransport === true &&
                  "bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500"
              )}
              onClick={() => setNeedsTransport(true)}
            >
              TAK
            </Button>
            <Button
              type="button"
              size="sm"
              variant={needsTransport === false ? "default" : "outline"}
              className={cn(
                "flex-1",
                needsTransport === false &&
                  "bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500"
              )}
              onClick={() => setNeedsTransport(false)}
            >
              NIE
            </Button>
          </div>
        </div>
      )}
    </AppModal>
  );
}
