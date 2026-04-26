"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PlayerAvatar, PlayerNameStack } from "@/components/player-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PlatnosciUserLite } from "@/components/platnosci-client";
import { cn } from "@/lib/utils";

type AdminWalletPlayerRow = PlatnosciUserLite & { balance_pln: number };

type AdminWalletOverview = {
  players: AdminWalletPlayerRow[];
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const res = await fetch(url, init);
    const json = (await res.json().catch(() => null)) as unknown;
    if (!res.ok) {
      const msg = (json as { error?: unknown } | null)?.error;
      return { ok: false, error: typeof msg === "string" ? msg : "Nie udało się wykonać operacji" };
    }
    return { ok: true, data: json as T };
  } catch {
    return { ok: false, error: "Błąd sieci" };
  }
}

function formatPln(n: number) {
  const v = Math.round(n * 100) / 100;
  return new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" }).format(v);
}

type AdminWalletsSaldoSectionProps = {
  /**
   * true: bez osobnego H1 — do osadzenia w /platnosci (obok innych kart).
   * false: pełny nagłówek (np. zakładka Portfele w panelu admina).
   */
  embedded?: boolean;
};

/**
 * Pełna lista sald graczy i ręczne ustawianie salda (admin).
 * Dostępne w panelu administratora; może być też osadzone na /platnosci (embedded).
 */
