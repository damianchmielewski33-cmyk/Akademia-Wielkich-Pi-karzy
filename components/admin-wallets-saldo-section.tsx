"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Check, ClipboardCopy, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { PlayerAvatar, PlayerNameStack } from "@/components/player-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PitchCardDecorations, pitchLabelClass } from "@/components/ui/pitch-card";
import type { PlatnosciUserLite } from "@/components/platnosci-client";
import { nativeSelectClasses } from "@/lib/field-styles";
import { cn } from "@/lib/utils";

type AdminWalletPlayerRow = PlatnosciUserLite & { balance_pln: number };

type AdminWalletOverview = {
  players: AdminWalletPlayerRow[];
  walletUsers?: (AdminWalletPlayerRow & { is_admin?: number })[];
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

const platnosciPanelClass =
  "rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80 sm:p-5";

const platnosciCollapsibleClass =
  "group overflow-hidden rounded-2xl border border-zinc-200/90 bg-zinc-50/90 dark:border-zinc-700 dark:bg-zinc-950/50";

function PlatnosciCollapsible({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <details className={cn(platnosciCollapsibleClass, className)}>
      <summary className="awp-focus-ring cursor-pointer list-none px-4 py-3 text-sm font-semibold text-emerald-950 dark:text-emerald-100 [&::-webkit-details-marker]:hidden">
        <span className="flex items-center justify-between gap-3">
          <span>{title}</span>
          <span className="text-xs font-medium text-zinc-600 group-open:hidden dark:text-zinc-400">Rozwiń</span>
          <span className="hidden text-xs font-medium text-zinc-600 group-open:inline dark:text-zinc-400">Zwiń</span>
        </span>
        <span className="mt-1 block text-xs font-normal text-zinc-600 dark:text-zinc-400">{description}</span>
      </summary>
      <div className="px-4 pb-4">{children}</div>
    </details>
  );
}

type AdminWalletsSaldoSectionProps = {
  /**
   * true: bez osobnego H1 — do osadzenia w /platnosci (obok innych kart).
   * false: pełny nagłówek (np. zakładka Portfele w panelu admina).
   */
  embedded?: boolean;
  /** Przyciski generowania linków publicznych (ostatni mecz + zbiorczo). */
  showPublicLinks?: boolean;
  /** Formularz doładowania salda po otrzymanym przelewie (ekran /platnosci). */
  showTopUp?: boolean;
};

/**
 * Pełna lista sald graczy i ręczne ustawianie salda (admin).
 * Dostępne w panelu administratora; może być też osadzone na /platnosci (embedded).
 */
export function AdminWalletsSaldoSection({
  embedded = false,
  showPublicLinks = false,
  showTopUp = false,
}: AdminWalletsSaldoSectionProps) {
  const router = useRouter();
  const [adminOverview, setAdminOverview] = useState<AdminWalletOverview | null>(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminBalanceUserId, setAdminBalanceUserId] = useState<number | null>(null);
  const [adminBalanceUserQuery, setAdminBalanceUserQuery] = useState("");
  const [adminBalanceTarget, setAdminBalanceTarget] = useState("");
  const [adminBalanceNote, setAdminBalanceNote] = useState("");
  const [adminBalanceSubmitting, setAdminBalanceSubmitting] = useState(false);
  const [topUpUserId, setTopUpUserId] = useState<number | null>(null);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [topUpNote, setTopUpNote] = useState("");
  const [topUpSubmitting, setTopUpSubmitting] = useState(false);
  const [publicLinkBusy, setPublicLinkBusy] = useState(false);
  const [publicLinkCopied, setPublicLinkCopied] = useState<string | null>(null);

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
        const first = r.data.players[0]!;
        setAdminBalanceUserId(first.id);
        setAdminBalanceUserQuery("");
      }
      if (topUpUserId === null) {
        const list = r.data.walletUsers ?? r.data.players ?? [];
        if (list.length) setTopUpUserId(list[0]!.id);
      }
    } finally {
      setAdminLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const balancePlayerList = useMemo(
    () => adminOverview?.walletUsers ?? adminOverview?.players ?? [],
    [adminOverview]
  );

  const filteredBalancePlayers = useMemo(() => {
    const q = adminBalanceUserQuery.trim().toLowerCase();
    if (!q) return balancePlayerList.slice(0, 12);
    return balancePlayerList
      .filter((p) => {
        const key = `${p.first_name} ${p.last_name} ${p.zawodnik}`.toLowerCase();
        return key.includes(q);
      })
      .slice(0, 20);
  }, [balancePlayerList, adminBalanceUserQuery]);

  const selectedBalancePlayer = useMemo(
    () => (adminBalanceUserId != null ? balancePlayerList.find((p) => p.id === adminBalanceUserId) : undefined),
    [balancePlayerList, adminBalanceUserId]
  );

  async function generatePublicLink(kind: "last_match_wallets" | "all_wallets") {
    setPublicLinkBusy(true);
    try {
      const r = await fetchJson<{ ok: true; token: string; path: string }>("/api/admin/wallet/public-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, expires_in_days: 30 }),
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      const url = `${window.location.origin}${r.data.path}`;
      await navigator.clipboard.writeText(url);
      setPublicLinkCopied(kind);
      toast.success("Skopiowano link do schowka");
      setTimeout(() => setPublicLinkCopied(null), 2000);
    } catch {
      toast.error("Nie udało się skopiować linku");
    } finally {
      setPublicLinkBusy(false);
    }
  }

  async function adminTopUpWallet() {
    const user_id = topUpUserId;
    const amount_pln = Number(String(topUpAmount).replace(",", "."));
    if (!user_id) {
      toast.error("Wybierz zawodnika");
      return;
    }
    if (!Number.isFinite(amount_pln) || amount_pln <= 0) {
      toast.error("Podaj prawidłową kwotę");
      return;
    }
    setTopUpSubmitting(true);
    try {
      const r = await fetchJson<{ ok: true; id: number }>("/api/admin/wallet/deposits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id,
          amount_pln,
          note: topUpNote.trim() ? topUpNote.trim() : undefined,
        }),
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(`Dodano ${formatPln(amount_pln)} do salda zawodnika`);
      setTopUpAmount("");
      setTopUpNote("");
      await refresh();
      router.refresh();
    } finally {
      setTopUpSubmitting(false);
    }
  }

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

  const walletPanels = (
    <>
          {showTopUp ? (() => {
            const topUpBody = (
              <>
                <div className={cn("grid gap-3 sm:grid-cols-3", embedded ? "mt-1" : "mt-3")}>
                  <div className="sm:col-span-1">
                    <Label htmlFor="admin-topup-user">Zawodnik</Label>
                    <select
                      id="admin-topup-user"
                      className={cn(nativeSelectClasses, "mt-1 w-full")}
                      value={topUpUserId ?? ""}
                      onChange={(e) => setTopUpUserId(e.target.value ? Number(e.target.value) : null)}
                    >
                      <option value="" disabled>
                        Wybierz zawodnika…
                      </option>
                      {balancePlayerList.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.first_name} {p.last_name}
                          {p.zawodnik ? ` (${p.zawodnik})` : ""}
                        </option>
                      ))}
                    </select>
                    {topUpUserId != null ? (() => {
                      const p = balancePlayerList.find((x) => x.id === topUpUserId);
                      if (!p) return null;
                      const b = Number(p.balance_pln ?? 0);
                      return (
                        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                          Obecne saldo: {formatPln(b)}
                        </p>
                      );
                    })() : null}
                  </div>
                  <div className="sm:col-span-1">
                    <Label htmlFor="admin-topup-amount">Kwota przelewu (PLN)</Label>
                    <Input
                      id="admin-topup-amount"
                      type="text"
                      inputMode="decimal"
                      placeholder="np. 50"
                      value={topUpAmount}
                      onChange={(e) => setTopUpAmount(e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <Label htmlFor="admin-topup-note">Opis (opcjonalnie)</Label>
                    <Input
                      id="admin-topup-note"
                      type="text"
                      placeholder="np. BLIK od Jana"
                      value={topUpNote}
                      onChange={(e) => setTopUpNote(e.target.value)}
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <Button type="button" disabled={topUpSubmitting} onClick={() => void adminTopUpWallet()}>
                    {topUpSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
                    Dodaj do salda
                  </Button>
                </div>
              </>
            );

            if (embedded) {
              return (
                <PlatnosciCollapsible
                  className="mb-0"
                  title="Doładuj saldo"
                  description="Po otrzymaniu przelewu wpisz kwotę — zostanie dodana do salda zawodnika jako wpłata."
                >
                  {topUpBody}
                </PlatnosciCollapsible>
              );
            }

            return (
              <div className="mb-4 rounded-2xl border border-emerald-900/10 bg-emerald-50/30 p-4 dark:border-emerald-100/10 dark:bg-emerald-950/30">
                <p className="text-sm font-semibold text-emerald-950 dark:text-emerald-100">Doładuj saldo</p>
                <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                  Po otrzymaniu przelewu wpisz kwotę — zostanie dodana do salda zawodnika jako wpłata.
                </p>
                {topUpBody}
              </div>
            );
          })() : null}

          {(() => {
            const balanceFormPanelClass =
              "rounded-xl border border-amber-200/90 bg-amber-50/60 p-4 dark:border-amber-800/50 dark:bg-amber-950/25";
            const playerReadonlyCardClass =
              "rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 dark:border-emerald-800/50 dark:bg-emerald-950/35";

            const balanceEditBody = (
              <div className={cn("space-y-4", embedded ? "mt-1" : "mt-3")}>
                <section aria-labelledby="admin-balance-player-heading">
                  <p
                    id="admin-balance-player-heading"
                    className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-600 dark:text-zinc-400"
                  >
                    Zawodnik
                  </p>

                  {selectedBalancePlayer ? (
                    <div className={cn(playerReadonlyCardClass, "mt-2")}>
                      <div className="flex flex-wrap items-center gap-3">
                        <PlayerAvatar
                          photoPath={selectedBalancePlayer.profile_photo_path}
                          firstName={selectedBalancePlayer.first_name}
                          lastName={selectedBalancePlayer.last_name}
                          size="md"
                          ringClassName="ring-2 ring-emerald-300/90 dark:ring-emerald-600/70"
                        />
                        <div className="min-w-0 flex-1">
                          <PlayerNameStack
                            firstName={selectedBalancePlayer.first_name}
                            lastName={selectedBalancePlayer.last_name}
                            nick={selectedBalancePlayer.zawodnik}
                            primaryClassName="text-base font-semibold text-emerald-950 dark:text-emerald-50"
                            secondaryClassName="text-sm text-emerald-800/90 dark:text-emerald-200/80"
                          />
                          {(() => {
                            const b = Number(selectedBalancePlayer.balance_pln ?? 0);
                            const neg = b < 0;
                            const pos = b > 0;
                            return (
                              <p
                                className={cn(
                                  "mt-1.5 text-sm font-semibold tabular-nums",
                                  neg
                                    ? "text-red-700 dark:text-red-300"
                                    : pos
                                      ? "text-emerald-800 dark:text-emerald-200"
                                      : "text-zinc-700 dark:text-zinc-300"
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
                          })()}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="shrink-0"
                          onClick={() => {
                            setAdminBalanceUserId(null);
                            setAdminBalanceUserQuery("");
                          }}
                        >
                          Zmień zawodnika
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 space-y-2">
                      <Label htmlFor="admin-balance-user" className="sr-only">
                        Szukaj zawodnika
                      </Label>
                      <div className="relative">
                        <Search
                          className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
                          aria-hidden
                        />
                        <Input
                          id="admin-balance-user"
                          type="search"
                          placeholder="Szukaj po imieniu, nazwisku lub pseudonimie…"
                          value={adminBalanceUserQuery}
                          onChange={(e) => setAdminBalanceUserQuery(e.target.value)}
                          autoComplete="off"
                          className="pl-9"
                        />
                      </div>
                      {balancePlayerList.length ? (
                        <ul className="max-h-44 space-y-0 overflow-y-auto rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-950/50">
                          {filteredBalancePlayers.length ? (
                            filteredBalancePlayers.map((p) => (
                              <li key={p.id}>
                                <button
                                  type="button"
                                  className="flex w-full items-center gap-2 border-b border-zinc-100 px-3 py-2.5 text-left text-sm last:border-b-0 hover:bg-emerald-50 dark:border-zinc-800 dark:hover:bg-emerald-950/40"
                                  onClick={() => {
                                    setAdminBalanceUserId(p.id);
                                    setAdminBalanceUserQuery("");
                                  }}
                                >
                                  <PlayerAvatar
                                    photoPath={p.profile_photo_path}
                                    firstName={p.first_name}
                                    lastName={p.last_name}
                                    size="sm"
                                    ringClassName="ring-2 ring-emerald-200/90"
                                  />
                                  <span className="min-w-0 flex-1 truncate font-medium text-zinc-900 dark:text-zinc-100">
                                    {p.first_name} {p.last_name}
                                    {p.zawodnik ? (
                                      <span className="ml-1 font-normal text-zinc-500 dark:text-zinc-400">
                                        ({p.zawodnik})
                                      </span>
                                    ) : null}
                                  </span>
                                  <span className="shrink-0 text-xs font-semibold tabular-nums text-emerald-800 dark:text-emerald-200">
                                    {formatPln(Number(p.balance_pln ?? 0))}
                                  </span>
                                  {"is_admin" in p && Number((p as { is_admin?: number }).is_admin ?? 0) ? (
                                    <span className="shrink-0 text-[10px] font-bold uppercase text-zinc-500">Admin</span>
                                  ) : null}
                                </button>
                              </li>
                            ))
                          ) : (
                            <li className="px-3 py-4 text-center text-xs text-zinc-500">Brak wyników wyszukiwania.</li>
                          )}
                        </ul>
                      ) : null}
                    </div>
                  )}
                </section>

                {selectedBalancePlayer ? (
                  <section aria-labelledby="admin-balance-form-heading" className={balanceFormPanelClass}>
                    <p
                      id="admin-balance-form-heading"
                      className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-900/80 dark:text-amber-200/90"
                    >
                      Docelowe saldo
                    </p>
                    <p className="mt-1 text-xs text-amber-950/75 dark:text-amber-100/75">
                      Wpisz kwotę, na jaką ma zostać ustawione saldo — różnica trafi do historii jako korekta.
                    </p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="admin-balance-target">Nowe saldo (PLN)</Label>
                        <Input
                          id="admin-balance-target"
                          type="text"
                          inputMode="decimal"
                          placeholder="np. 120,00"
                          value={adminBalanceTarget}
                          onChange={(e) => setAdminBalanceTarget(e.target.value)}
                          className="mt-1 border-amber-300/80 bg-white font-semibold tabular-nums dark:border-amber-700/60 dark:bg-zinc-950"
                        />
                      </div>
                      <div>
                        <Label htmlFor="admin-balance-note">Opis korekty (opcjonalnie)</Label>
                        <Input
                          id="admin-balance-note"
                          type="text"
                          placeholder="np. korekta po gotówce"
                          value={adminBalanceNote}
                          onChange={(e) => setAdminBalanceNote(e.target.value)}
                          className="mt-1 bg-white dark:bg-zinc-950"
                        />
                      </div>
                    </div>
                    <div className="mt-4">
                      <Button type="button" disabled={adminBalanceSubmitting} onClick={() => void adminSetWalletBalance()}>
                        {adminBalanceSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
                        Ustaw saldo
                      </Button>
                    </div>
                  </section>
                ) : (
                  <p className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50/80 px-3 py-2.5 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400">
                    Wybierz zawodnika z listy, aby ustawić docelowe saldo.
                  </p>
                )}
              </div>
            );

            if (embedded) {
              return (
                <PlatnosciCollapsible
                  className="mb-0"
                  title="Ustaw saldo zawodnika"
                  description='Wpisujesz docelowe saldo. System zapisze różnicę jako „Korekta” w historii portfela.'
                >
                  {balanceEditBody}
                </PlatnosciCollapsible>
              );
            }

            return (
              <div className="mb-4 rounded-2xl border border-emerald-900/10 bg-white/70 p-4 dark:border-emerald-100/10 dark:bg-zinc-950/40">
                <p className="text-sm font-semibold text-emerald-950 dark:text-emerald-100">Ustaw saldo zawodnika</p>
                <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                  Wpisujesz docelowe saldo. System zapisze różnicę jako „Korekta” w historii portfela.
                </p>
                {balanceEditBody}
              </div>
            );
          })()}

          <div className={cn("flex flex-wrap items-center justify-between gap-2", embedded && "border-t border-zinc-200 pt-4 dark:border-zinc-700")}>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-800 dark:text-emerald-300">
                Lista sald
              </p>
              <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
              {(() => {
                const list = adminOverview?.walletUsers ?? adminOverview?.players ?? [];
                return list.length ? `Użytkowników: ${list.length}` : "—";
              })()}
              </p>
            </div>
            <Button type="button" variant="secondary" disabled={adminLoading} onClick={() => void refresh()}>
              {adminLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
              Odśwież
            </Button>
          </div>
          {(() => {
            const list = adminOverview?.walletUsers ?? adminOverview?.players ?? [];
            return list.length ? (
            <ul className="max-h-96 space-y-0 overflow-y-auto rounded-xl border border-zinc-200 bg-zinc-50/50 dark:border-zinc-700 dark:bg-zinc-950/40">
              {list.map((p, i) => {
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
                  {"is_admin" in p && Number((p as { is_admin?: number }).is_admin ?? 0) ? (
                    <span
                      className="shrink-0 rounded border border-zinc-300 bg-zinc-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-200"
                      title="Konto administratora"
                    >
                      Admin
                    </span>
                  ) : null}
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
            <p className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 px-4 py-6 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950/30 dark:text-zinc-400">
              {adminLoading ? "Wczytywanie…" : "Brak danych do wyświetlenia."}
            </p>
            );
          })()}

          {showPublicLinks ? (
            embedded ? (
              <PlatnosciCollapsible
                className="mt-0"
                title="Linki do podsumowania płatności"
                description="Wyślij zawodnikom link z podglądem sald — ostatni mecz lub zbiorcze salda wszystkich graczy."
              >
                <div className="mt-1 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={publicLinkBusy}
                    onClick={() => void generatePublicLink("last_match_wallets")}
                  >
                    {publicLinkCopied === "last_match_wallets" ? (
                      <Check className="mr-2 h-4 w-4" aria-hidden />
                    ) : (
                      <ClipboardCopy className="mr-2 h-4 w-4" aria-hidden />
                    )}
                    Ostatni mecz
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={publicLinkBusy}
                    onClick={() => void generatePublicLink("all_wallets")}
                  >
                    {publicLinkCopied === "all_wallets" ? (
                      <Check className="mr-2 h-4 w-4" aria-hidden />
                    ) : (
                      <ClipboardCopy className="mr-2 h-4 w-4" aria-hidden />
                    )}
                    Zbiorczo — wszystkie salda
                  </Button>
                </div>
              </PlatnosciCollapsible>
            ) : (
            <details className="group mt-6 overflow-hidden rounded-2xl border border-emerald-900/10 bg-emerald-50/30 dark:border-emerald-100/10 dark:bg-emerald-950/30">
              <summary className="awp-focus-ring cursor-pointer list-none px-4 py-3 text-sm font-semibold text-emerald-950 dark:text-emerald-100 [&::-webkit-details-marker]:hidden">
                <span className="flex items-center justify-between gap-3">
                  <span>Linki do podsumowania płatności</span>
                  <span className="text-xs font-medium text-zinc-600 group-open:hidden dark:text-zinc-400">Rozwiń</span>
                  <span className="hidden text-xs font-medium text-zinc-600 group-open:inline dark:text-zinc-400">Zwiń</span>
                </span>
                <span className="mt-1 block text-xs font-normal text-zinc-600 dark:text-zinc-400">
                  Wyślij zawodnikom link z podglądem sald — ostatni mecz lub zbiorcze salda wszystkich graczy.
                </span>
              </summary>
              <div className="px-4 pb-4">
                <div className="mt-1 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={publicLinkBusy}
                  onClick={() => void generatePublicLink("last_match_wallets")}
                >
                  {publicLinkCopied === "last_match_wallets" ? (
                    <Check className="mr-2 h-4 w-4" aria-hidden />
                  ) : (
                    <ClipboardCopy className="mr-2 h-4 w-4" aria-hidden />
                  )}
                  Ostatni mecz
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={publicLinkBusy}
                  onClick={() => void generatePublicLink("all_wallets")}
                >
                  {publicLinkCopied === "all_wallets" ? (
                    <Check className="mr-2 h-4 w-4" aria-hidden />
                  ) : (
                    <ClipboardCopy className="mr-2 h-4 w-4" aria-hidden />
                  )}
                  Zbiorczo — wszystkie salda
                </Button>
                </div>
              </div>
            </details>
            )
          ) : null}
    </>
  );

  return (
    <div>
      {!embedded ? (
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Portfele graczy</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Salda zarejestrowanych użytkowników i ręczne korekty — docelowe saldo zapisuje się jako transakcja korygująca
            w historii portfela.
          </p>
        </div>
      ) : (
        <div className="mx-auto max-w-4xl">
          <div className="relative overflow-hidden rounded-2xl border-2 border-white/35 text-white shadow-lg shadow-emerald-950/20 ring-1 ring-emerald-950/15">
            <div className="home-pitch-tile absolute inset-0" aria-hidden />
            <PitchCardDecorations />
            <div className="relative p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                <Image
                  src="/mundial-2026-logo.svg"
                  alt=""
                  width={56}
                  height={56}
                  className="h-12 w-12 drop-shadow-md sm:h-14 sm:w-14"
                  unoptimized
                />
                <div className="min-w-0 text-left">
                  <span className={pitchLabelClass}>Administrator</span>
                  <h2 className="mt-1 text-xl font-bold tracking-tight text-white drop-shadow-sm sm:text-2xl">
                    Portfele graczy
                  </h2>
                  <p className="mt-1 text-sm text-emerald-100/90">
                    Salda, doładowania po przelewie, korekty i linki do podsumowań.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {embedded ? (
        <div className="mx-auto max-w-4xl">
          <div className={cn(platnosciPanelClass, "mt-4 space-y-4")}>{walletPanels}</div>
        </div>
      ) : (
        <Card className="border-zinc-200/80 bg-white shadow-sm dark:border-zinc-700/80 dark:bg-zinc-900/90 dark:shadow-black/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Portfele graczy — saldo</CardTitle>
            <CardDescription>Najważniejszy podgląd sald i korekty ręczne.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">{walletPanels}</CardContent>
        </Card>
      )}
    </div>
  );
}
