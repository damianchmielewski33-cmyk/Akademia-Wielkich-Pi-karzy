"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Banknote, Check, ClipboardCopy, Loader2, MapPin, Shield } from "lucide-react";
import { toast } from "sonner";
import { PlayerAvatar, PlayerNameStack } from "@/components/player-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MATCH_BLIK_PHONE_COPY, MATCH_BLIK_PHONE_DISPLAY } from "@/lib/site";
import { isValidMatchFee, matchFeeToInputString, parseMatchFeeInput } from "@/lib/utils";
import type { MatchRow } from "@/lib/db";

export type PlatnosciSignup = {
  user_id: number;
  paid: number;
  first_name: string;
  last_name: string;
  zawodnik: string;
  profile_photo_path: string | null;
};

export type PlatnosciUserLite = {
  id: number;
  first_name: string;
  last_name: string;
  zawodnik: string;
  profile_photo_path: string | null;
};

type WalletDepositRequest = {
  id: number;
  user_id: number;
  amount_pln: number;
  created_by: "player" | "admin";
  status: "pending" | "completed" | "cancelled";
  note: string | null;
  player_declared_at: string | null;
  admin_confirmed_received_at: string | null;
  admin_declared_received_at: string | null;
  player_confirmed_amount_at: string | null;
  completed_at: string | null;
  created_at: string;
};

type WalletTransaction = {
  id: number;
  kind: "deposit" | "match_charge" | "adjustment";
  amount_pln: number;
  deposit_request_id: number | null;
  match_id: number | null;
  note: string | null;
  created_at: string;
};

type AdminWalletPlayerRow = PlatnosciUserLite & { balance_pln: number };

type AdminWalletOverview = {
  players: AdminWalletPlayerRow[];
  pendingDeposits: (WalletDepositRequest & PlatnosciSignup)[];
  playedMatches: MatchRow[];
};

type Props = {
  nextMatch: MatchRow | null;
  /** Np. „3 osoby się zastanawiają” — pusty gdy brak «jeszcze nie wiem». */
  nextMatchTentativeLine: string;
  signups: PlatnosciSignup[];
  allPlayers: PlatnosciUserLite[];
  isLoggedIn: boolean;
  isAdmin: boolean;
  userSigned: boolean;
  userPaid: boolean | null;
};

const SIGNUP_ROW_STRIPE = {
  public: {
    border: "border-emerald-100/90",
    even: "bg-white/60",
    odd: "bg-emerald-50/40",
  },
  admin: {
    border: "border-emerald-100",
    even: "bg-white",
    odd: "bg-emerald-50/50",
  },
} as const;

function PlatnosciSignupRow({
  signup,
  index,
  variant,
  trailing,
}: {
  signup: PlatnosciSignup;
  index: number;
  variant: keyof typeof SIGNUP_ROW_STRIPE;
  trailing?: ReactNode;
}) {
  const stripe = SIGNUP_ROW_STRIPE[variant];
  return (
    <li
      className={`flex flex-wrap items-center gap-2 border-b px-3 py-2.5 text-sm last:border-b-0 ${stripe.border} ${
        index % 2 === 0 ? stripe.even : stripe.odd
      }`}
    >
      <PlayerAvatar
        photoPath={signup.profile_photo_path}
        firstName={signup.first_name}
        lastName={signup.last_name}
        size="sm"
        ringClassName="ring-2 ring-emerald-200/90"
      />
      <div className="min-w-0 flex-1">
        <PlayerNameStack firstName={signup.first_name} lastName={signup.last_name} nick={signup.zawodnik} />
      </div>
      {signup.paid ? (
        <Badge className="border-emerald-200 bg-emerald-100 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-100">
          Opłacone
        </Badge>
      ) : (
        <Badge variant="secondary">Do zapłaty</Badge>
      )}
      {trailing}
    </li>
  );
}

