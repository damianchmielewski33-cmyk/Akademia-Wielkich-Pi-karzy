"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, ShoppingCart } from "lucide-react";
import { AppModal } from "@/components/ui/app-modal";
import { extractApiErrorMessage, useAppMessage } from "@/components/ui/app-message-modal";
import { Button } from "@/components/ui/button";
import {
  adminEmptyStateClass,
  adminFieldClass,
  adminInnerPanelClass,
} from "@/components/admin-ui";
import {
  PaymentsCard,
  paymentsEmptyClass,
  paymentsFieldClass,
  paymentsIconWrapClass,
  paymentsInnerPanelClass,
} from "@/components/payments-card";
import { useSiteMode } from "@/components/site-mode";
import { formatMatchFeePln, MATCH_PREPAYMENT_PLN } from "@/lib/match-fee";
import { cn } from "@/lib/utils";
import type { MatchCartMatchOption } from "@/lib/match-cart";
import { currentHotpayReturnPath } from "@/lib/hotpay-client";

type Props = {
  hotpayEnabled: boolean;
  initialMatchId?: number | null;
  preferUserId?: number | null;
  refreshKey?: number;
  onPaid?: () => void;
  className?: string;
};

export function MatchCartPayPanel({
  hotpayEnabled,
  initialMatchId = null,
  preferUserId = null,
  refreshKey = 0,
  onPaid,
  className,
}: Props) {
  const { marketplaceEnabled } = useSiteMode();
  const light = marketplaceEnabled;
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [matches, setMatches] = useState<MatchCartMatchOption[]>([]);
  const [balancePln, setBalancePln] = useState<number | null>(null);
  const [matchId, setMatchId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const autoSelectedRef = useRef(false);
  const { showError, showSuccess, showInfo, MessageModal } = useAppMessage();

  async function refresh(opts?: { quiet?: boolean }) {
    if (!opts?.quiet) setLoading(true);
    try {
      const res = await fetch("/api/wallet/match-cart");
      const json = (await res.json().catch(() => null)) as {
        matches?: MatchCartMatchOption[];
        balance_pln?: number;
        error?: unknown;
      } | null;
      if (!res.ok) {
        if (!opts?.quiet) {
          showError(extractApiErrorMessage(json?.error, "Nie udało się wczytać koszyka"), "Koszyk meczowy");
        }
        return;
      }
      const list = Array.isArray(json?.matches) ? json.matches : [];
      setMatches(list);
      setBalancePln(typeof json?.balance_pln === "number" ? json.balance_pln : null);
      setMatchId((prev) => {
        if (prev != null && list.some((m) => m.match_id === prev)) return prev;
        if (initialMatchId != null && list.some((m) => m.match_id === initialMatchId)) {
          return initialMatchId;
        }
        return list[0]?.match_id ?? null;
      });
    } catch {
      if (!opts?.quiet) showError("Błąd sieci", "Koszyk meczowy");
    } finally {
      if (!opts?.quiet) setLoading(false);
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
  }, [refreshKey]);

  useEffect(() => {
    if (initialMatchId == null || loading) return;
    if (!matches.some((m) => m.match_id === initialMatchId)) return;
    setMatchId(initialMatchId);
  }, [initialMatchId, loading, matches]);

  const selectedMatch = useMemo(
    () => matches.find((m) => m.match_id === matchId) ?? null,
    [matches, matchId]
  );

  useEffect(() => {
    if (autoSelectedRef.current) return;
    if (preferUserId == null || matchId == null || initialMatchId == null) return;
    if (matchId !== initialMatchId) return;
    const selected = matches.find((m) => m.match_id === matchId);
    if (!selected) return;
    if (!selected.unpaid_players.some((p) => p.user_id === preferUserId)) return;
    autoSelectedRef.current = true;
    setSelectedIds([preferUserId]);
  }, [preferUserId, matchId, matches, initialMatchId]);

  const totalPln = selectedMatch
    ? Math.round(selectedMatch.fee_per_person_pln * selectedIds.length * 100) / 100
    : 0;

  const needsHotpay = balancePln != null && totalPln > 0 && balancePln < totalPln;

  function togglePlayer(userId: number) {
    setSelectedIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  }

  function selectAll() {
    if (!selectedMatch) return;
    setSelectedIds(selectedMatch.unpaid_players.map((p) => p.user_id));
  }

  function openConfirm() {
    if (selectedIds.length === 0) {
      showError("Zaznacz co najmniej jednego zawodnika do opłacenia", "Koszyk meczowy");
      return;
    }
    if (!selectedMatch) {
      showError("Wybierz mecz z listy", "Koszyk meczowy");
      return;
    }
    if (needsHotpay && !hotpayEnabled) {
      showError(
        "Niewystarczające saldo na portfelu. Zapłać kartą lub Blikiem albo poproś administratora o włączenie płatności online.",
        "Koszyk meczowy"
      );
      return;
    }
    setConfirmOpen(true);
  }

  async function submitCart() {
    if (!selectedMatch || selectedIds.length === 0) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/wallet/match-cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          match_id: selectedMatch.match_id,
          user_ids: selectedIds,
          allow_hotpay: hotpayEnabled,
          return_path: currentHotpayReturnPath("/platnosci"),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: unknown;
        method?: string;
        url?: string;
        amount_pln?: number;
        paid_user_ids?: number[];
      };
      if (!res.ok) {
        setConfirmOpen(false);
        showError(extractApiErrorMessage(data.error, "Nie udało się opłacić koszyka"), "Koszyk meczowy");
        return;
      }
      if (data.method === "hotpay" && data.url) {
        setConfirmOpen(false);
        showInfo(
          "Zaraz przekierujemy Cię do płatności kartą lub Blikiem — po płatności zawodnicy zostaną oznaczeni jako opłaceni.",
          "Płatność"
        );
        window.setTimeout(() => {
          window.location.assign(data.url!);
        }, 600);
        return;
      }
      setConfirmOpen(false);
      showSuccess(
        `Opłacono ${data.paid_user_ids?.length ?? selectedIds.length} os. · ${formatMatchFeePln(Number(data.amount_pln ?? totalPln))}`,
        "Koszyk meczowy"
      );
      setSelectedIds([]);
      await refresh();
      onPaid?.();
    } catch {
      setConfirmOpen(false);
      showError("Błąd sieci", "Koszyk meczowy");
    } finally {
      setSubmitting(false);
    }
  }

  const btnVariant = light ? "default" : "gold";

  return (
    <PaymentsCard
      id="match-cart"
      className={className}
      title="Opłać mecz (koszyk)"
      description={`Zaliczka ${formatMatchFeePln(MATCH_PREPAYMENT_PLN)} na osobę — jeśli ostateczna składka będzie niższa, różnica wraca na portfel płatnika. Możesz opłacić siebie i innych z portfela${hotpayEnabled ? " albo kartą / Blikiem" : ""}.`}
      headerExtra={
        <div className={light ? paymentsIconWrapClass : "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 ring-2 ring-white/30"}>
          <ShoppingCart className="h-5 w-5 text-white" strokeWidth={2.25} aria-hidden />
        </div>
      }
    >
      {loading ? (
        <p className={cn("flex items-center gap-2 text-sm", light ? "text-zinc-500" : "pitch-muted")}>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Wczytywanie meczów…
        </p>
      ) : matches.length === 0 ? (
        <p className={light ? paymentsEmptyClass : adminEmptyStateClass}>
          Brak nadchodzących meczów z nieopłaconymi zapisami.
        </p>
      ) : (
        <div className="space-y-4">
          <div className={light ? paymentsInnerPanelClass : adminInnerPanelClass}>
            <label
              htmlFor="match-cart-match"
              className={cn(
                "text-xs font-semibold uppercase tracking-wide",
                light ? "text-[var(--mp-teal-dark)]" : "text-emerald-100/70"
              )}
            >
              Mecz
            </label>
            <select
              id="match-cart-match"
              className={cn(
                "mt-1 flex h-10 w-full rounded-xl px-3 text-sm",
                light ? paymentsFieldClass : adminFieldClass
              )}
              value={matchId ?? ""}
              onChange={(e) => setMatchId(Number(e.target.value))}
            >
              {matches.map((m) => (
                <option key={m.match_id} value={m.match_id} className="text-zinc-900">
                  {m.match_date} {m.match_time} · {m.location} · {formatMatchFeePln(m.fee_per_person_pln)}/os.
                </option>
              ))}
            </select>
          </div>

          {selectedMatch ? (
            <div className={light ? paymentsInnerPanelClass : adminInnerPanelClass}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p
                  className={cn(
                    "text-xs font-semibold uppercase tracking-wide",
                    light ? "text-[var(--mp-teal-dark)]" : "text-emerald-100/70"
                  )}
                >
                  Nieopłaceni ({selectedMatch.unpaid_players.length})
                </p>
                <Button type="button" variant={btnVariant} size="sm" onClick={selectAll}>
                  Zaznacz wszystkich
                </Button>
              </div>
              <ul
                className={cn(
                  "mt-2 max-h-48 space-y-1 overflow-y-auto rounded-xl border p-2",
                  light
                    ? "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-950"
                    : "border-white/20 bg-black/15"
                )}
              >
                {selectedMatch.unpaid_players.map((p) => {
                  const label =
                    [p.first_name, p.last_name].filter(Boolean).join(" ").trim() || p.zawodnik;
                  const checked = selectedIds.includes(p.user_id);
                  return (
                    <li key={p.user_id}>
                      <label
                        className={cn(
                          "flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm",
                          light ? "hover:bg-zinc-100 dark:hover:bg-zinc-800" : "hover:bg-white/10"
                        )}
                      >
                        <input
                          type="checkbox"
                          className={cn(
                            "h-4 w-4",
                            light ? "accent-[var(--mp-teal)]" : "accent-[var(--mundial-gold,#c9a227)]"
                          )}
                          checked={checked}
                          onChange={() => togglePlayer(p.user_id)}
                        />
                        <span
                          className={cn(
                            "min-w-0 flex-1 truncate",
                            light ? "text-zinc-900 dark:text-zinc-50" : "text-white"
                          )}
                        >
                          {label}
                          {Number(p.is_temporary) === 1 ? (
                            <span className="text-amber-600 dark:text-amber-300"> · gość</span>
                          ) : null}
                          {p.zawodnik ? (
                            <span className={light ? "text-zinc-500" : "text-emerald-100/70"}> · {p.zawodnik}</span>
                          ) : null}
                        </span>
                        <span
                          className={cn(
                            "tabular-nums text-xs",
                            light ? "text-zinc-500" : "text-emerald-100/70"
                          )}
                        >
                          {formatMatchFeePln(selectedMatch.fee_per_person_pln)}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          <div
            className={cn(
              "flex flex-wrap items-center justify-between gap-3 rounded-xl border px-3 py-3",
              light
                ? "border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/80"
                : "border-white/25 bg-black/20 backdrop-blur-sm"
            )}
          >
            <div>
              <p
                className={cn(
                  "text-xs font-semibold uppercase tracking-wide",
                  light ? "text-[var(--mp-teal-dark)]" : "text-emerald-100/70"
                )}
              >
                Suma koszyka
              </p>
              <p
                className={cn(
                  "mt-0.5 text-xl font-bold tabular-nums",
                  light ? "text-zinc-950 dark:text-white" : "text-white"
                )}
              >
                {selectedIds.length === 0 ? "—" : formatMatchFeePln(totalPln)}
              </p>
              {balancePln != null ? (
                <p className={cn("mt-0.5 text-xs", light ? "text-zinc-500" : "pitch-muted")}>
                  Twoje saldo: {formatMatchFeePln(balancePln)}
                  {needsHotpay ? " · brakuje środków" : ""}
                </p>
              ) : null}
            </div>
            <Button type="button" variant={btnVariant} disabled={submitting || loading} onClick={openConfirm}>
              Opłać wybranych
            </Button>
          </div>
        </div>
      )}

      <AppModal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Potwierdź koszyk"
        description={
          selectedMatch && selectedIds.length > 0
            ? needsHotpay && hotpayEnabled
              ? `Opłacisz ${selectedIds.length} os. za ${formatMatchFeePln(totalPln)}. Brakuje środków na portfelu — zapłacisz kartą lub Blikiem, a potem opłaty zostaną oznaczone automatycznie.`
              : `Opłacisz ${selectedIds.length} os. za ${formatMatchFeePln(totalPln)} z portfela. Zawodnicy zostaną oznaczeni jako opłaceni.`
            : "Sprawdź wybór."
        }
      >
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" disabled={submitting} onClick={() => setConfirmOpen(false)}>
            Anuluj
          </Button>
          <Button type="button" variant={btnVariant} disabled={submitting} onClick={() => void submitCart()}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
            {needsHotpay && hotpayEnabled ? "Zapłać kartą lub Blikiem" : "Potwierdź opłatę"}
          </Button>
        </div>
      </AppModal>
      {MessageModal}
    </PaymentsCard>
  );
}
