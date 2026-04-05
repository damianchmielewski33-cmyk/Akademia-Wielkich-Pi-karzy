"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Car, TrainFront } from "lucide-react";
import type { SignupTransportRow } from "@/lib/transport";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Mode = "car" | "public" | null;

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  matchId: number;
  intent: "signup" | "edit";
  initial?: SignupTransportRow | null;
  onCompleted: () => void;
};

export function MatchTransportSignupDialog({
  open,
  onOpenChange,
  matchId,
  intent,
  initial,
  onCompleted,
}: Props) {
  const [mode, setMode] = useState<Mode>(null);
  const [canTakePassengers, setCanTakePassengers] = useState<boolean | null>(null);
  const [needsTransport, setNeedsTransport] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initial && intent === "edit") {
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

  async function submit() {
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
      toast.success(intent === "edit" ? "Zapisano preferencje transportu" : "Zapisano");
      onOpenChange(false);
      onCompleted();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-emerald-900/15 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-emerald-950">
            {intent === "edit" ? "Transport na mecz" : "Zapis — transport"}
          </DialogTitle>
          <DialogDescription className="text-left text-zinc-600">
            {intent === "signup"
              ? "Powiedz nam, jak planujesz dojazd — pomoże to ustalić transport w grupie."
              : "Zaktualizuj informacje o dojeździe na ten mecz."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div>
            <p className="mb-2 text-sm font-medium text-emerald-950">Jak dotrzesz na mecz?</p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={mode === "car" ? "default" : "outline"}
                className={cn(
                  "h-auto flex-col gap-1 py-3",
                  mode === "car" && "border-0 bg-emerald-800 hover:bg-emerald-900"
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
                  mode === "public" && "border-0 bg-emerald-800 hover:bg-emerald-900"
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
            <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-3">
              <p className="text-sm font-medium text-emerald-950">Możesz zabrać pasażerów?</p>
              <p className="mt-0.5 text-xs text-zinc-600">
                <span className="font-semibold text-emerald-900">TAK</span> — masz wolne miejsca w aucie.{" "}
                <span className="font-semibold text-emerald-900">NIE</span> — jedziesz sam lub nie możesz zabrać
                osób.
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={canTakePassengers === true ? "default" : "outline"}
                  className={cn("flex-1", canTakePassengers === true && "bg-emerald-700 hover:bg-emerald-800")}
                  onClick={() => setCanTakePassengers(true)}
                >
                  TAK
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={canTakePassengers === false ? "default" : "outline"}
                  className={cn("flex-1", canTakePassengers === false && "bg-emerald-700 hover:bg-emerald-800")}
                  onClick={() => setCanTakePassengers(false)}
                >
                  NIE
                </Button>
              </div>
            </div>
          )}

          {mode === "public" && (
            <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-3">
              <p className="text-sm font-medium text-emerald-950">Potrzebujesz transportu od kogoś z drużyny?</p>
              <p className="mt-0.5 text-xs text-zinc-600">
                <span className="font-semibold text-emerald-900">TAK</span> — szukasz dojazdu.{" "}
                <span className="font-semibold text-emerald-900">NIE</span> — dotrzesz samodzielnie komunikacją.
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={needsTransport === true ? "default" : "outline"}
                  className={cn("flex-1", needsTransport === true && "bg-emerald-700 hover:bg-emerald-800")}
                  onClick={() => setNeedsTransport(true)}
                >
                  TAK
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={needsTransport === false ? "default" : "outline"}
                  className={cn("flex-1", needsTransport === false && "bg-emerald-700 hover:bg-emerald-800")}
                  onClick={() => setNeedsTransport(false)}
                >
                  NIE
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Anuluj
          </Button>
          <Button
            type="button"
            className="bg-emerald-700 hover:bg-emerald-800"
            onClick={() => void submit()}
            disabled={busy}
          >
            {intent === "edit" ? "Zapisz" : "Potwierdź zapis"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
