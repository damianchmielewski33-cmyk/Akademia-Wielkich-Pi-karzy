"use client";

import { useRouter } from "next/navigation";
import { SiteAssetImage } from "@/components/site-asset-image";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Check, ClipboardCopy, Loader2, Search } from "lucide-react";
import { toast } from "@/lib/app-toast";
import { PlayerAvatar, PlayerNameStack } from "@/components/player-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdminCard, AdminToolbar, adminPanelInnerClass } from "@/components/admin-ui";
import { AdminFilterChips } from "@/components/admin-row-actions";
import { PitchCardDecorations, pitchLabelClass } from "@/components/ui/pitch-card";
import type { PlatnosciUserLite } from "@/components/platnosci-client";
import { cn } from "@/lib/utils";

type AdminWalletPlayerRow = PlatnosciUserLite & {
  balance_pln: number;
  admin_balance_pln?: number;
  operator_balance_pln?: number;
};

type PlayedMatchOption = {
  id: number;
  match_date: string;
  match_time: string;
  location: string;
  signed_up?: number;
  max_slots?: number;
  fee_pln?: number | null;
};

type AdminWalletOverview = {
  players: AdminWalletPlayerRow[];
  walletUsers?: (AdminWalletPlayerRow & { is_admin?: number })[];
  playedMatches?: PlayedMatchOption[];
};

const EMPTY_PLAYED_MATCHES: PlayedMatchOption[] = [];

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

function formatPlayedMatchLabel(m: PlayedMatchOption) {
  const [y, mo, d] = m.match_date.split("-");
  const date = y && mo && d ? `${d}.${mo}.${y}` : m.match_date;
  return `${date} · ${m.match_time} · ${m.location}`;
}

function localISODate(d = new Date()) {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
}

function addDaysISO(iso: string, days: number) {
  const [y, mo, d] = iso.split("-").map(Number);
  if (!y || !mo || !d) return iso;
  const dt = new Date(y, mo - 1, d);
  dt.setDate(dt.getDate() + days);
  return localISODate(dt);
}

type PlayedMatchPeriod = "all" | "7d" | "month" | "year";

const PLAYED_MATCH_PERIOD_OPTIONS: { id: PlayedMatchPeriod; label: string }[] = [
  { id: "all", label: "Wszystkie" },
  { id: "7d", label: "7 dni" },
  { id: "month", label: "Ten miesiąc" },
  { id: "year", label: "Ten rok" },
];

function matchInPlayedPeriod(m: PlayedMatchOption, period: PlayedMatchPeriod) {
  const date = m.match_date;
  if (!date) return false;
  if (period === "all") return true;
  const today = localISODate();
  if (period === "7d") return date >= addDaysISO(today, -6) && date <= today;
  if (period === "month") return date.slice(0, 7) === today.slice(0, 7);
  return date.slice(0, 4) === today.slice(0, 4);
}

function sortPlayedNewestFirst(list: PlayedMatchOption[]) {
  return [...list].sort((a, b) => {
    const ka = `${a.match_date}T${a.match_time}`;
    const kb = `${b.match_date}T${b.match_time}`;
    return kb.localeCompare(ka);
  });
}

function platnosciPanelClass(embedded: boolean) {
  return embedded
    ? "rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80 sm:p-5"
    : adminPanelInnerClass;
}

function platnosciCollapsibleClass(embedded: boolean) {
  return embedded
    ? "group overflow-hidden rounded-2xl border border-zinc-200/90 bg-zinc-50/90 dark:border-zinc-700 dark:bg-zinc-950/50"
    : "group overflow-hidden rounded-2xl border border-white/25 bg-black/10 backdrop-blur-sm";
}