export function PlatnosciClient({
  nextMatch,
  nextMatchTentativeLine,
  signups,
  allPlayers,
  isLoggedIn,
  isAdmin,
  userSigned,
  userPaid,
}: Props) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [walletBalancePln, setWalletBalancePln] = useState<number | null>(null);
  const [walletPending, setWalletPending] = useState<WalletDepositRequest[]>([]);
  const [walletTx, setWalletTx] = useState<WalletTransaction[]>([]);
  const [walletLoading, setWalletLoading] = useState(false);
  const [playerDepositConfirmAck, setPlayerDepositConfirmAck] = useState<Record<number, boolean>>({});

  const [depositAmount, setDepositAmount] = useState("");
  const [depositNote, setDepositNote] = useState("");
  const [depositSubmitting, setDepositSubmitting] = useState(false);

  const [adminOverview, setAdminOverview] = useState<AdminWalletOverview | null>(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminBalanceUserId, setAdminBalanceUserId] = useState<number | null>(null);
  const [adminBalanceTarget, setAdminBalanceTarget] = useState("");
  const [adminBalanceNote, setAdminBalanceNote] = useState("");
  const [adminBalanceSubmitting, setAdminBalanceSubmitting] = useState(false);
  const [adminManualUserId, setAdminManualUserId] = useState<number | null>(null);
  const [adminManualAmount, setAdminManualAmount] = useState("");
  const [adminManualNote, setAdminManualNote] = useState("");
  const [adminManualSubmitting, setAdminManualSubmitting] = useState(false);

  const [chargeMatchId, setChargeMatchId] = useState<number | null>(null);
  const [chargeMap, setChargeMap] = useState<Record<number, string>>({});
  const [chargeSubmitting, setChargeSubmitting] = useState(false);
  const [publicLinkBusy, setPublicLinkBusy] = useState(false);
  const [publicLinkCopied, setPublicLinkCopied] = useState(false);

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

  async function refreshWallet() {
    if (!isLoggedIn) return;
    setWalletLoading(true);
    try {
      const r = await fetchJson<{ balance_pln: number; pending: WalletDepositRequest[]; transactions: WalletTransaction[] }>(
        "/api/wallet/me"
      );
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setWalletBalancePln(Number(r.data.balance_pln ?? 0));
      setWalletPending(r.data.pending ?? []);
      setPlayerDepositConfirmAck((prev) => {
        const next: Record<number, boolean> = {};
        for (const d of r.data.pending ?? []) {
          if (prev[d.id]) next[d.id] = true;
        }
        return next;
      });
      setWalletTx(r.data.transactions ?? []);
    } finally {
      setWalletLoading(false);
    }
  }

  async function refreshAdminOverview() {
    if (!isAdmin) return;
    setAdminLoading(true);
    try {
      const r = await fetchJson<AdminWalletOverview>("/api/admin/wallet/overview");
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setAdminOverview(r.data);
      if (chargeMatchId === null && r.data.playedMatches?.length) {
        setChargeMatchId(r.data.playedMatches[0]!.id);
      }
      if (adminBalanceUserId === null && r.data.players?.length) {
        setAdminBalanceUserId(r.data.players[0]!.id);
      }
      if (adminManualUserId === null && r.data.players?.length) {
        setAdminManualUserId(r.data.players[0]!.id);
      }
    } finally {
      setAdminLoading(false);
    }
  }

  useEffect(() => {
    void refreshWallet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

  useEffect(() => {
    void refreshAdminOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  async function copyBlik() {
    try {
      await navigator.clipboard.writeText(MATCH_BLIK_PHONE_COPY);
      setCopied(true);
      toast.success("Numer skopiowany do schowka");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Nie udało się skopiować numeru");
    }
  }

  async function submitDeposit() {
    const amount_pln = Number(String(depositAmount).replace(",", "."));
    if (!Number.isFinite(amount_pln) || amount_pln <= 0) {
      toast.error("Podaj prawidłową kwotę");
      return;
    }
    setDepositSubmitting(true);
    try {
      const r = await fetchJson<{ ok: true; id: number }>("/api/wallet/deposits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount_pln, note: depositNote.trim() ? depositNote.trim() : undefined }),
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Zgłoszono wpłatę — czeka na autoryzację admina");
      setDepositAmount("");
      setDepositNote("");
      await refreshWallet();
      await refreshAdminOverview();
    } finally {
      setDepositSubmitting(false);
    }
  }

  async function playerConfirmDeposit(depId: number) {
    const r = await fetchJson<{ ok: true }>(`/api/wallet/deposits/${depId}/confirm`, { method: "POST" });
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    toast.success("Potwierdzono — wpłata zaksięgowana w portfelu");
    await refreshWallet();
    await refreshAdminOverview();
    router.refresh();
  }

  async function adminConfirmDeposit(depId: number) {
    const r = await fetchJson<{ ok: true }>(`/api/admin/wallet/deposits/${depId}/confirm`, { method: "POST" });
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    toast.success("Potwierdzono otrzymanie — wpłata zaksięgowana");
    await refreshAdminOverview();
    await refreshWallet();
    router.refresh();
  }

  async function adminCreateManualDeposit() {
    const user_id = adminManualUserId;
    const amount_pln = Number(String(adminManualAmount).replace(",", "."));
    if (!user_id) {
      toast.error("Wybierz zawodnika");
      return;
    }
    if (!Number.isFinite(amount_pln) || amount_pln <= 0) {
      toast.error("Podaj prawidłową kwotę");
      return;
    }
    setAdminManualSubmitting(true);
    try {
      const r = await fetchJson<{ ok: true; id: number }>("/api/admin/wallet/deposits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id,
          amount_pln,
          note: adminManualNote.trim() ? adminManualNote.trim() : undefined,
        }),
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Dodano wpłatę — zawodnik musi potwierdzić zgodność kwoty");
      setAdminManualAmount("");
      setAdminManualNote("");
      await refreshAdminOverview();
    } finally {
      setAdminManualSubmitting(false);
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
        delta_pln?: number;
        current_balance_pln?: number;
        target_balance_pln?: number;
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
      await refreshAdminOverview();
      await refreshWallet();
      router.refresh();
    } finally {
      setAdminBalanceSubmitting(false);
    }
  }

  async function submitMatchCharges() {
    if (!chargeMatchId) return;
    const payload = Object.entries(chargeMap)
      .map(([uid, v]) => ({ user_id: Number(uid), amount_pln: Number(String(v).replace(",", ".")) }))
      .filter((x) => Number.isFinite(x.amount_pln) && x.amount_pln > 0);
    if (payload.length === 0) {
      toast.error("Wpisz kwoty dla przynajmniej jednego zawodnika");
      return;
    }
    setChargeSubmitting(true);
    try {
      const r = await fetchJson<{ ok: true; applied: unknown[]; skipped: unknown[] }>(
        `/api/admin/wallet/match/${chargeMatchId}/charges`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ charges: payload }),
        }
      );
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Rozliczono mecz — kwoty odjęte z portfeli");
      setChargeMap({});
      await refreshAdminOverview();
    } finally {
      setChargeSubmitting(false);
    }
  }

  async function generatePublicLink() {
    setPublicLinkBusy(true);
    try {
      const r = await fetchJson<{ ok: true; token: string; path: string }>("/api/admin/wallet/public-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "last_match_wallets", expires_in_days: 30 }),
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      const url = `${window.location.origin}${r.data.path}`;
      await navigator.clipboard.writeText(url);
      setPublicLinkCopied(true);
      toast.success("Skopiowano publiczny link do schowka");
      setTimeout(() => setPublicLinkCopied(false), 2000);
    } catch {
      toast.error("Nie udało się skopiować linku");
    } finally {
      setPublicLinkBusy(false);
    }
  }

  return (
    <div className="container mx-auto max-w-2xl flex-1 px-4 py-8 sm:py-10">
      <div className="mb-8 text-center">
        <div className="pitch-rule mx-auto mb-4 w-40 opacity-80" />
        <h1 className="text-3xl font-bold tracking-tight text-emerald-950 dark:text-emerald-100 sm:text-4xl">Płatności i portfel</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Saldo zawodnika, autoryzacje wpłat oraz rozliczenia meczów. Wpłaty wykonujesz przelewem <strong>BLIK</strong>.
          {isAdmin ? (
            <>
              {" "}
              Jako administrator możesz autoryzować wpłaty i rozliczać rozegrane mecze.
            </>
          ) : null}
        </p>
      </div>

      {isAdmin ? (
        <Card className="mb-6 border-emerald-900/10 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-emerald-950 dark:text-emerald-100">Portfele graczy — saldo</CardTitle>
            <CardDescription>Najważniejszy podgląd dla administratora.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 rounded-2xl border border-emerald-900/10 bg-white/70 p-4">
              <p className="text-sm font-semibold text-emerald-950">Ustaw saldo zawodnika</p>
              <p className="mt-0.5 text-xs text-zinc-600">
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
                  {adminBalanceUserId && adminOverview?.players?.length ? (
                    <p className="mt-1 text-xs text-zinc-600">
                      Obecne saldo:{" "}
                      {formatPln(
                        Number(
                          (adminOverview.players.find((p) => p.id === adminBalanceUserId)?.balance_pln ?? 0) as number
                        )
                      )}
                    </p>
                  ) : null}
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
              <p className="text-xs text-zinc-600">
                {adminOverview?.players?.length ? `Graczy: ${adminOverview.players.length}` : "—"}
              </p>
              <Button type="button" variant="secondary" disabled={adminLoading} onClick={() => void refreshAdminOverview()}>
                {adminLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
                Odśwież
              </Button>
            </div>
            {adminOverview?.players?.length ? (
              <ul className="max-h-96 space-y-0 overflow-y-auto rounded-xl border border-emerald-900/10 bg-emerald-50/20">
                {adminOverview.players.map((p, i) => (
                  <li
                    key={p.id}
                    className={`flex flex-wrap items-center gap-2 border-b px-3 py-2.5 text-sm last:border-b-0 ${
                      i % 2 === 0 ? "bg-white/60" : "bg-emerald-50/40"
                    }`}
                  >
                    <PlayerAvatar
                      photoPath={p.profile_photo_path}
                      firstName={p.first_name}
                      lastName={p.last_name}
                      size="sm"
                      ringClassName="ring-2 ring-emerald-200/90"
                    />
                    <div className="min-w-0 flex-1">
                      <PlayerNameStack firstName={p.first_name} lastName={p.last_name} nick={p.zawodnik} />
                    </div>
                    <span className="shrink-0 font-semibold tabular-nums text-emerald-950">
                      {formatPln(Number(p.balance_pln ?? 0))}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-xl border border-dashed border-emerald-900/10 bg-emerald-50/20 px-4 py-6 text-center text-sm text-zinc-600">
                Brak danych do wyświetlenia.
              </p>
            )}
          </CardContent>
        </Card>
      ) : null}

      {isLoggedIn ? (
        <Card className="mb-6 border-emerald-900/10 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-emerald-950 dark:text-emerald-100">Portfel</CardTitle>
            <CardDescription>Saldo, autoryzacje i historia operacji.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-900/10 bg-emerald-50/40 px-4 py-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-900/70">Saldo</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-950">
                  {walletBalancePln === null ? "—" : formatPln(walletBalancePln)}
                </p>
              </div>
              <Button type="button" variant="secondary" disabled={walletLoading} onClick={() => void refreshWallet()}>
                {walletLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
                Odśwież
              </Button>
            </div>

            {walletPending.length > 0 ? (
              <div>
                <p className="mb-2 text-sm font-medium text-emerald-950 dark:text-emerald-100">Do zrobienia teraz</p>
                <ul className="space-y-2">
                  {walletPending.map((d) => {
                    const needsPlayerConfirm = d.created_by === "admin" && Boolean(d.admin_declared_received_at) && !d.player_confirmed_amount_at;
                    const needsAdminConfirm = d.created_by === "player" && Boolean(d.player_declared_at) && !d.admin_confirmed_received_at;
                    const acked = Boolean(playerDepositConfirmAck[d.id]);
                    return (
                      <li key={d.id} className="rounded-xl border border-emerald-900/10 bg-white/70 px-4 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-emerald-950">
                              {formatPln(d.amount_pln)}{" "}
                              <span className="text-xs font-normal text-zinc-600">
                                · {d.created_by === "player" ? "zgłoszone przez Ciebie" : "wprowadzone przez admina"}
                              </span>
                            </p>
                            {d.note ? <p className="mt-0.5 text-xs text-zinc-600">{d.note}</p> : null}
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            {needsPlayerConfirm ? (
                              <div className="flex flex-col items-end gap-2">
                                <label className="flex cursor-pointer select-none items-center gap-2 text-xs text-zinc-700">
                                  <input
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-emerald-950/20 accent-emerald-700"
                                    checked={acked}
                                    onChange={(e) =>
                                      setPlayerDepositConfirmAck((prev) => ({ ...prev, [d.id]: e.target.checked }))
                                    }
                                  />
                                  Potwierdzam, że kwota {formatPln(d.amount_pln)} się zgadza
                                </label>
                                <Button
                                  type="button"
                                  size="sm"
                                  disabled={!acked}
                                  onClick={async () => {
                                    await playerConfirmDeposit(d.id);
                                    setPlayerDepositConfirmAck((prev) => {
                                      const next = { ...prev };
                                      delete next[d.id];
                                      return next;
                                    });
                                  }}
                                >
                                  Zatwierdź kwotę
                                </Button>
                              </div>
                            ) : needsAdminConfirm ? (
                              <Badge variant="secondary">Czeka na potwierdzenie admina</Badge>
                            ) : (
                              <Badge variant="secondary">W toku</Badge>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}

            {walletTx.length > 0 ? (
              <div>
                <p className="mb-2 text-sm font-medium text-emerald-950 dark:text-emerald-100">Ostatnie operacje</p>
                <ul className="max-h-72 space-y-0 overflow-y-auto rounded-xl border border-emerald-900/10 bg-emerald-50/20">
                  {walletTx.map((t, i) => (
                    <li
                      key={t.id}
                      className={`flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2.5 text-sm last:border-b-0 ${
                        i % 2 === 0 ? "bg-white/60" : "bg-emerald-50/40"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-emerald-950">
                          {t.kind === "deposit" ? "Wpłata" : t.kind === "match_charge" ? "Rozliczenie meczu" : "Korekta"}
                        </p>
                        {t.note ? <p className="truncate text-xs text-zinc-600">{t.note}</p> : null}
                      </div>
                      <div className="shrink-0 text-right tabular-nums">
                        <span className={t.amount_pln >= 0 ? "text-emerald-900" : "text-amber-950"}>
                          {formatPln(t.amount_pln)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {isLoggedIn ? (
        <details className="group mb-6 overflow-hidden rounded-2xl border border-emerald-900/10 bg-white/70 shadow-sm">
          <summary className="awp-focus-ring cursor-pointer list-none px-5 py-4 font-semibold text-emerald-950 [&::-webkit-details-marker]:hidden">
            <span className="flex items-center justify-between gap-3">
              <span>Zgłoś wpłatę do portfela</span>
              <span className="text-xs font-medium text-zinc-600 group-open:hidden">Rozwiń</span>
              <span className="hidden text-xs font-medium text-zinc-600 group-open:inline">Zwiń</span>
            </span>
            <span className="mt-1 block text-sm font-normal text-zinc-600">
              Jeśli zrobiłeś przelew BLIK, zgłoś kwotę — admin ją potwierdzi.
            </span>
          </summary>
          <div className="px-5 pb-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-1">
                <Label htmlFor="wallet-dep-amount">Kwota (PLN)</Label>
                <Input
                  id="wallet-dep-amount"
                  type="text"
                  inputMode="decimal"
                  placeholder="np. 50"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="wallet-dep-note">Opis (opcjonalnie)</Label>
                <Input
                  id="wallet-dep-note"
                  type="text"
                  placeholder="np. wpłata na kwiecień"
                  value={depositNote}
                  onChange={(e) => setDepositNote(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button type="button" disabled={depositSubmitting} onClick={() => void submitDeposit()}>
                {depositSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
                Wpłaciłem — zgłoś do autoryzacji
              </Button>
              <p className="text-xs text-zinc-600">
                Jeśli admin wprowadzi wpłatę ręcznie, w portfelu pojawi się prośba o potwierdzenie kwoty.
              </p>
            </div>
          </div>
        </details>
      ) : null}

      {!nextMatch ? (
        <Card className="border-emerald-900/10 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-emerald-950 dark:text-emerald-100">Brak nadchodzącego meczu</CardTitle>
            <CardDescription>
              Gdy administrator doda termin w terminarzu, tutaj pojawią się szczegóły wpłaty.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="secondary" className="w-full sm:w-auto">
              <Link href="/terminarz">Przejdź do terminarza</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <details className="group mb-6 overflow-hidden rounded-2xl border border-emerald-900/15 bg-white/70 shadow-md">
            <summary className="awp-focus-ring cursor-pointer list-none px-5 py-4 font-semibold text-emerald-950 [&::-webkit-details-marker]:hidden">
              <span className="flex items-center justify-between gap-3">
                <span>Informacje o ostatnim meczu</span>
                <span className="text-xs font-medium text-zinc-600 group-open:hidden">Rozwiń</span>
                <span className="hidden text-xs font-medium text-zinc-600 group-open:inline">Zwiń</span>
              </span>
              <span className="mt-1 block text-sm font-normal text-zinc-600">
                {nextMatch.match_date} · {nextMatch.match_time} · {nextMatch.location}
              </span>
            </summary>
            <div className="px-5 pb-5">
              <div className="home-pitch-tile relative overflow-hidden rounded-2xl px-5 py-5 text-white">
                <div className="relative">
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-100/90">Ostatni mecz</p>
                  <p className="mt-2 text-lg font-bold tabular-nums text-white">
                    {nextMatch.match_date} · {nextMatch.match_time}
                  </p>
                  <p className="mt-1 flex items-start gap-2 text-sm text-emerald-50/95">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    {nextMatch.location}
                  </p>
                  <div className="mt-3 space-y-0.5 text-xs text-emerald-100/85">
                    <p>
                      {nextMatch.signed_up}/{nextMatch.max_slots} zapisanych
                    </p>
                    {nextMatchTentativeLine ? (
                      <p className="text-[11px] font-semibold text-amber-100/95">{nextMatchTentativeLine}</p>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </details>

          <details className="group mb-6 overflow-hidden rounded-2xl border border-amber-900/15 bg-amber-50/40 shadow-sm">
            <summary className="awp-focus-ring cursor-pointer list-none px-5 py-4 font-semibold text-amber-950 [&::-webkit-details-marker]:hidden">
              <span className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2">
                  <Banknote className="h-5 w-5 shrink-0" aria-hidden />
                  Jak opłacić udział
                </span>
                <span className="text-xs font-medium text-amber-950/70 group-open:hidden">Rozwiń</span>
                <span className="hidden text-xs font-medium text-amber-950/70 group-open:inline">Zwiń</span>
              </span>
              <span className="mt-1 block text-sm font-normal text-amber-950/80">
                BLIK → {MATCH_BLIK_PHONE_DISPLAY}{isValidMatchFee(nextMatch.fee_pln) ? ` · ${formatPln(nextMatch.fee_pln)}` : ""}
              </span>
            </summary>
            <div className="px-5 pb-5">
              <div className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="font-mono text-2xl font-bold tracking-tight text-amber-950 tabular-nums">
                    {MATCH_BLIK_PHONE_DISPLAY}
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    className="shrink-0 border-amber-200 bg-white"
                    onClick={() => void copyBlik()}
                  >
                    {copied ? (
                      <Check className="mr-2 h-4 w-4" aria-hidden />
                    ) : (
                      <ClipboardCopy className="mr-2 h-4 w-4" aria-hidden />
                    )}
                    Kopiuj numer
                  </Button>
                </div>
                <div className="rounded-xl border border-amber-200/80 bg-white/80 px-4 py-3 text-sm text-amber-950/90">
                  <p className="font-medium text-amber-950">Kwota</p>
                  {isValidMatchFee(nextMatch.fee_pln) ? (
                    <p className="mt-1 text-base font-semibold tabular-nums">
                      {formatPln(nextMatch.fee_pln)}
                    </p>
                  ) : (
                    <p className="mt-1 text-amber-950/85">
                      Kwotę wpisowego ustala administrator — po zapisie sprawdź tutaj lub skontaktuj się z akademią.
                    </p>
                  )}
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  Po wykonaniu przelewu status „Opłacone” pojawi się na liście zapisów, gdy administrator potwierdzi wpłatę.
                </p>
              </div>
            </div>
          </details>

          {!isLoggedIn ? (
            <Card className="border-emerald-900/10">
              <CardHeader>
                <CardTitle className="text-lg">Zaloguj się</CardTitle>
                <CardDescription>
                  Po zalogowaniu zobaczysz listę zapisanych zawodników i status opłaty za ten mecz.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button asChild>
                  <Link href="/login">Logowanie</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/register">Rejestracja</Link>
                </Button>
              </CardContent>
            </Card>
          ) : !userSigned ? (
            <Card className="border-emerald-900/10">
              <CardHeader>
                <CardTitle className="text-lg">Nie jesteś zapisany na ten mecz</CardTitle>
                <CardDescription>
                  Zapisz się w terminarzu — wtedy zobaczysz tutaj swój status płatności i listę pozostałych zapisanych.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="secondary">
                  <Link href="/terminarz">Terminarz i zapisy</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-emerald-900/10 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-emerald-950 dark:text-emerald-100">Twój status</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-3">
                {userPaid ? (
                  <Badge className="border-emerald-200 bg-emerald-100 px-3 py-1 text-emerald-950 dark:border-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-100">
                    Opłacone
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="px-3 py-1">
                    Do zapłaty
                  </Badge>
                )}
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  {userPaid
                    ? "Dziękujemy — wpłata została potwierdzona przez administratora."
                    : "Po wysłaniu BLIK poczekaj na potwierdzenie."}
                </span>
              </CardContent>
            </Card>
          )}

          {!isAdmin && isLoggedIn && signups.length > 0 ? (
            <details className="group mt-6 overflow-hidden rounded-2xl border border-emerald-900/10 bg-white/70 shadow-sm">
              <summary className="awp-focus-ring cursor-pointer list-none px-5 py-4 font-semibold text-emerald-950 [&::-webkit-details-marker]:hidden">
                <span className="flex items-center justify-between gap-3">
                  <span>Zapisani na ten mecz</span>
                  <span className="text-xs font-medium text-zinc-600 group-open:hidden">Rozwiń</span>
                  <span className="hidden text-xs font-medium text-zinc-600 group-open:inline">Zwiń</span>
                </span>
                <span className="mt-1 block text-sm font-normal text-zinc-600">
                  Status opłaty widoczny dla zalogowanych użytkowników.
                </span>
              </summary>
              <div className="px-5 pb-5">
                <ul className="max-h-80 space-y-0 overflow-y-auto rounded-xl border border-emerald-900/10 bg-emerald-50/30">
                  {signups.map((p, i) => (
                    <PlatnosciSignupRow key={p.user_id} signup={p} index={i} variant="public" />
                  ))}
                </ul>
              </div>
            </details>
          ) : null}

          <Card className="mt-6 border-emerald-900/10 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-emerald-950 dark:text-emerald-100">Wszyscy zarejestrowani zawodnicy</CardTitle>
              <CardDescription>Lista zawodników w akademii.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="max-h-80 space-y-0 overflow-y-auto rounded-xl border border-emerald-900/10 bg-emerald-50/20">
                {allPlayers.map((p, i) => (
                  <li
                    key={p.id}
                    className={`flex flex-wrap items-center gap-2 border-b px-3 py-2.5 text-sm last:border-b-0 ${
                      i % 2 === 0 ? "bg-white/60" : "bg-emerald-50/40"
                    }`}
                  >
                    <PlayerAvatar
                      photoPath={p.profile_photo_path}
                      firstName={p.first_name}
                      lastName={p.last_name}
                      size="sm"
                      ringClassName="ring-2 ring-emerald-200/90"
                    />
                    <div className="min-w-0 flex-1">
                      <PlayerNameStack firstName={p.first_name} lastName={p.last_name} nick={p.zawodnik} />
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {isAdmin ? (
            <details className="group mt-6 overflow-hidden rounded-2xl border border-emerald-800/15 bg-white/80 shadow-sm">
              <summary className="awp-focus-ring cursor-pointer list-none px-5 py-4 font-semibold text-emerald-950 [&::-webkit-details-marker]:hidden">
                <span className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2">
                    <Shield className="h-5 w-5 shrink-0 text-emerald-800" aria-hidden />
                    Panel administratora
                  </span>
                  <span className="text-xs font-medium text-zinc-600 group-open:hidden">Rozwiń</span>
                  <span className="hidden text-xs font-medium text-zinc-600 group-open:inline">Zwiń</span>
                </span>
                <span className="mt-1 block text-sm font-normal text-zinc-600">
                  Autoryzacje, wpłaty ręczne, link publiczny i rozliczenia meczów.
                </span>
              </summary>
              <div className="px-5 pb-5">
                <div className="space-y-6">
                  <PlatnosciAdminSection nextMatch={nextMatch} signups={signups} onSaved={() => router.refresh()} />

                  <details className="group overflow-hidden rounded-2xl border border-emerald-900/10 bg-white/70">
                    <summary className="awp-focus-ring cursor-pointer list-none px-4 py-3 text-sm font-semibold text-emerald-950 [&::-webkit-details-marker]:hidden">
                      <span className="flex items-center justify-between gap-3">
                        <span>Link publiczny</span>
                        <span className="text-xs font-medium text-zinc-600 group-open:hidden">Rozwiń</span>
                        <span className="hidden text-xs font-medium text-zinc-600 group-open:inline">Zwiń</span>
                      </span>
                    </summary>
                    <div className="px-4 pb-4">
                      <p className="mt-1 text-xs text-zinc-600">
                        Widok portfeli zawodników, którzy byli zapisani na ostatni mecz. Link ważny 30 dni.
                      </p>
                      <div className="mt-3">
                        <Button type="button" variant="secondary" disabled={publicLinkBusy} onClick={() => void generatePublicLink()}>
                          {publicLinkBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
                          {publicLinkCopied ? "Skopiowano" : "Generuj i kopiuj link"}
                        </Button>
                      </div>
                    </div>
                  </details>

                  <details className="group overflow-hidden rounded-2xl border border-emerald-900/10 bg-emerald-50/30">
                    <summary className="awp-focus-ring cursor-pointer list-none px-4 py-3 text-sm font-semibold text-emerald-950 [&::-webkit-details-marker]:hidden">
                      <span className="flex items-center justify-between gap-3">
                        <span>Wpłata ręczna (admin → zawodnik)</span>
                        <span className="text-xs font-medium text-zinc-600 group-open:hidden">Rozwiń</span>
                        <span className="hidden text-xs font-medium text-zinc-600 group-open:inline">Zwiń</span>
                      </span>
                    </summary>
                    <div className="px-4 pb-4">
                      <div className="mt-2 grid gap-3 sm:grid-cols-3">
                        <div className="sm:col-span-1">
                          <Label htmlFor="admin-wallet-user">Imię i nazwisko</Label>
                          <select
                            id="admin-wallet-user"
                            className="awp-focus-ring mt-1 w-full rounded-xl border border-emerald-950/15 bg-white/90 px-3 py-2 text-sm font-medium text-emerald-950 shadow-sm shadow-emerald-950/5 dark:border-emerald-100/10 dark:bg-zinc-900/70 dark:text-emerald-100"
                            value={adminManualUserId ?? ""}
                            onChange={(e) => setAdminManualUserId(e.target.value ? Number(e.target.value) : null)}
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
                        </div>
                        <div className="sm:col-span-1">
                          <Label htmlFor="admin-wallet-amount">Kwota (PLN)</Label>
                          <Input
                            id="admin-wallet-amount"
                            type="text"
                            inputMode="decimal"
                            placeholder="np. 50"
                            value={adminManualAmount}
                            onChange={(e) => setAdminManualAmount(e.target.value)}
                          />
                        </div>
                        <div className="sm:col-span-1">
                          <Label htmlFor="admin-wallet-note">Opis</Label>
                          <Input
                            id="admin-wallet-note"
                            type="text"
                            placeholder="opcjonalnie"
                            value={adminManualNote}
                            onChange={(e) => setAdminManualNote(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="mt-3">
                        <Button type="button" disabled={adminManualSubmitting} onClick={() => void adminCreateManualDeposit()}>
                          {adminManualSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
                          Otrzymałem pieniądze (wprowadź)
                        </Button>
                      </div>
                    </div>
                  </details>

                  <details className="group overflow-hidden rounded-2xl border border-emerald-900/10 bg-white/70">
                    <summary className="awp-focus-ring cursor-pointer list-none px-4 py-3 text-sm font-semibold text-emerald-950 [&::-webkit-details-marker]:hidden">
                      <span className="flex items-center justify-between gap-3">
                        <span>Wpłaty do autoryzacji</span>
                        <span className="text-xs font-medium text-zinc-600 group-open:hidden">Rozwiń</span>
                        <span className="hidden text-xs font-medium text-zinc-600 group-open:inline">Zwiń</span>
                      </span>
                    </summary>
                    <div className="px-4 pb-4">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs text-zinc-600">Lista oczekujących wpłat (player→admin oraz admin→player).</p>
                        <Button type="button" variant="secondary" disabled={adminLoading} onClick={() => void refreshAdminOverview()}>
                          {adminLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
                          Odśwież
                        </Button>
                      </div>
                      {adminOverview?.pendingDeposits?.length ? (
                        <ul className="space-y-2">
                          {adminOverview.pendingDeposits.map((d) => {
                            const adminCanConfirm = d.created_by === "player" && !d.admin_confirmed_received_at;
                            const playerMustConfirm = d.created_by === "admin" && !d.player_confirmed_amount_at;
                            return (
                              <li key={d.id} className="rounded-xl border border-emerald-900/10 bg-white/70 px-4 py-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex min-w-0 items-center gap-2">
                                    <PlayerAvatar
                                      photoPath={d.profile_photo_path}
                                      firstName={d.first_name}
                                      lastName={d.last_name}
                                      size="sm"
                                      ringClassName="ring-2 ring-emerald-200/90"
                                    />
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-semibold text-emerald-950">
                                        {d.first_name} {d.last_name} · {formatPln(d.amount_pln)}
                                      </p>
                                      <p className="truncate text-xs text-zinc-600">
                                        {d.created_by === "player"
                                          ? "Zawodnik zgłosił wpłatę — czeka na Twoje potwierdzenie"
                                          : "Admin wprowadził wpłatę — czeka na potwierdzenie zawodnika"}
                                        {d.note ? ` · ${d.note}` : ""}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    {adminCanConfirm ? (
                                      <Button type="button" size="sm" onClick={() => void adminConfirmDeposit(d.id)}>
                                        Potwierdzam: otrzymałem
                                      </Button>
                                    ) : playerMustConfirm ? (
                                      <Badge variant="secondary">Czeka na zawodnika</Badge>
                                    ) : (
                                      <Badge variant="secondary">W toku</Badge>
                                    )}
                                  </div>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <p className="rounded-xl border border-dashed border-emerald-900/10 bg-emerald-50/20 px-4 py-6 text-center text-sm text-zinc-600">
                          Brak wpłat do autoryzacji.
                        </p>
                      )}
                    </div>
                  </details>

                  <details className="group overflow-hidden rounded-2xl border border-emerald-900/10 bg-white/70">
                    <summary className="awp-focus-ring cursor-pointer list-none px-4 py-3 text-sm font-semibold text-emerald-950 [&::-webkit-details-marker]:hidden">
                      <span className="flex items-center justify-between gap-3">
                        <span>Rozlicz rozegrany mecz (odejmij z portfeli)</span>
                        <span className="text-xs font-medium text-zinc-600 group-open:hidden">Rozwiń</span>
                        <span className="hidden text-xs font-medium text-zinc-600 group-open:inline">Zwiń</span>
                      </span>
                    </summary>
                    <div className="px-4 pb-4">
                      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end">
                        <div className="flex-1">
                          <Label htmlFor="charge-match-id">ID meczu (played=1)</Label>
                          <Input
                            id="charge-match-id"
                            type="number"
                            value={chargeMatchId ?? ""}
                            onChange={(e) => setChargeMatchId(e.target.value ? Number(e.target.value) : null)}
                          />
                          <p className="mt-1 text-xs text-zinc-600">
                            Ostatnie rozegrane mecze:{" "}
                            {(adminOverview?.playedMatches ?? []).slice(0, 3).map((m) => `${m.id} (${m.match_date})`).join(", ") || "—"}
                          </p>
                        </div>
                        <Button type="button" disabled={chargeSubmitting} onClick={() => void submitMatchCharges()}>
                          {chargeSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
                          Zapisz rozliczenie
                        </Button>
                      </div>

                      <div className="mt-4">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-600">Kwota do odjęcia per zawodnik (PLN)</p>
                        <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                          {(adminOverview?.players ?? []).map((p) => (
                            <div key={p.id} className="flex items-center gap-2 rounded-lg border border-emerald-900/10 bg-white px-3 py-2">
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-emerald-950">
                                  {p.first_name} {p.last_name}
                                </p>
                                <p className="truncate text-xs text-zinc-600">Saldo: {formatPln(Number(p.balance_pln ?? 0))}</p>
                              </div>
                              <Input
                                className="w-28"
                                type="text"
                                inputMode="decimal"
                                placeholder="0"
                                value={chargeMap[p.id] ?? ""}
                                onChange={(e) => setChargeMap((prev) => ({ ...prev, [p.id]: e.target.value }))}
                              />
                            </div>
                          ))}
                        </div>
                        <p className="mt-2 text-xs text-zinc-600">
                          Wpisz kwoty tylko dla tych zawodników, których chcesz obciążyć. Każdego zawodnika da się rozliczyć maksymalnie raz dla danego meczu.
                        </p>
                      </div>
                    </div>
                  </details>
                </div>
              </div>
            </details>
          ) : null}
        </>
      )}
    </div>
  );
}

type PlatnosciAdminSectionProps = {
  nextMatch: MatchRow;
  signups: PlatnosciSignup[];
  onSaved: () => void;
};

function PlatnosciAdminSection({ nextMatch, signups: signupsProp, onSaved }: PlatnosciAdminSectionProps) {
  const [feePln, setFeePln] = useState(() => matchFeeToInputString(nextMatch.fee_pln));
  const [savingFee, setSavingFee] = useState(false);
  const [rows, setRows] = useState(signupsProp);
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    setRows(signupsProp);
  }, [signupsProp]);

  useEffect(() => {
    setFeePln(matchFeeToInputString(nextMatch.fee_pln));
  }, [nextMatch.id, nextMatch.fee_pln]);

  async function saveFee() {
    const parsed = parseMatchFeeInput(feePln);
    if (!parsed.ok) {
      toast.error("Podaj prawidłową kwotę lub zostaw pole puste");
      return;
    }
    const fee_pln = parsed.fee;
    setSavingFee(true);
    try {
      const res = await fetch(`/api/admin/match/${nextMatch.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: nextMatch.match_date,
          time: nextMatch.match_time,
          location: nextMatch.location,
          fee_pln,
        }),
      });
      if (!res.ok) {
        toast.error("Nie udało się zapisać kwoty");
        return;
      }
      toast.success("Zapisano kwotę wpisowego");
      onSaved();
    } finally {
      setSavingFee(false);
    }
  }

  async function togglePaid(userId: number, nextPaid: boolean) {
    setBusyId(userId);
    try {
      const res = await fetch(`/api/admin/match/${nextMatch.id}/signups`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, paid: nextPaid }),
      });
      if (!res.ok) {
        toast.error("Nie udało się zapisać statusu opłaty");
        return;
      }
      setRows((prev) =>
        prev.map((r) => (r.user_id === userId ? { ...r, paid: nextPaid ? 1 : 0 } : r))
      );
      toast.success(nextPaid ? "Oznaczono jako opłacone" : "Cofnięto oznaczenie opłaty");
      onSaved();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card className="mb-6 border-2 border-emerald-800/25 bg-gradient-to-br from-emerald-950/5 to-emerald-900/10 shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="flex flex-wrap items-center gap-2 text-lg text-emerald-950 dark:text-emerald-100">
          <Shield className="h-5 w-5 shrink-0 text-emerald-800" aria-hidden />
          Zarządzanie płatnościami (administrator)
        </CardTitle>
        <CardDescription>
          Ustaw kwotę na ten mecz i oznaczaj wpłaty — te same działania co w{" "}
          <Link href="/panel-admina" className="font-medium text-emerald-800 underline-offset-2 hover:underline">
            panelu admina
          </Link>{" "}
          (zakładka Mecze: edycja kwoty, przycisk „Opłaty”).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-xl border border-emerald-900/15 bg-white/80 px-4 py-3">
          <Label htmlFor="platnosci-admin-fee">Kwota wpisowego (PLN)</Label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end">
            <Input
              id="platnosci-admin-fee"
              type="text"
              inputMode="decimal"
              placeholder="np. 25 lub puste"
              className="max-w-xs border-zinc-200"
              value={feePln}
              onChange={(e) => setFeePln(e.target.value)}
            />
            <Button type="button" disabled={savingFee} onClick={() => void saveFee()}>
              {savingFee ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
              Zapisz kwotę
            </Button>
          </div>
          <p className="mt-2 text-xs text-zinc-500">Puste pole — kwota nie jest pokazywana zawodnikom powyżej.</p>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-emerald-950 dark:text-emerald-100">Zapisani — status opłaty</p>
          {rows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-emerald-900/20 bg-emerald-50/40 px-4 py-6 text-center text-sm text-zinc-600 dark:border-emerald-800/40 dark:bg-emerald-950/30 dark:text-zinc-400">
              Brak zapisanych zawodników na ten mecz.
            </p>
          ) : (
            <ul className="max-h-[min(24rem,70vh)] space-y-0 overflow-y-auto rounded-xl border border-emerald-900/15 bg-white">
              {rows.map((p, i) => (
                <PlatnosciSignupRow
                  key={p.user_id}
                  signup={p}
                  index={i}
                  variant="admin"
                  trailing={
                    <Button
                      type="button"
                      size="sm"
                      variant={p.paid ? "outline" : "default"}
                      className="shrink-0"
                      disabled={busyId === p.user_id}
                      onClick={() => void togglePaid(p.user_id, !p.paid)}
                    >
                      {busyId === p.user_id ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      ) : p.paid ? (
                        "Cofnij"
                      ) : (
                        "Opłacone"
                      )}
                    </Button>
                  }
                />
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function formatPln(n: number) {
  const v = Math.round(n * 100) / 100;
  return new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" }).format(v);
}
