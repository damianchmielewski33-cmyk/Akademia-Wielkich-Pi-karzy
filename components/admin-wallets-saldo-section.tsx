"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Check, ClipboardCopy, PencilLine, PlusCircle, Search } from "lucide-react";
import { toast } from "@/lib/app-toast";
import { PlayerAvatar, PlayerNameStack } from "@/components/player-avatar";
import { LoadingIndicator } from "@/components/preloaders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdminCard, AdminToolbar, adminPanelInnerClass } from "@/components/admin-ui";
import { AdminFilterChips } from "@/components/admin-row-actions";
import { PhotoPanel } from "@/components/photo-panel";
import type { PlatnosciUserLite } from "@/components/platnosci-client";
import { MARKETPLACE_PITCH_PHOTOS } from "@/lib/marketplace-photos";
import { cn } from "@/lib/utils";

type AdminWalletPlayerRow = PlatnosciUserLite & {
  balance_pln: number;
  admin_balance_pln?: number;
  operator_balance_pln?: number;
};

type AdminPendingDepositRow = {
  id: number;
  user_id: number;
  amount_pln: number;
  created_by: "player" | "admin";
  status: "pending" | "completed" | "cancelled";
  wallet_kind: "admin" | "operator";
  note: string | null;
  player_declared_at: string | null;
  admin_confirmed_received_at: string | null;
  admin_declared_received_at: string | null;
  player_confirmed_amount_at: string | null;
  created_at: string;
  first_name: string;
  last_name: string;
  zawodnik: string;
  profile_photo_path: string | null;
};