function PlatnosciCollapsible({
  title,
  description,
  children,
  className,
  embedded = false,
}: {
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
  embedded?: boolean;
}) {
  return (
    <details className={cn(platnosciCollapsibleClass(embedded), className)}>
      <summary className={cn(
        "awp-focus-ring cursor-pointer list-none px-4 py-3 text-sm font-semibold [&::-webkit-details-marker]:hidden",
        embedded ? "text-emerald-950 dark:text-emerald-100" : "text-white"
      )}>
        <span className="flex items-center justify-between gap-3">
          <span>{title}</span>
          <span className={cn("text-xs font-medium group-open:hidden", embedded ? "text-zinc-600 dark:text-zinc-400" : "text-emerald-100/70")}>Rozwiń</span>
          <span className={cn("hidden text-xs font-medium group-open:inline", embedded ? "text-zinc-600 dark:text-zinc-400" : "text-emerald-100/70")}>Zwiń</span>
        </span>
        <span className={cn("mt-1 block text-xs font-normal", embedded ? "text-zinc-600 dark:text-zinc-400" : "pitch-muted")}>{description}</span>
      </summary>
      <div className="px-4 pb-4">{children}</div>
    </details>
  );
}

function filterWalletPlayers(players: AdminWalletPlayerRow[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return players.slice(0, 12);
  return players
    .filter((p) => {
      const key = `${p.first_name} ${p.last_name} ${p.zawodnik}`.toLowerCase();
      return key.includes(q);
    })
    .slice(0, 20);
}

function WalletPlayerPicker({
  players,
  selectedId,
  query,
  onQueryChange,
  onSelectId,
  onClearSelection,
  searchInputId,
  emptyHint,
}: {
  players: AdminWalletPlayerRow[];
  selectedId: number | null;
  query: string;
  onQueryChange: (q: string) => void;
  onSelectId: (id: number) => void;
  onClearSelection: () => void;
  searchInputId: string;
  emptyHint?: string;
}) {
  const selected = selectedId != null ? players.find((p) => p.id === selectedId) : undefined;
  const filtered = useMemo(() => filterWalletPlayers(players, query), [players, query]);
  const playerCardClass =
    "rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 dark:border-emerald-800/50 dark:bg-emerald-950/35";

  if (selected) {
    const b = Number(selected.balance_pln ?? 0);
    const neg = b < 0;
    const pos = b > 0;
    return (
      <div className={playerCardClass}>
        <div className="flex flex-wrap items-center gap-3">
          <PlayerAvatar
            photoPath={selected.profile_photo_path}
            firstName={selected.first_name}
            lastName={selected.last_name}
            size="md"
            ringClassName="ring-2 ring-emerald-300/90 dark:ring-emerald-600/70"
          />
          <div className="min-w-0 flex-1">
            <PlayerNameStack
              firstName={selected.first_name}
              lastName={selected.last_name}
              nick={selected.zawodnik}
              primaryClassName="text-base font-semibold text-emerald-950 dark:text-emerald-50"
              secondaryClassName="text-sm text-emerald-800/90 dark:text-emerald-200/80"
            />
            <p
              className={cn(
                "mt-1.5 text-sm font-semibold tabular-nums",
                neg ? "text-red-700 dark:text-red-300" : pos ? "text-emerald-800 dark:text-emerald-200" : "text-zinc-700 dark:text-zinc-300"
              )}
            >
              Obecne saldo: {formatPln(b)}
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={onClearSelection}>
            Zmień zawodnika
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={searchInputId} className="sr-only">
        Szukaj zawodnika
      </Label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" aria-hidden />
        <Input
          id={searchInputId}
          type="search"
          placeholder="Szukaj po imieniu, nazwisku lub pseudonimie…"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          autoComplete="off"
          className="pl-9"
        />
      </div>
      {players.length ? (
        <ul className="max-h-44 space-y-0 overflow-y-auto rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-950/50">
          {filtered.length ? (
            filtered.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 border-b border-zinc-100 px-3 py-2.5 text-left text-sm last:border-b-0 hover:bg-emerald-50 dark:border-zinc-800 dark:hover:bg-emerald-950/40"
                  onClick={() => {
                    onSelectId(p.id);
                    onQueryChange("");
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
                      <span className="ml-1 font-normal text-zinc-500 dark:text-zinc-400">({p.zawodnik})</span>
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
      ) : (
        <p className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50/80 px-3 py-2.5 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400">
          {emptyHint ?? "Brak zawodników na liście."}
        </p>
      )}
    </div>
  );
}

type AdminWalletsSaldoSectionProps = {
  /**
   * true: bez osobnego H1 — do osadzenia w /platnosci (obok innych kart).
   * false: pełny nagłówek (np. zakładka Portfele w panelu admina).
   */
  embedded?: boolean;
  /** Przyciski generowania linków publicznych (ostatni mecz, zbiorczo, wybrany mecz). */
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
  showPublicLinks,
  showTopUp,
}: AdminWalletsSaldoSectionProps) {
  const router = useRouter();
  const linksEnabled = showPublicLinks ?? !embedded;
  const topUpEnabled = showTopUp ?? !embedded;
  const [walletTab, setWalletTab] = useState<"balances" | "topup" | "adjust" | "links">("balances");
  const [adminOverview, setAdminOverview] = useState<AdminWalletOverview | null>(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminBalanceUserId, setAdminBalanceUserId] = useState<number | null>(null);
  const [adminBalanceUserQuery, setAdminBalanceUserQuery] = useState("");
  const [adminBalanceTarget, setAdminBalanceTarget] = useState("");
  const [adminBalanceNote, setAdminBalanceNote] = useState("");
  /** admin = gotówka/BLIK (G), operator = płatności online HotPay (O) */
  const [adminBalanceWalletKind, setAdminBalanceWalletKind] = useState<"admin" | "operator">("admin");
  const [adminBalanceSubmitting, setAdminBalanceSubmitting] = useState(false);
  const [topUpUserId, setTopUpUserId] = useState<number | null>(null);
  const [topUpUserQuery, setTopUpUserQuery] = useState("");
  const [topUpAmount, setTopUpAmount] = useState("");
  const [topUpNote, setTopUpNote] = useState("");
  const [topUpSubmitting, setTopUpSubmitting] = useState(false);
  const [topUpIsOperatorCorrection, setTopUpIsOperatorCorrection] = useState(false);
  const [topUpOperatorReason, setTopUpOperatorReason] = useState("");
  const [publicLinkBusy, setPublicLinkBusy] = useState(false);
  const [publicLinkCopied, setPublicLinkCopied] = useState<string | null>(null);
  const [playedMatchId, setPlayedMatchId] = useState<number | null>(null);
  const [playedMatchQuery, setPlayedMatchQuery] = useState("");
  const [playedMatchPeriod, setPlayedMatchPeriod] = useState<PlayedMatchPeriod>("all");

  async function refresh(opts?: { quiet?: boolean }) {
    if (!opts?.quiet) setAdminLoading(true);
    try {
      const r = await fetchJson<AdminWalletOverview>("/api/admin/wallet/overview");
      if (!r.ok) {
        if (!opts?.quiet) toast.error(r.error);
        return;
      }
      setAdminOverview(r.data);
      if (adminBalanceUserId === null && r.data.players?.length) {
        const first = r.data.players[0]!;
        setAdminBalanceUserId(first.id);
        setAdminBalanceUserQuery("");
      }
    } finally {
      if (!opts?.quiet) setAdminLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh({ quiet: true });
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh({ quiet: true });
    }, 30_000);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      window.clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const balancePlayerList = useMemo(
    () => adminOverview?.walletUsers ?? adminOverview?.players ?? [],
    [adminOverview]
  );

  const selectedBalancePlayer = useMemo(
    () => (adminBalanceUserId != null ? balancePlayerList.find((p) => p.id === adminBalanceUserId) : undefined),
    [balancePlayerList, adminBalanceUserId]
  );

  const selectedTopUpPlayer = useMemo(
    () => (topUpUserId != null ? balancePlayerList.find((p) => p.id === topUpUserId) : undefined),
    [balancePlayerList, topUpUserId]
  );

  const playedMatches = adminOverview?.playedMatches ?? EMPTY_PLAYED_MATCHES;
  const selectedPlayedMatch = useMemo(
    () => (playedMatchId != null ? playedMatches.find((m) => m.id === playedMatchId) : undefined),
    [playedMatches, playedMatchId]
  );
  const filteredPlayedMatches = useMemo(() => {
    const q = playedMatchQuery.trim().toLowerCase();
    const inPeriod = sortPlayedNewestFirst(playedMatches.filter((m) => matchInPlayedPeriod(m, playedMatchPeriod)));
    if (!q) return inPeriod;
    return inPeriod.filter((m) => formatPlayedMatchLabel(m).toLowerCase().includes(q));
  }, [playedMatches, playedMatchQuery, playedMatchPeriod]);

  async function generatePublicLink(
    kind: "last_match_wallets" | "all_wallets" | "match_wallets",
    matchId?: number
  ) {
    if (kind === "match_wallets" && !matchId) {
      toast.error("Wybierz rozegrany mecz");
      return;
    }
    setPublicLinkBusy(true);
    try {
      const r = await fetchJson<{ ok: true; token: string; path: string }>("/api/admin/wallet/public-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          expires_in_days: 30,
          ...(kind === "match_wallets" && matchId ? { match_id: matchId } : {}),
        }),
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      const url = `${window.location.origin}${r.data.path}`;
      await navigator.clipboard.writeText(url);
      setPublicLinkCopied(kind === "match_wallets" && matchId ? `match_wallets:${matchId}` : kind);
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
    if (topUpIsOperatorCorrection && !topUpOperatorReason.trim()) {
      toast.error("Podaj powód korekty portfela operatora");
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
          wallet_kind: topUpIsOperatorCorrection ? "operator" : "admin",
          ...(topUpIsOperatorCorrection ? { operator_correction_reason: topUpOperatorReason.trim() } : {}),
        }),
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(`Dodano ${formatPln(amount_pln)} do salda zawodnika`);
      setTopUpAmount("");
      setTopUpNote("");
      setTopUpIsOperatorCorrection(false);
      setTopUpOperatorReason("");
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
    if (adminBalanceWalletKind === "operator" && !adminBalanceNote.trim()) {
      toast.error("Przy korekcie portfela online podaj powód (np. na wniosek gracza)");
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
          wallet_kind: adminBalanceWalletKind,
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
        toast.success(
          adminBalanceWalletKind === "operator"
            ? "Ustawiono saldo online (korekta w historii)"
            : "Ustawiono saldo gotówka/BLIK (korekta w historii)"
        );
      }
      setAdminBalanceTarget("");
      setAdminBalanceNote("");
      await refresh();
      router.refresh();
    } finally {
      setAdminBalanceSubmitting(false);
    }
  }

  function selectSharedPlayer(id: number) {
    setTopUpUserId(id);
    setAdminBalanceUserId(id);
    setTopUpUserQuery("");
    setAdminBalanceUserQuery("");
  }

  function clearSharedPlayer() {
    setTopUpUserId(null);
    setAdminBalanceUserId(null);
    setTopUpUserQuery("");
    setAdminBalanceUserQuery("");
    setTopUpIsOperatorCorrection(false);
    setTopUpOperatorReason("");
    setAdminBalanceWalletKind("admin");
  }

  const topUpFormBody = (
    <>
      <section aria-labelledby="admin-topup-player-heading" className={cn(embedded ? "mt-1" : "mt-3")}>
        <p
          id="admin-topup-player-heading"
          className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-600 dark:text-zinc-400"
        >
          Zawodnik
        </p>
        <div className="mt-2">
          <WalletPlayerPicker
            players={balancePlayerList}
            selectedId={topUpUserId}
            query={topUpUserQuery}
            onQueryChange={setTopUpUserQuery}
            onSelectId={selectSharedPlayer}
            onClearSelection={clearSharedPlayer}
            searchInputId="admin-topup-user-search"
          />
        </div>
      </section>

      {selectedTopUpPlayer ? (
        <>
          <div className={cn("mt-4 grid gap-3 sm:grid-cols-2")}>
            <div>
              <Label htmlFor="admin-topup-amount">Kwota wpłaty (PLN)</Label>
              <Input
                id="admin-topup-amount"
                type="text"
                inputMode="decimal"
                placeholder="np. 50"
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="admin-topup-note">Opis (opcjonalnie)</Label>
              <Input
                id="admin-topup-note"
                type="text"
                placeholder="np. BLIK / gotówka od Jana"
                value={topUpNote}
                onChange={(e) => setTopUpNote(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <input
              id="admin-topup-operator-correction"
              type="checkbox"
              checked={topUpIsOperatorCorrection}
              onChange={(e) => {
                setTopUpIsOperatorCorrection(e.target.checked);
                if (!e.target.checked) setTopUpOperatorReason("");
              }}
              className="h-4 w-4 rounded border-zinc-300 text-amber-600 dark:border-zinc-600"
            />
            <Label htmlFor="admin-topup-operator-correction" className="cursor-pointer text-sm text-amber-900 dark:text-amber-200">
              Korekta portfela operatora (na wniosek gracza, w przypadku błędu)
            </Label>
          </div>
          {topUpIsOperatorCorrection && (
            <div className="mt-2">
              <Label htmlFor="admin-topup-operator-reason">
                Powód korekty portfela operatora <span className="text-red-600">*</span>
              </Label>
              <Input
                id="admin-topup-operator-reason"
                type="text"
                placeholder="np. anulowana płatność HotPay, ID sesji ..."
                value={topUpOperatorReason}
                onChange={(e) => setTopUpOperatorReason(e.target.value)}
                className="mt-1 border-amber-300 focus-visible:ring-amber-400 dark:border-amber-700"
              />
              <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">
                Korekta portfela operatora jest możliwa wyłącznie na wniosek gracza i wymaga uzasadnienia.
              </p>
            </div>
          )}
          <div className="mt-3">
            <Button type="button" disabled={topUpSubmitting} onClick={() => void adminTopUpWallet()}>
              {topUpSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
              Dodaj do salda
            </Button>
          </div>
        </>
      ) : (
        <p className="mt-3 rounded-lg border border-dashed border-zinc-200 bg-zinc-50/80 px-3 py-2.5 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400">
          Wyszukaj i wybierz zawodnika, aby dodać wpłatę do salda.
        </p>
      )}
    </>
  );

  const adjustFormBody = (
    <div className={cn("space-y-4", embedded ? "mt-1" : "mt-3")}>
      <section aria-labelledby="admin-balance-player-heading">
        <p
          id="admin-balance-player-heading"
          className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-600 dark:text-zinc-400"
        >
          Zawodnik
        </p>
        <div className="mt-2">
          <WalletPlayerPicker
            players={balancePlayerList}
            selectedId={adminBalanceUserId}
            query={adminBalanceUserQuery}
            onQueryChange={setAdminBalanceUserQuery}
            onSelectId={selectSharedPlayer}
            onClearSelection={clearSharedPlayer}
            searchInputId="admin-balance-user"
          />
        </div>
      </section>

      {selectedBalancePlayer ? (
        <section
          aria-labelledby="admin-balance-form-heading"
          className="rounded-xl border border-amber-200/90 bg-amber-50/60 p-4 dark:border-amber-800/50 dark:bg-amber-950/25"
        >
          <p
            id="admin-balance-form-heading"
            className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-900/80 dark:text-amber-200/90"
          >
            Docelowe saldo
          </p>
          <p className="mt-1 text-xs text-amber-950/75 dark:text-amber-100/75">
            Wybierz portfel i wpisz docelową kwotę — różnica trafi do historii jako korekta.
          </p>
          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Który portfel korygować">
            <Button
              type="button"
              size="sm"
              variant={adminBalanceWalletKind === "admin" ? "default" : "outline"}
              onClick={() => setAdminBalanceWalletKind("admin")}
            >
              Gotówka / BLIK (G)
            </Button>
            <Button
              type="button"
              size="sm"
              variant={adminBalanceWalletKind === "operator" ? "default" : "outline"}
              onClick={() => setAdminBalanceWalletKind("operator")}
            >
              Płatności online (O)
            </Button>
          </div>
          <p className="mt-2 text-xs tabular-nums text-amber-950/80 dark:text-amber-100/80">
            Aktualnie:{" "}
            <span className="font-semibold">
              {formatPln(
                adminBalanceWalletKind === "operator"
                  ? Number(selectedBalancePlayer.operator_balance_pln ?? 0)
                  : Number(selectedBalancePlayer.admin_balance_pln ?? selectedBalancePlayer.balance_pln ?? 0)
              )}
            </span>
            {" · "}łącznie {formatPln(Number(selectedBalancePlayer.balance_pln ?? 0))}
          </p>
          {adminBalanceWalletKind === "operator" ? (
            <p className="mt-2 rounded-lg border border-amber-300/80 bg-amber-100/70 px-3 py-2 text-xs text-amber-950 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-100">
              Korekta portfela online — tylko na wniosek gracza lub przy błędzie księgowania HotPay. Powód jest wymagany.
            </p>
          ) : null}
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
              <Label htmlFor="admin-balance-note">
                {adminBalanceWalletKind === "operator" ? (
                  <>
                    Powód korekty <span className="text-red-600">*</span>
                  </>
                ) : (
                  "Opis korekty (opcjonalnie)"
                )}
              </Label>
              <Input
                id="admin-balance-note"
                type="text"
                placeholder={
                  adminBalanceWalletKind === "operator"
                    ? "np. na wniosek gracza — błędne doładowanie HotPay"
                    : "np. korekta po gotówce"
                }
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

  function renderBalancesList() {
    const list = adminOverview?.walletUsers ?? adminOverview?.players ?? [];
    return (
      <>
        <div
          className={cn(
            "flex flex-wrap items-center justify-between gap-2",
            embedded && "border-t border-zinc-200 pt-4 dark:border-zinc-700"
          )}
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-800 dark:text-emerald-300">
              Lista sald
            </p>
            <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
              {list.length
                ? `Użytkowników: ${list.length} · G = gotówka/BLIK · O = online`
                : "—"}
              {adminLoading ? " · aktualizacja…" : ""}
            </p>
          </div>
        </div>
        {list.length ? (
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
                  {"admin_balance_pln" in p && ("operator_balance_pln" in p) ? (
                    <div className="flex shrink-0 flex-col items-end gap-0.5">
                      <span className="text-[10px] tabular-nums text-zinc-500 dark:text-zinc-400" title="Gotówka / BLIK">
                        G: {formatPln(Number((p as AdminWalletPlayerRow).admin_balance_pln ?? 0))}
                      </span>
                      <span className="text-[10px] tabular-nums text-zinc-500 dark:text-zinc-400" title="Płatności online">
                        O: {formatPln(Number((p as AdminWalletPlayerRow).operator_balance_pln ?? 0))}
                      </span>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 px-4 py-6 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950/30 dark:text-zinc-400">
            {adminLoading ? "Wczytywanie…" : "Brak danych do wyświetlenia."}
          </p>
        )}
      </>
    );
  }

  function renderPublicLinkButtons() {
    const matchCopied =
      playedMatchId != null && publicLinkCopied === `match_wallets:${playedMatchId}`;
    return (
      <div className="mt-1 space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="gold"
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

        <div className="space-y-2">
          <Label htmlFor="wallet-played-match-search">Rozegrany mecz</Label>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Wybierz dowolny rozegrany mecz i skopiuj link z podsumowaniem płatności tylko za ten termin.
            Lista jest od najnowszych.
          </p>
          {selectedPlayedMatch ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 dark:border-emerald-800/50 dark:bg-emerald-950/35">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-emerald-950 dark:text-emerald-50">
                    {formatPlayedMatchLabel(selectedPlayedMatch)}
                  </p>
                  {selectedPlayedMatch.signed_up != null && selectedPlayedMatch.max_slots != null ? (
                    <p className="mt-1 text-xs text-emerald-800/90 dark:text-emerald-200/80">
                      {selectedPlayedMatch.signed_up}/{selectedPlayedMatch.max_slots} zapisanych
                    </p>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => {
                    setPlayedMatchId(null);
                    setPlayedMatchQuery("");
                  }}
                >
                  Zmień mecz
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div
                className="flex flex-wrap gap-1.5"
                role="tablist"
                aria-label="Filtr rozegranych meczów"
              >
                {PLAYED_MATCH_PERIOD_OPTIONS.map((opt) => {
                  const active = playedMatchPeriod === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setPlayedMatchPeriod(opt.id)}
                      className={cn(
                        "rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors",
                        embedded
                          ? active
                            ? "border-emerald-500 bg-emerald-100 text-emerald-950 dark:border-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-50"
                            : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                          : active
                            ? "border-emerald-400/50 bg-emerald-500/25 text-white"
                            : "border-white/20 bg-black/10 text-emerald-100/80 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
                  aria-hidden
                />
                <Input
                  id="wallet-played-match-search"
                  type="search"
                  placeholder="Szukaj po dacie, godzinie lub miejscu…"
                  value={playedMatchQuery}
                  onChange={(e) => setPlayedMatchQuery(e.target.value)}
                  autoComplete="off"
                  className="pl-9"
                />
              </div>
              {playedMatches.length ? (
                <ul className="max-h-64 space-y-0 overflow-y-auto rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-950/50">
                  {filteredPlayedMatches.length ? (
                    filteredPlayedMatches.map((m) => (
                      <li key={m.id}>
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 border-b border-zinc-100 px-3 py-2.5 text-left text-sm last:border-b-0 hover:bg-emerald-50 dark:border-zinc-800 dark:hover:bg-emerald-950/40"
                          onClick={() => {
                            setPlayedMatchId(m.id);
                            setPlayedMatchQuery("");
                          }}
                        >
                          <span className="min-w-0 flex-1 truncate font-medium text-zinc-900 dark:text-zinc-100">
                            {formatPlayedMatchLabel(m)}
                          </span>
                        </button>
                      </li>
                    ))
                  ) : (
                    <li className="px-3 py-4 text-center text-xs text-zinc-500">
                      Brak rozegranych meczów w tym filtrze.
                    </li>
                  )}
                </ul>
              ) : (
                <p className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50/80 px-3 py-2.5 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400">
                  {adminLoading ? "Wczytywanie meczów…" : "Brak rozegranych meczów."}
                </p>
              )}
              {playedMatches.length > 0 && filteredPlayedMatches.length > 0 ? (
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  {filteredPlayedMatches.length}{" "}
                  {filteredPlayedMatches.length === 1
                    ? "mecz"
                    : filteredPlayedMatches.length < 5
                      ? "mecze"
                      : "meczów"}{" "}
                  · najnowsze na górze
                </p>
              ) : null}
            </>
          )}
          <Button
            type="button"
            variant="gold"
            disabled={publicLinkBusy || !playedMatchId}
            onClick={() => void generatePublicLink("match_wallets", playedMatchId ?? undefined)}
          >
            {matchCopied ? (
              <Check className="mr-2 h-4 w-4" aria-hidden />
            ) : (
              <ClipboardCopy className="mr-2 h-4 w-4" aria-hidden />
            )}
            Link podsumowania wybranego meczu
          </Button>
        </div>
      </div>
    );
  }

  const walletTabOptions = [
    { id: "balances" as const, label: "Salda" },
    ...(topUpEnabled ? [{ id: "topup" as const, label: "Doładuj" }] : []),
    { id: "adjust" as const, label: "Korekta" },
    ...(linksEnabled ? [{ id: "links" as const, label: "Linki" }] : []),
  ];

  const activeWalletTab =
    walletTabOptions.some((o) => o.id === walletTab) ? walletTab : "balances";

  return (
    <div>
      {!embedded ? (
        <AdminToolbar
          title="Portfele graczy"
          description="Salda graczy (G = gotówka/BLIK, O = online). Doładuj wpłatę albo ustaw docelowe saldo osobno dla każdego portfela."
          onReload={() => void refresh()}
          loading={adminLoading}
        />
      ) : (
        <div className="mx-auto max-w-4xl">
          <div className="relative overflow-hidden rounded-2xl border-2 border-white/35 text-white shadow-lg shadow-emerald-950/20 ring-1 ring-emerald-950/15">
            <div className="home-pitch-tile absolute inset-0" aria-hidden />
            <PitchCardDecorations />
            <div className="relative p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                <SiteAssetImage
                  asset="logo_header"
                  alt=""
                  width={56}
                  height={56}
                  className="h-12 w-12 drop-shadow-md sm:h-14 sm:w-14"
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
          <div className={cn(platnosciPanelClass(true), "mt-4 space-y-4")}>
            {topUpEnabled ? (
              <PlatnosciCollapsible
                embedded={embedded}
                className="mb-0"
                title="Doładuj saldo"
                description="Wpłata gotówką lub BLIK (portfel G). Zaznacz korektę operatora, jeśli trzeba poprawić saldo online (O)."
              >
                {topUpFormBody}
              </PlatnosciCollapsible>
            ) : null}

            <PlatnosciCollapsible
              embedded={embedded}
              className="mb-0"
              title="Ustaw saldo zawodnika"
              description="Korekta docelowego salda: Gotówka/BLIK (G) albo płatności online (O). Różnica trafia do historii jako „Korekta”."
            >
              {adjustFormBody}
            </PlatnosciCollapsible>

            {renderBalancesList()}

            {linksEnabled ? (
              <PlatnosciCollapsible
                embedded={embedded}
                className="mt-0"
                title="Linki do podsumowania płatności"
                description="Wyślij zawodnikom link z podglądem sald — ostatni mecz, zbiorczo albo dowolny rozegrany mecz."
              >
                {renderPublicLinkButtons()}
              </PlatnosciCollapsible>
            ) : null}
          </div>
        </div>
      ) : (
        <>
          <AdminFilterChips
            options={walletTabOptions}
            value={activeWalletTab}
            onChange={(id) => setWalletTab(id as typeof walletTab)}
            aria-label="Sekcja portfeli"
          />
          <AdminCard
            title={
              activeWalletTab === "topup"
                ? "Doładuj saldo"
                : activeWalletTab === "adjust"
                  ? "Korekta salda"
                  : activeWalletTab === "links"
                    ? "Linki publiczne"
                    : "Lista sald"
            }
            description={
              activeWalletTab === "topup"
                ? "Wpłata gotówką lub BLIK (portfel G). Zaznacz korektę operatora, jeśli trzeba poprawić saldo online (O)."
                : activeWalletTab === "adjust"
                  ? "Korekta docelowego salda: Gotówka/BLIK (G) albo płatności online (O). Różnica trafia do historii jako „Korekta”."
                  : activeWalletTab === "links"
                    ? "Wyślij zawodnikom link z podglądem sald — ostatni mecz, zbiorczo albo dowolny rozegrany mecz."
                    : "Podgląd sald: łącznie oraz G (gotówka/BLIK) i O (online)."
            }
          >
            <div className="space-y-4">
              {activeWalletTab === "balances" ? renderBalancesList() : null}
              {activeWalletTab === "topup" && topUpEnabled ? topUpFormBody : null}
              {activeWalletTab === "adjust" ? adjustFormBody : null}
              {activeWalletTab === "links" && linksEnabled ? renderPublicLinkButtons() : null}
            </div>
          </AdminCard>
        </>
      )}
    </div>
  );
}