export function AdminWalletsSaldoSection({ embedded = false }: AdminWalletsSaldoSectionProps) {
  const router = useRouter();
  const [adminOverview, setAdminOverview] = useState<AdminWalletOverview | null>(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminBalanceUserId, setAdminBalanceUserId] = useState<number | null>(null);
  const [adminBalanceTarget, setAdminBalanceTarget] = useState("");
  const [adminBalanceNote, setAdminBalanceNote] = useState("");
  const [adminBalanceSubmitting, setAdminBalanceSubmitting] = useState(false);

  async function refresh() {
    setAdminLoading(true);
    try {
      const r = await fetchJson<AdminWalletOverview>("/api/admin/wallet/overview");
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setAdminOverview(r.data);
      if (adminBalanceUserId === null && r.data.players?.length) {
        setAdminBalanceUserId(r.data.players[0]!.id);
      }
    } finally {
      setAdminLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function adminSetWalletBalance() {
    const user_id = adminBalanceUserId;
    const balance_pln = Number(String(adminBalanceTarget).replace(",", "."));
    if (!user_id) {
      toast.error("Wybierz zawodnika");
      return;
    }
    if (!Number.isFinite(balance_pln)) {
      toast.error("Podaj prawidłowe saldo");
      return;
    }
    setAdminBalanceSubmitting(true);
    try {
      const r = await fetchJson<{
        ok: true;
        txId?: number;
        noChange?: boolean;
      }>("/api/admin/wallet/balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id,
          balance_pln,
          note: adminBalanceNote.trim() ? adminBalanceNote.trim() : undefined,
        }),
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      if (r.data.noChange) {
        toast.message("Saldo bez zmian");
      } else {
        toast.success("Ustawiono saldo (korekta zapisana w historii)");
      }
      setAdminBalanceTarget("");
      setAdminBalanceNote("");
      await refresh();
      router.refresh();
    } finally {
      setAdminBalanceSubmitting(false);
    }
  }

  return (
    <div>
      {!embedded ? (
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Portfele graczy</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Salda zarejestrowanych graczy (poza kontami admina) i ręczne korekty — docelowe saldo zapisuje się jako
            transakcja korygująca w historii portfela.
          </p>
        </div>
      ) : null}

      <Card
        className={cn(
          "bg-white shadow-sm dark:bg-zinc-900/90",
          embedded
            ? "border-emerald-900/10 dark:border-emerald-100/10"
            : "border-zinc-200/80 dark:border-zinc-700/80 dark:shadow-black/30"
        )}
      >
        <CardHeader className="pb-2">
          <CardTitle className={cn("text-lg", embedded && "text-emerald-950 dark:text-emerald-100")}>
            Portfele graczy — saldo
          </CardTitle>
          <CardDescription>
            {embedded
              ? "Podgląd sald wszystkich graczy (bez kont admina) i ręczne korekty — także w panelu → Portfele."
              : "Najważniejszy podgląd sald i korekty ręczne."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 rounded-2xl border border-emerald-900/10 bg-white/70 p-4 dark:border-emerald-100/10 dark:bg-zinc-950/40">
            <p className="text-sm font-semibold text-emerald-950 dark:text-emerald-100">Ustaw saldo zawodnika</p>
            <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
              Wpisujesz docelowe saldo. System zapisze różnicę jako „Korekta” w historii portfela.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-1">
                <Label htmlFor="admin-balance-user">Zawodnik</Label>
                <select
                  id="admin-balance-user"
                  className="awp-focus-ring mt-1 w-full rounded-xl border border-emerald-950/15 bg-white/90 px-3 py-2 text-sm font-medium text-emerald-950 shadow-sm shadow-emerald-950/5 dark:border-emerald-100/10 dark:bg-zinc-900/70 dark:text-emerald-100"
                  value={adminBalanceUserId ?? ""}
                  onChange={(e) => setAdminBalanceUserId(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="" disabled>
                    Wybierz zawodnika…
                  </option>
                  {(adminOverview?.players ?? []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.first_name} {p.last_name}
                    </option>
                  ))}
                </select>
                {adminBalanceUserId && adminOverview?.players?.length ? (() => {
                  const b = Number(
                    (adminOverview.players.find((p) => p.id === adminBalanceUserId)?.balance_pln ?? 0) as number
                  );
                  const neg = b < 0;
                  const pos = b > 0;
                  return (
                    <p
                      className={cn(
                        "mt-1 text-xs",
                        neg
                          ? "font-semibold text-red-700 dark:text-red-300"
                          : pos
                            ? "font-semibold text-emerald-800 dark:text-emerald-200"
                            : "text-zinc-600 dark:text-zinc-400"
                      )}
                    >
                      Obecne saldo: {formatPln(b)}
                      {neg ? (
                        <span className="ml-2 inline-block rounded border border-red-200 bg-red-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-red-900 dark:border-red-800 dark:bg-red-900/50 dark:text-red-200">
                          Niedopłata
                        </span>
                      ) : pos ? (
                        <span className="ml-2 inline-block rounded border border-emerald-300 bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-900 dark:border-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-100">
                          Nadwyżka
                        </span>
                      ) : null}
                    </p>
                  );
                })() : null}
              </div>
              <div className="sm:col-span-1">
                <Label htmlFor="admin-balance-target">Saldo (PLN)</Label>
                <Input
                  id="admin-balance-target"
                  type="text"
                  inputMode="decimal"
                  placeholder="np. 120"
                  value={adminBalanceTarget}
                  onChange={(e) => setAdminBalanceTarget(e.target.value)}
                />
              </div>
              <div className="sm:col-span-1">
                <Label htmlFor="admin-balance-note">Opis (opcjonalnie)</Label>
                <Input
                  id="admin-balance-note"
                  type="text"
                  placeholder="np. korekta po gotówce"
                  value={adminBalanceNote}
                  onChange={(e) => setAdminBalanceNote(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-3">
              <Button type="button" disabled={adminBalanceSubmitting} onClick={() => void adminSetWalletBalance()}>
                {adminBalanceSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
                Ustaw saldo
              </Button>
            </div>
          </div>

          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              {adminOverview?.players?.length ? `Graczy: ${adminOverview.players.length}` : "—"}
            </p>
            <Button type="button" variant="secondary" disabled={adminLoading} onClick={() => void refresh()}>
              {adminLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
              Odśwież
            </Button>
          </div>
          {adminOverview?.players?.length ? (
            <ul className="max-h-96 space-y-0 overflow-y-auto rounded-xl border border-emerald-900/10 bg-emerald-50/20 dark:border-emerald-100/10 dark:bg-emerald-950/30">
              {adminOverview.players.map((p, i) => {
                const bal = Number(p.balance_pln ?? 0);
                const isNegative = bal < 0;
                const isPositive = bal > 0;
                return (
                <li
                  key={p.id}
                  className={cn(
                    "flex flex-wrap items-center gap-2 border-b px-3 py-2.5 text-sm last:border-b-0",
                    isNegative
                      ? "border-l-4 border-l-red-600 bg-red-50/95 dark:border-l-red-500 dark:bg-red-950/40"
                      : isPositive
                        ? "border-l-4 border-l-emerald-600 bg-emerald-50/95 dark:border-l-emerald-500 dark:bg-emerald-950/45"
                        : i % 2 === 0
                          ? "bg-white/60 dark:bg-zinc-900/50"
                          : "bg-emerald-50/40 dark:bg-zinc-900/30"
                  )}
                >
                  <PlayerAvatar
                    photoPath={p.profile_photo_path}
                    firstName={p.first_name}
                    lastName={p.last_name}
                    size="sm"
                    ringClassName={
                      isNegative
                        ? "ring-2 ring-red-300 dark:ring-red-600/60"
                        : isPositive
                          ? "ring-2 ring-emerald-500 dark:ring-emerald-500/80"
                          : "ring-2 ring-emerald-200/90"
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <PlayerNameStack firstName={p.first_name} lastName={p.last_name} nick={p.zawodnik} />
                  </div>
                  {isNegative ? (
                    <span
                      className="shrink-0 rounded border border-red-200 bg-red-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-900 dark:border-red-800 dark:bg-red-900/50 dark:text-red-200"
                      title="Saldo ujemne"
                    >
                      Niedopłata
                    </span>
                  ) : isPositive ? (
                    <span
                      className="shrink-0 rounded border border-emerald-300 bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-900 dark:border-emerald-700 dark:bg-emerald-900/55 dark:text-emerald-100"
                      title="Saldo dodatnie"
                    >
                      Nadwyżka
                    </span>
                  ) : null}
                  <span
                    className={cn(
                      "shrink-0 font-semibold tabular-nums",
                      isNegative
                        ? "text-red-700 dark:text-red-200"
                        : isPositive
                          ? "text-emerald-800 dark:text-emerald-200"
                          : "text-emerald-950 dark:text-emerald-100"
                    )}
                  >
                    {formatPln(bal)}
                  </span>
                </li>
                );
              })}
            </ul>
          ) : (
            <p className="rounded-xl border border-dashed border-emerald-900/10 bg-emerald-50/20 px-4 py-6 text-center text-sm text-zinc-600 dark:border-emerald-100/10 dark:bg-emerald-950/20 dark:text-zinc-400">
              {adminLoading ? "Wczytywanie…" : "Brak danych do wyświetlenia."}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