type ManagedPublicLinkRow = {
  id: number;
  token: string;
  kind: "last_match_wallets" | "all_wallets" | "match_wallets" | "player_wallets" | "match_signup_fees";
  created_at: string;
  expires_at: string | null;
  revoked_at: string | null;
  match_id: number | null;
  user_id: number | null;
  path: string;
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
  pendingDeposits?: AdminPendingDepositRow[];
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
type TopUpMethod = "blik" | "cash";
type PendingDepositFilter = "all" | "player" | "admin" | "stale";

const PLAYED_MATCH_PERIOD_OPTIONS: { id: PlayedMatchPeriod; label: string }[] = [
  { id: "all", label: "Wszystkie" },
  { id: "7d", label: "7 dni" },
  { id: "month", label: "Ten miesiąc" },
  { id: "year", label: "Ten rok" },
];

const TOP_UP_METHOD_OPTIONS: { id: TopUpMethod; label: string; hint: string }[] = [
  { id: "blik", label: "BLIK", hint: "Wpłata BLIK na telefon" },
  { id: "cash", label: "Gotówka", hint: "Wpłata odebrana do ręki" },
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
  open,
  onOpenChange,
}: {
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
  embedded?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  return (
    <details
      className={cn(platnosciCollapsibleClass(embedded), className)}
      {...(open !== undefined ? { open } : {})}
      onToggle={
        onOpenChange
          ? (e) => {
              const next = (e.currentTarget as HTMLDetailsElement).open;
              if (open === undefined || next !== open) onOpenChange(next);
            }
          : undefined
      }
    >
      <summary className={cn(
        "awp-focus-ring cursor-pointer list-none px-4 py-3 text-sm font-semibold [&::-webkit-details-marker]:hidden",
        embedded ? "text-zinc-950 dark:text-zinc-50" : "text-white"
      )}>
        <span className="flex items-center justify-between gap-3">
          <span>{title}</span>
          <span className={cn("text-xs font-medium group-open:hidden", embedded ? "text-zinc-600 dark:text-zinc-400" : "text-zinc-500")}>Rozwiń</span>
          <span className={cn("hidden text-xs font-medium group-open:inline", embedded ? "text-zinc-600 dark:text-zinc-400" : "text-zinc-500")}>Zwiń</span>
        </span>
        <span className={cn("mt-1 block text-xs font-normal", embedded ? "text-zinc-600 dark:text-zinc-400" : "text-zinc-500")}>{description}</span>
      </summary>
      <div className="px-4 pb-4">{children}</div>
    </details>
  );
}

function filterWalletPlayers(players: AdminWalletPlayerRow[], query: string, limit = 80) {
  const q = query.trim().toLowerCase();
  if (!q) return players.slice(0, limit);
  return players
    .filter((p) => {
      const key = `${p.first_name} ${p.last_name} ${p.zawodnik}`.toLowerCase();
      return key.includes(q);
    })
    .slice(0, limit);
}

function playerWalletAmount(p: AdminWalletPlayerRow, kind: "admin" | "operator") {
  return kind === "operator"
    ? Number(p.operator_balance_pln ?? 0)
    : Number(p.admin_balance_pln ?? p.balance_pln ?? 0);
}

function balanceAmountClass(amount: number, zeroClass = "text-zinc-700 dark:text-zinc-300") {
  if (amount < 0) return "text-red-700 dark:text-red-300";
  if (amount > 0) return "text-emerald-800 dark:text-emerald-200";
  return zeroClass;
}

function formatAmountInput(n: number) {
  const v = Math.round(n * 100) / 100;
  return String(v).replace(".", ",");
}

function clampText(value: string, max: number) {
  const text = value.trim();
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 3)).trimEnd()}...`;
}

function parsePlnInput(raw: string) {
  const trimmed = String(raw).replace(/\u2212/g, "-").replace(",", ".").trim();
  if (!trimmed || trimmed === "-") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

function togglePlnSign(raw: string) {
  const value = String(raw);
  if (!value.trim() || value.trim() === "-") return value.startsWith("-") ? "" : "-";
  const minus = value.match(/^\s*-/);
  if (minus) return value.slice(minus[0].length);
  return `-${value.replace(/^\s+/, "")}`;
}

function topUpMethodLabel(method: TopUpMethod) {
  return method === "blik" ? "BLIK" : "gotówka";
}

function formatDateTimeLabel(raw: string | null | undefined) {
  if (!raw) return "—";
  const dt = new Date(raw.includes("T") ? raw : raw.replace(" ", "T"));
  if (Number.isNaN(dt.getTime())) return raw;
  return dt.toLocaleString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isPendingDepositStale(raw: string | null | undefined) {
  if (!raw) return false;
  const dt = new Date(raw.includes("T") ? raw : raw.replace(" ", "T"));
  if (Number.isNaN(dt.getTime())) return false;
  return Date.now() - dt.getTime() >= 24 * 60 * 60 * 1000;
}

function publicLinkKindLabel(kind: ManagedPublicLinkRow["kind"]) {
  if (kind === "all_wallets") return "Wszystkie salda";
  if (kind === "match_wallets") return "Wybrany mecz";
  if (kind === "player_wallets") return "Jeden zawodnik";
  if (kind === "match_signup_fees") return "Opłata meczu";
  return "Ostatni mecz";
}

function buildAdminTopUpNote(method: TopUpMethod, note: string) {
  const base = method === "blik" ? "Wpłata BLIK u admina" : "Wpłata gotówką u admina";
  const extra = note.trim();
  return clampText(extra ? `${base} · ${extra}` : base, 200);
}

function TopUpMethodPicker({
  value,
  onChange,
}: {
  value: TopUpMethod;
  onChange: (value: TopUpMethod) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2" role="group" aria-label="Sposób wpłaty">
      {TOP_UP_METHOD_OPTIONS.map((opt) => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            aria-pressed={active}
            className={cn(
              "rounded-xl border px-3 py-3 text-left transition-colors",
              active
                ? "border-teal-500 bg-white shadow-sm dark:border-teal-400 dark:bg-zinc-950"
                : "border-zinc-200 bg-zinc-50/70 hover:bg-white dark:border-zinc-700 dark:bg-zinc-900/60 dark:hover:bg-zinc-950"
            )}
          >
            <span className="block text-sm font-semibold text-zinc-950 dark:text-zinc-50">{opt.label}</span>
            <span className="mt-1 block text-[11px] text-zinc-500 dark:text-zinc-400">{opt.hint}</span>
          </button>
        );
      })}
    </div>
  );
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
  keepList = false,
  showWalletSplit = false,
}: {
  players: AdminWalletPlayerRow[];
  selectedId: number | null;
  query: string;
  onQueryChange: (q: string) => void;
  onSelectId: (id: number) => void;
  onClearSelection: () => void;
  searchInputId: string;
  emptyHint?: string;
  keepList?: boolean;
  showWalletSplit?: boolean;
}) {
  const selected = selectedId != null ? players.find((p) => p.id === selectedId) : undefined;
  const filtered = useMemo(() => filterWalletPlayers(players, query), [players, query]);
  const playerCardClass =
    "rounded-xl border border-teal-200 bg-teal-50/80 p-3 dark:border-teal-800/50 dark:bg-teal-950/35";

  const selectedCard = selected ? (
    <div className={playerCardClass}>
      <div className="flex flex-wrap items-center gap-3">
        <PlayerAvatar
          photoPath={selected.profile_photo_path}
          firstName={selected.first_name}
          lastName={selected.last_name}
          size="md"
          ringClassName="ring-2 ring-teal-300/90 dark:ring-teal-600/70"
        />
        <div className="min-w-0 flex-1">
          <PlayerNameStack
            firstName={selected.first_name}
            lastName={selected.last_name}
            nick={selected.zawodnik}
            primaryClassName="text-base font-semibold text-zinc-950 dark:text-zinc-50"
            secondaryClassName="text-sm text-zinc-600 dark:text-zinc-300"
          />
          {showWalletSplit ? (
            <>
              <p
                className={cn(
                  "mt-1.5 text-sm font-semibold tabular-nums",
                  balanceAmountClass(Number(selected.balance_pln ?? 0))
                )}
              >
                Saldo łącznie: {formatPln(Number(selected.balance_pln ?? 0))}
              </p>
              <p className="mt-1 text-xs font-medium tabular-nums text-zinc-700 dark:text-zinc-300">
                G {formatPln(playerWalletAmount(selected, "admin"))}
                <span className="mx-1.5 text-zinc-400">·</span>
                O {formatPln(playerWalletAmount(selected, "operator"))}
              </p>
            </>
          ) : (
            <p className={cn("mt-1.5 text-sm font-semibold tabular-nums", balanceAmountClass(Number(selected.balance_pln ?? 0)))}>
              Obecne saldo: {formatPln(Number(selected.balance_pln ?? 0))}
            </p>
          )}
        </div>
        <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={onClearSelection}>
          Wyczyść wybór
        </Button>
      </div>
    </div>
  ) : null;

  if (selected && !keepList) {
    return selectedCard;
  }

  return (
    <div className="space-y-2">
      {selectedCard}
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
        <ul className="max-h-56 space-y-0 overflow-y-auto rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-950/50">
          {filtered.length ? (
            filtered.map((p) => {
              const isActive = selectedId === p.id;
              const totalBalance = Number(p.balance_pln ?? 0);
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    aria-pressed={isActive}
                    className={cn(
                      "flex w-full items-center gap-2 border-b border-zinc-100 px-3 py-2.5 text-left text-sm last:border-b-0 dark:border-zinc-800",
                      isActive
                        ? "bg-teal-100/90 dark:bg-teal-950/60"
                        : "hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                    )}
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
                    {showWalletSplit ? (
                      <span className="flex shrink-0 flex-col items-end gap-0.5 text-[11px] font-semibold tabular-nums">
                        <span className={balanceAmountClass(totalBalance, "text-zinc-700 dark:text-zinc-300")}>
                          Suma {formatPln(totalBalance)}
                        </span>
                        <span className="text-zinc-600 dark:text-zinc-300">G {formatPln(playerWalletAmount(p, "admin"))}</span>
                        <span className="text-zinc-600 dark:text-zinc-300">O {formatPln(playerWalletAmount(p, "operator"))}</span>
                      </span>
                    ) : (
                      <span className={cn("shrink-0 text-xs font-semibold tabular-nums", balanceAmountClass(totalBalance))}>
                        {formatPln(totalBalance)}
                      </span>
                    )}
                    {"is_admin" in p && Number((p as { is_admin?: number }).is_admin ?? 0) ? (
                      <span className="shrink-0 text-[10px] font-bold uppercase text-zinc-500">Admin</span>
                    ) : null}
                  </button>
                </li>
              );
            })
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
  const [walletTab, setWalletTab] = useState<"balances" | "pending" | "topup" | "adjust" | "links">("balances");
  const [adminOverview, setAdminOverview] = useState<AdminWalletOverview | null>(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const [pendingDepositFilter, setPendingDepositFilter] = useState<PendingDepositFilter>("all");
  const [pendingBusyId, setPendingBusyId] = useState<number | null>(null);
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
  const [topUpMethod, setTopUpMethod] = useState<TopUpMethod>("blik");
  const [topUpNote, setTopUpNote] = useState("");
  const [topUpSubmitting, setTopUpSubmitting] = useState(false);
  const [quickTopUpAmount, setQuickTopUpAmount] = useState("");
  const [quickTopUpMethod, setQuickTopUpMethod] = useState<TopUpMethod>("blik");
  const [quickTopUpNote, setQuickTopUpNote] = useState("");
  const [quickTopUpSubmitting, setQuickTopUpSubmitting] = useState(false);
  const [publicLinkBusy, setPublicLinkBusy] = useState(false);
  const [publicLinkCopied, setPublicLinkCopied] = useState<string | null>(null);
  const [publicLinks, setPublicLinks] = useState<ManagedPublicLinkRow[]>([]);
  const [playedMatchId, setPlayedMatchId] = useState<number | null>(null);
  const [playedMatchQuery, setPlayedMatchQuery] = useState("");
  const [playedMatchPeriod, setPlayedMatchPeriod] = useState<PlayedMatchPeriod>("all");
  const [topUpSectionOpen, setTopUpSectionOpen] = useState(false);
  const [adjustSectionOpen, setAdjustSectionOpen] = useState(false);

  async function refresh(opts?: { quiet?: boolean }) {
    if (!opts?.quiet) setAdminLoading(true);
    try {
      const r = await fetchJson<AdminWalletOverview>("/api/admin/wallet/overview");
      if (!r.ok) {
        if (!opts?.quiet) toast.error(r.error);
        return;
      }
      setAdminOverview(r.data);
    } finally {
      if (!opts?.quiet) setAdminLoading(false);
    }
  }

  async function refreshPublicLinks(opts?: { quiet?: boolean }) {
    const r = await fetchJson<{ links?: ManagedPublicLinkRow[] }>("/api/admin/wallet/public-links");
    if (!r.ok) {
      if (!opts?.quiet) toast.error(r.error);
      return;
    }
    setPublicLinks(Array.isArray(r.data.links) ? r.data.links : []);
  }

  useEffect(() => {
    void refresh();
    void refreshPublicLinks({ quiet: true });
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void refresh({ quiet: true });
        void refreshPublicLinks({ quiet: true });
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refresh({ quiet: true });
        void refreshPublicLinks({ quiet: true });
      }
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
  const pendingDeposits = adminOverview?.pendingDeposits ?? [];
  const filteredPendingDeposits = useMemo(() => {
    if (pendingDepositFilter === "player") return pendingDeposits.filter((d) => d.created_by === "player");
    if (pendingDepositFilter === "admin") return pendingDeposits.filter((d) => d.created_by === "admin");
    if (pendingDepositFilter === "stale") return pendingDeposits.filter((d) => isPendingDepositStale(d.created_at));
    return pendingDeposits;
  }, [pendingDeposits, pendingDepositFilter]);

  const currentAdjustAmount = selectedBalancePlayer
    ? playerWalletAmount(selectedBalancePlayer, adminBalanceWalletKind)
    : 0;
  const parsedAdjustTarget = parsePlnInput(adminBalanceTarget);
  const adjustDelta =
    selectedBalancePlayer && parsedAdjustTarget != null
      ? Math.round((parsedAdjustTarget - currentAdjustAmount) * 100) / 100
      : null;

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
          expires_in_days: 7,
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
      toast.success("Skopiowano link do schowka (ważny domyślnie 7 dni)");
      setTimeout(() => setPublicLinkCopied(null), 2000);
      await refreshPublicLinks({ quiet: true });
    } catch {
      toast.error("Nie udało się skopiować linku");
    } finally {
      setPublicLinkBusy(false);
    }
  }

  async function copyExistingPublicLink(row: ManagedPublicLinkRow) {
    try {
      const url = `${window.location.origin}${row.path}`;
      await navigator.clipboard.writeText(url);
      setPublicLinkCopied(row.token);
      toast.success("Skopiowano aktywny link");
      setTimeout(() => setPublicLinkCopied(null), 2000);
    } catch {
      toast.error("Nie udało się skopiować linku");
    }
  }

  async function revokePublicLink(token: string) {
    setPublicLinkBusy(true);
    try {
      const r = await fetchJson<{ ok: true }>("/api/admin/wallet/public-links", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Unieważniono link publiczny");
      await refreshPublicLinks({ quiet: true });
    } finally {
      setPublicLinkBusy(false);
    }
  }

  async function confirmPendingDeposit(id: number) {
    setPendingBusyId(id);
    try {
      const r = await fetchJson<{ ok: true }>(`/api/admin/wallet/deposits/${id}/confirm`, {
        method: "POST",
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Wpłata potwierdzona");
      await refresh({ quiet: true });
      router.refresh();
    } finally {
      setPendingBusyId(null);
    }
  }

  async function cancelPendingDeposit(id: number) {
    setPendingBusyId(id);
    try {
      const r = await fetchJson<{ ok: true }>(`/api/admin/wallet/deposits/${id}/cancel`, {
        method: "POST",
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Wpłata została anulowana");
      await refresh({ quiet: true });
      router.refresh();
    } finally {
      setPendingBusyId(null);
    }
  }

  async function submitAdminTopUp(args: {
    userId: number;
    amountRaw: string;
    method: TopUpMethod;
    note: string;
  }) {
    const amount_pln = parsePlnInput(args.amountRaw);
    if (amount_pln == null || amount_pln <= 0) {
      toast.error("Podaj prawidłową kwotę");
      return false;
    }

    const r = await fetchJson<{ ok: true; id: number }>("/api/admin/wallet/deposits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: args.userId,
        amount_pln,
        note: buildAdminTopUpNote(args.method, args.note),
        wallet_kind: "admin",
      }),
    });
    if (!r.ok) {
      toast.error(r.error);
      return false;
    }

    toast.success(`Dodano ${formatPln(amount_pln)} do salda zawodnika (${topUpMethodLabel(args.method)})`);
    await refresh();
    router.refresh();
    return true;
  }

  async function adminTopUpWallet() {
    const user_id = topUpUserId;
    if (!user_id) {
      toast.error("Wybierz zawodnika");
      return;
    }
    setTopUpSubmitting(true);
    try {
      const ok = await submitAdminTopUp({
        userId: user_id,
        amountRaw: topUpAmount,
        method: topUpMethod,
        note: topUpNote,
      });
      if (!ok) return;
      setTopUpAmount("");
      setTopUpMethod("blik");
      setTopUpNote("");
    } finally {
      setTopUpSubmitting(false);
    }
  }

  async function adminTopUpSelectedPlayer() {
    const user_id = adminBalanceUserId;
    if (!user_id) {
      toast.error("Wybierz zawodnika");
      return;
    }
    setQuickTopUpSubmitting(true);
    try {
      const ok = await submitAdminTopUp({
        userId: user_id,
        amountRaw: quickTopUpAmount,
        method: quickTopUpMethod,
        note: quickTopUpNote,
      });
      if (!ok) return;
      setQuickTopUpAmount("");
      setQuickTopUpNote("");
    } finally {
      setQuickTopUpSubmitting(false);
    }
  }

  async function adminSetWalletBalance() {
    const user_id = adminBalanceUserId;
    const balance_pln = parsePlnInput(adminBalanceTarget);
    if (!user_id) {
      toast.error("Wybierz zawodnika");
      return;
    }
    if (balance_pln == null) {
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
      setAdminBalanceTarget(formatAmountInput(balance_pln));
      setAdminBalanceNote("");
      await refresh();
      router.refresh();
    } finally {
      setAdminBalanceSubmitting(false);
    }
  }

  function selectTopUpPlayer(id: number) {
    setTopUpUserId(id);
    setTopUpUserQuery("");
    setTopUpAmount("");
    setTopUpMethod("blik");
    setTopUpNote("");
  }

  function clearTopUpPlayer() {
    setTopUpUserId(null);
    setTopUpUserQuery("");
    setTopUpAmount("");
    setTopUpMethod("blik");
    setTopUpNote("");
  }

  function applyAdjustTargetFromPlayer(player: AdminWalletPlayerRow, kind: "admin" | "operator") {
    setAdminBalanceTarget(formatAmountInput(playerWalletAmount(player, kind)));
  }

  function selectAdjustPlayer(id: number) {
    setAdminBalanceUserId(id);
    setAdminBalanceUserQuery("");
    setQuickTopUpAmount("");
    setQuickTopUpMethod("blik");
    setQuickTopUpNote("");
    const player = balancePlayerList.find((p) => p.id === id);
    if (player) applyAdjustTargetFromPlayer(player, adminBalanceWalletKind);
  }

  function clearAdjustPlayer() {
    setAdminBalanceUserId(null);
    setAdminBalanceUserQuery("");
    setAdminBalanceTarget("");
    setAdminBalanceNote("");
    setAdminBalanceWalletKind("admin");
    setQuickTopUpAmount("");
    setQuickTopUpMethod("blik");
    setQuickTopUpNote("");
  }

  function startBalanceCorrection(id: number) {
    selectAdjustPlayer(id);
    setWalletTab("adjust");
    setAdjustSectionOpen(true);
    window.setTimeout(() => {
      document.getElementById("admin-adjust-saldo")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }

  function startTopUpForPlayer(id: number) {
    selectTopUpPlayer(id);
    setWalletTab("topup");
    setTopUpSectionOpen(true);
    window.setTimeout(() => {
      document.getElementById("admin-wallet-topup")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }

  function changeAdjustWalletKind(kind: "admin" | "operator") {
    setAdminBalanceWalletKind(kind);
    if (selectedBalancePlayer) applyAdjustTargetFromPlayer(selectedBalancePlayer, kind);
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
            onSelectId={selectTopUpPlayer}
            onClearSelection={clearTopUpPlayer}
            searchInputId="admin-topup-user-search"
          />
        </div>
      </section>

      {selectedTopUpPlayer ? (
        <>
          <div className={cn("mt-4 grid gap-3 sm:grid-cols-2")}>
            <div className="sm:col-span-2">
              <Label>Sposób wpłaty</Label>
              <div className="mt-1">
                <TopUpMethodPicker value={topUpMethod} onChange={setTopUpMethod} />
              </div>
            </div>
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
                placeholder={
                  topUpMethod === "blik"
                    ? "np. dopłata po treningu"
                    : "np. gotówka po meczu"
                }
                value={topUpNote}
                onChange={(e) => setTopUpNote(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-xs text-emerald-900 dark:border-emerald-800/50 dark:bg-emerald-950/35 dark:text-emerald-100">
            Ta akcja księguje zwykłą wpłatę od zawodnika do portfela G (gotówka / BLIK). Admin wpisuje otrzymaną kwotę i saldo zwiększa się o tę wpłatę.
          </p>
          <div className="mt-3">
            <Button type="button" disabled={topUpSubmitting} onClick={() => void adminTopUpWallet()}>
              {topUpSubmitting ? <LoadingIndicator variant="button" size="sm" className="mr-2" /> : null}
              Zaksięguj wpłatę {topUpMethod === "blik" ? "BLIK" : "gotówką"}
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
        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
          Nikt nie jest wybrany z góry — wyszukaj osobę i popraw saldo tylko wtedy, gdy zwykła wpłata nie wystarcza.
        </p>
        <div className="mt-2">
          <WalletPlayerPicker
            players={balancePlayerList}
            selectedId={adminBalanceUserId}
            query={adminBalanceUserQuery}
            onQueryChange={setAdminBalanceUserQuery}
            onSelectId={selectAdjustPlayer}
            onClearSelection={clearAdjustPlayer}
            searchInputId="admin-balance-user"
            keepList
            showWalletSplit
          />
        </div>
      </section>

      {selectedBalancePlayer ? (
        <>
        <section className="rounded-xl border border-emerald-200/90 bg-emerald-50/70 p-4 dark:border-emerald-800/50 dark:bg-emerald-950/25">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-900/80 dark:text-emerald-200/90">
            Wpłata do salda zawodnika
          </p>
          <p className="mt-1 text-xs text-emerald-950/75 dark:text-emerald-100/75">
            Wybierz <span className="font-semibold">BLIK</span> albo <span className="font-semibold">gotówkę</span>, wpisz ile admin faktycznie otrzymał i ta kwota zwiększy portfel <span className="font-semibold">G</span>.
          </p>
          <div className="mt-3">
            <TopUpMethodPicker value={quickTopUpMethod} onChange={setQuickTopUpMethod} />
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="admin-adjust-topup-amount">Kwota otrzymanej wpłaty (PLN)</Label>
              <Input
                id="admin-adjust-topup-amount"
                type="text"
                inputMode="decimal"
                placeholder="np. 50"
                value={quickTopUpAmount}
                onChange={(e) => setQuickTopUpAmount(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="admin-adjust-topup-note">Opis (opcjonalnie)</Label>
              <Input
                id="admin-adjust-topup-note"
                type="text"
                placeholder={
                  quickTopUpMethod === "blik"
                    ? "np. dopłata za ostatni mecz"
                    : "np. rozliczenie po treningu"
                }
                value={quickTopUpNote}
                onChange={(e) => setQuickTopUpNote(e.target.value)}
                className="mt-1 bg-white dark:bg-zinc-950"
              />
            </div>
          </div>
          <p className="mt-3 rounded-lg border border-emerald-300/80 bg-white/80 px-3 py-2 text-xs text-emerald-950 dark:border-emerald-700/60 dark:bg-zinc-950/60 dark:text-emerald-100">
            To nie ustawia salda "na sztywno" - tylko dopisuje realnie otrzymaną wpłatę do historii. Jeśli chcesz ręcznie poprawić stan portfela, użyj sekcji korekty poniżej.
          </p>
          <div className="mt-4">
            <Button
              type="button"
              disabled={quickTopUpSubmitting}
              onClick={() => void adminTopUpSelectedPlayer()}
            >
              {quickTopUpSubmitting ? <LoadingIndicator variant="button" size="sm" className="mr-2" /> : null}
              Dodaj wpłatę {quickTopUpMethod === "blik" ? "BLIK" : "gotówką"}
            </Button>
          </div>
        </section>
        <section
          aria-labelledby="admin-balance-form-heading"
          className="rounded-xl border border-amber-200/90 bg-amber-50/60 p-4 dark:border-amber-800/50 dark:bg-amber-950/25"
        >
          <p
            id="admin-balance-form-heading"
            className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-900/80 dark:text-amber-200/90"
          >
            Korekta portfela
          </p>
          <p className="mt-1 text-xs text-amber-950/75 dark:text-amber-100/75">
            Tę sekcję traktuj wyjątkowo: zwykłe wpłaty księguj w „Dodaj wpłatę”, a tutaj tylko ręcznie poprawiaj błędne saldo.
          </p>
          <div className="mt-3 rounded-lg border border-amber-300/80 bg-white/80 px-3 py-2 text-xs text-amber-950 dark:border-amber-700/60 dark:bg-zinc-950/60 dark:text-amber-100">
            <span className="font-semibold">Biznesowo:</span> portfel <span className="font-semibold">G</span> to gotówka / BLIK od admina, a portfel <span className="font-semibold">O</span> to płatności online. Korekta <span className="font-semibold">O</span> powinna być używana tylko przy błędzie lub na wyraźny wniosek gracza.
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2" role="group" aria-label="Który portfel korygować">
            <button
              type="button"
              onClick={() => changeAdjustWalletKind("admin")}
              className={cn(
                "rounded-xl border px-3 py-3 text-left transition-colors",
                adminBalanceWalletKind === "admin"
                  ? "border-teal-500 bg-white shadow-sm dark:border-teal-400 dark:bg-zinc-950"
                  : "border-amber-200/80 bg-amber-50/40 hover:bg-white/80 dark:border-amber-800/40 dark:bg-transparent dark:hover:bg-zinc-950/40"
              )}
            >
              <span className="block text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Gotówka / BLIK</span>
              <span className="mt-1 block text-lg font-bold tabular-nums text-zinc-950 dark:text-zinc-50">
                {formatPln(playerWalletAmount(selectedBalancePlayer, "admin"))}
              </span>
              <span className="text-[11px] text-zinc-500">Portfel G</span>
            </button>
            <button
              type="button"
              onClick={() => changeAdjustWalletKind("operator")}
              className={cn(
                "rounded-xl border px-3 py-3 text-left transition-colors",
                adminBalanceWalletKind === "operator"
                  ? "border-teal-500 bg-white shadow-sm dark:border-teal-400 dark:bg-zinc-950"
                  : "border-amber-200/80 bg-amber-50/40 hover:bg-white/80 dark:border-amber-800/40 dark:bg-transparent dark:hover:bg-zinc-950/40"
              )}
            >
              <span className="block text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Płatności online</span>
              <span className="mt-1 block text-lg font-bold tabular-nums text-zinc-950 dark:text-zinc-50">
                {formatPln(playerWalletAmount(selectedBalancePlayer, "operator"))}
              </span>
              <span className="text-[11px] text-zinc-500">Portfel O</span>
            </button>
          </div>
          {adminBalanceWalletKind === "operator" ? (
            <p className="mt-3 rounded-lg border border-amber-300/80 bg-amber-100/70 px-3 py-2 text-xs text-amber-950 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-100">
              Korekta portfela online — tylko na wniosek gracza lub przy błędzie księgowania HotPay. Powód jest wymagany.
            </p>
          ) : null}
          <div className="mt-3">
            <Label htmlFor="admin-balance-target">Nowe saldo (PLN)</Label>
            <Input
              id="admin-balance-target"
              type="text"
              inputMode="text"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder="np. -20 albo 120,00"
              value={adminBalanceTarget}
              onChange={(e) => setAdminBalanceTarget(e.target.value.replace(/\u2212/g, "-"))}
              className="mt-1 h-14 border-amber-300/80 bg-white text-xl font-semibold tabular-nums dark:border-amber-700/60 dark:bg-zinc-950"
            />
            <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
              Ujemne saldo oznacza niedopłatę, dodatnie nadwyżkę. Wpisz minus albo użyj przycisku „+/−”.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setAdminBalanceTarget((prev) => togglePlnSign(prev))}
              >
                +/−
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setAdminBalanceTarget("0")}
              >
                Wyzeruj
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => applyAdjustTargetFromPlayer(selectedBalancePlayer, adminBalanceWalletKind)}
              >
                Przywróć obecne
              </Button>
            </div>
            {adjustDelta != null ? (
              <p
                className={cn(
                  "mt-2 text-sm font-semibold tabular-nums",
                  adjustDelta < 0
                    ? "text-red-700 dark:text-red-300"
                    : adjustDelta > 0
                      ? "text-emerald-800 dark:text-emerald-200"
                      : "text-zinc-600 dark:text-zinc-400"
                )}
              >
                {formatPln(currentAdjustAmount)} → {formatPln(parsedAdjustTarget ?? currentAdjustAmount)}
                {adjustDelta === 0
                  ? " · bez zmian"
                  : ` · korekta ${adjustDelta > 0 ? "+" : ""}${formatPln(adjustDelta)}`}
              </p>
            ) : (
              <p className="mt-2 text-xs text-zinc-500">Wpisz docelową kwotę, żeby zobaczyć różnicę.</p>
            )}
          </div>
          <div className="mt-3">
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
          <div className="mt-4">
            <Button
              type="button"
              disabled={
                adminBalanceSubmitting ||
                parsedAdjustTarget == null ||
                adjustDelta === 0
              }
              onClick={() => void adminSetWalletBalance()}
            >
              {adminBalanceSubmitting ? <LoadingIndicator variant="button" size="sm" className="mr-2" /> : null}
              Zapisz korektę
            </Button>
          </div>
        </section>
        </>
      ) : (
        <p className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50/80 px-3 py-2.5 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400">
          Wybierz zawodnika z listy powyżej albo przyciskiem „Koryguj” na liście sald.
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
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--mp-teal-dark)] dark:text-teal-300">
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
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {topUpEnabled ? (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => startTopUpForPlayer(p.id)}
                      >
                        <PlusCircle className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                        Wpłata
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => startBalanceCorrection(p.id)}
                    >
                      <PencilLine className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                      Koryguj
                    </Button>
                  </div>
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
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return (
      <div className="mt-1 space-y-4">
        <p className="rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2 text-xs text-amber-950 dark:border-amber-800/50 dark:bg-amber-950/25 dark:text-amber-100">
          Linki publiczne wygasają domyślnie po 7 dniach. Dla prywatności możesz je też niżej ręcznie unieważnić.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="default"
            className="rounded-full font-bold"
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
                            ? "border-[var(--mp-teal)] bg-teal-50 text-[var(--mp-teal-dark)] dark:border-teal-600 dark:bg-teal-900/50 dark:text-teal-50"
                            : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                          : active
                            ? "border-emerald-400/50 bg-emerald-500/25 text-white"
                            : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-[var(--mp-teal)]/40 hover:bg-teal-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
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
            variant="default"
            className="rounded-full font-bold"
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

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-600 dark:text-zinc-400">
            Aktywne linki
          </p>
          {publicLinks.length ? (
            <ul className="space-y-2">
              {publicLinks.map((row) => (
                <li
                  key={row.token}
                  className="rounded-xl border border-zinc-200 bg-white/80 px-3 py-3 text-sm dark:border-zinc-700 dark:bg-zinc-950/60"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-zinc-950 dark:text-zinc-50">{publicLinkKindLabel(row.kind)}</p>
                      <p className="mt-0.5 break-all text-[11px] text-zinc-500 dark:text-zinc-400">
                        {origin}
                        {row.path}
                      </p>
                      <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                        Utworzono: {formatDateTimeLabel(row.created_at)} · Wygasa: {formatDateTimeLabel(row.expires_at)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={publicLinkBusy}
                        onClick={() => void copyExistingPublicLink(row)}
                      >
                        {publicLinkCopied === row.token ? <Check className="mr-1.5 h-3.5 w-3.5" aria-hidden /> : <ClipboardCopy className="mr-1.5 h-3.5 w-3.5" aria-hidden />}
                        Kopiuj
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={publicLinkBusy}
                        onClick={() => void revokePublicLink(row.token)}
                      >
                        Unieważnij
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50/80 px-3 py-2.5 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400">
              Brak aktywnych linków publicznych.
            </p>
          )}
        </div>
      </div>
    );
  }

  function renderPendingDeposits() {
    const filters: { id: PendingDepositFilter; label: string }[] = [
      { id: "all", label: `Wszystkie (${pendingDeposits.length})` },
      { id: "player", label: "Od graczy" },
      { id: "admin", label: "Od admina" },
      { id: "stale", label: "Starsze niż 24h" },
    ];

    return (
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {filters.map((f) => {
            const active = pendingDepositFilter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setPendingDepositFilter(f.id)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors",
                  active
                    ? "border-[var(--mp-teal)] bg-teal-50 text-[var(--mp-teal-dark)] dark:border-teal-600 dark:bg-teal-900/50 dark:text-teal-50"
                    : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                )}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {filteredPendingDeposits.length ? (
          <ul className="space-y-2">
            {filteredPendingDeposits.map((dep) => {
              const busy = pendingBusyId === dep.id;
              const isPlayerFlow = dep.created_by === "player";
              return (
                <li
                  key={dep.id}
                  className="rounded-xl border border-zinc-200 bg-white/80 px-3 py-3 text-sm dark:border-zinc-700 dark:bg-zinc-950/60"
                >
                  <div className="flex flex-wrap items-start gap-3">
                    <PlayerAvatar
                      photoPath={dep.profile_photo_path}
                      firstName={dep.first_name}
                      lastName={dep.last_name}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-zinc-950 dark:text-zinc-50">
                        {dep.first_name} {dep.last_name}
                        {dep.zawodnik ? (
                          <span className="ml-1 font-normal text-zinc-500 dark:text-zinc-400">({dep.zawodnik})</span>
                        ) : null}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-300">
                        {formatPln(Number(dep.amount_pln ?? 0))} · {dep.wallet_kind === "operator" ? "Portfel O" : "Portfel G"} · {isPlayerFlow ? "zgłoszenie gracza" : "wpis admina"}
                        {isPendingDepositStale(dep.created_at) ? " · starsze niż 24h" : ""}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                        Utworzono: {formatDateTimeLabel(dep.created_at)}
                      </p>
                      {dep.note ? (
                        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">{dep.note}</p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      {isPlayerFlow ? (
                        <Button type="button" size="sm" disabled={busy} onClick={() => void confirmPendingDeposit(dep.id)}>
                          {busy ? <LoadingIndicator variant="button" size="sm" className="mr-1.5" /> : null}
                          Potwierdź
                        </Button>
                      ) : null}
                      <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void cancelPendingDeposit(dep.id)}>
                        {!isPlayerFlow && busy ? <LoadingIndicator variant="button" size="sm" className="mr-1.5" /> : null}
                        Anuluj
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 px-4 py-6 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950/30 dark:text-zinc-400">
            Brak oczekujących wpłat w tym filtrze.
          </p>
        )}
      </div>
    );
  }

  const walletTabOptions = [
    { id: "balances" as const, label: "Salda" },
    { id: "pending" as const, label: `Pending${pendingDeposits.length ? ` (${pendingDeposits.length})` : ""}` },
    ...(topUpEnabled ? [{ id: "topup" as const, label: "Wpłata" }] : []),
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
          description="Salda graczy (G = gotówka/BLIK, O = online). Zwykłe wpłaty księguj osobno, a korekty traktuj jako wyjątkowe poprawki salda."
          onReload={() => void refresh()}
          loading={adminLoading}
        />
      ) : (
        <div className="mx-auto max-w-4xl overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <PhotoPanel
            src={MARKETPLACE_PITCH_PHOTOS[3]}
            className="min-h-[7rem] rounded-none border-0"
            contentClassName="flex min-h-[7rem] flex-col justify-end px-5 py-5"
            sizes="(max-width: 768px) 100vw, 896px"
          >
            <p className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-white/80">Administrator</p>
            <h2 className="mt-1 text-2xl font-black text-white">Portfele graczy</h2>
            <p className="mt-1 text-sm text-white/85">
              Salda, zwykłe wpłaty, wyjątkowe korekty i linki do podsumowań.
            </p>
          </PhotoPanel>
        </div>
      )}

      {embedded ? (
        <div className="mx-auto max-w-4xl">
          <div className={cn(platnosciPanelClass(true), "mt-4 space-y-4")}>
            {topUpEnabled ? (
              <div id="admin-wallet-topup">
                <PlatnosciCollapsible
                  embedded={embedded}
                  className="mb-0"
                  open={topUpSectionOpen}
                  onOpenChange={setTopUpSectionOpen}
                  title="Dodaj wpłatę"
                  description="Najszybsza ścieżka: zaksięguj otrzymaną gotówkę lub BLIK do portfela G."
                >
                  {topUpFormBody}
                </PlatnosciCollapsible>
              </div>
            ) : null}

            {pendingDeposits.length ? (
              <PlatnosciCollapsible
                embedded={embedded}
                className="mb-0"
                title={`Oczekujące wpłaty${pendingDeposits.length ? ` (${pendingDeposits.length})` : ""}`}
                description="Kolejka wpłat do potwierdzenia lub anulowania przez admina."
              >
                {renderPendingDeposits()}
              </PlatnosciCollapsible>
            ) : null}

            <div id="admin-adjust-saldo">
              <PlatnosciCollapsible
                embedded={embedded}
                className="mb-0"
                open={adjustSectionOpen}
                onOpenChange={setAdjustSectionOpen}
                title="Korekta salda"
                description="Używaj tylko wtedy, gdy trzeba ręcznie poprawić docelowe saldo G lub O."
              >
                {adjustFormBody}
              </PlatnosciCollapsible>
            </div>

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
              activeWalletTab === "pending"
                ? "Oczekujące wpłaty"
                : activeWalletTab === "topup"
                ? "Dodaj wpłatę"
                : activeWalletTab === "adjust"
                  ? "Korekta salda"
                  : activeWalletTab === "links"
                    ? "Linki publiczne"
                    : "Lista sald"
            }
            description={
              activeWalletTab === "pending"
                ? "Wpłaty oczekujące na potwierdzenie albo anulowanie. Najpierw obsługuj najstarsze."
                : activeWalletTab === "topup"
                ? "Szybkie księgowanie zwykłej wpłaty do portfela G (gotówka / BLIK)."
                : activeWalletTab === "adjust"
                  ? "Wyjątkowa ręczna poprawka docelowego salda G lub O. Różnica trafia do historii jako korekta."
                  : activeWalletTab === "links"
                    ? "Wyślij zawodnikom link z podglądem sald — ostatni mecz, zbiorczo albo dowolny rozegrany mecz."
                    : "Podgląd sald: łącznie oraz G (gotówka/BLIK) i O (online)."
            }
          >
            <div className="space-y-4">
              {activeWalletTab === "balances" ? renderBalancesList() : null}
              {activeWalletTab === "pending" ? renderPendingDeposits() : null}
              {activeWalletTab === "topup" && topUpEnabled ? topUpFormBody : null}
              {activeWalletTab === "adjust" ? <div id="admin-adjust-saldo">{adjustFormBody}</div> : null}
              {activeWalletTab === "links" && linksEnabled ? renderPublicLinkButtons() : null}
            </div>
          </AdminCard>
        </>
      )}
    </div>
  );
}
