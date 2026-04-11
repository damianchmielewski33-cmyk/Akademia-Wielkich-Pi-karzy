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

type Props = {
  nextMatch: MatchRow | null;
  /** Np. „3 osoby się zastanawiają” — pusty gdy brak «jeszcze nie wiem». */
  nextMatchTentativeLine: string;
  signups: PlatnosciSignup[];
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
  isLoggedIn,
  isAdmin,
  userSigned,
  userPaid,
}: Props) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

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

  return (
    <div className="container mx-auto max-w-2xl flex-1 px-4 py-8 sm:py-10">
      <div className="mb-8 text-center">
        <div className="pitch-rule mx-auto mb-4 w-40 opacity-80" />
        <h1 className="text-3xl font-bold tracking-tight text-emerald-950 dark:text-emerald-100 sm:text-4xl">Płatności za mecz</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Informacje o wpłacie na najbliższe spotkanie — przelew <strong>BLIK</strong> na podany numer telefonu.
          {isAdmin ? (
            <>
              {" "}
              Jako administrator możesz ustawić kwotę i potwierdzać wpłaty także na tej stronie (jak w panelu admina).
            </>
          ) : null}
        </p>
      </div>

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
          <Card className="mb-6 overflow-hidden border-emerald-900/15 shadow-md">
            <div className="home-pitch-tile relative px-5 py-5 text-white">
              <div className="relative">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-100/90">Najbliższy mecz</p>
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
          </Card>

          {isAdmin ? (
            <PlatnosciAdminSection nextMatch={nextMatch} signups={signups} onSaved={() => router.refresh()} />
          ) : null}

          <Card className="mb-6 border-amber-900/15 bg-amber-50/40 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg text-amber-950">
                <Banknote className="h-5 w-5 shrink-0" aria-hidden />
                Jak opłacić udział
              </CardTitle>
              <CardDescription className="text-amber-950/80">
                Wyślij przelew <strong>BLIK</strong> na numer telefonu:
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
            </CardContent>
          </Card>

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
            <Card className="mt-6 border-emerald-900/10 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-emerald-950 dark:text-emerald-100">Zapisani na ten mecz</CardTitle>
                <CardDescription>Status opłaty widoczny dla zalogowanych użytkowników.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="max-h-80 space-y-0 overflow-y-auto rounded-xl border border-emerald-900/10 bg-emerald-50/30">
                  {signups.map((p, i) => (
                    <PlatnosciSignupRow key={p.user_id} signup={p} index={i} variant="public" />
                  ))}
                </ul>
              </CardContent>
            </Card>
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
