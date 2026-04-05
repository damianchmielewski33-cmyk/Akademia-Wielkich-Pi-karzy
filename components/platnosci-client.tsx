"use client";

import Link from "next/link";
import { useState } from "react";
import { Banknote, Check, ClipboardCopy, MapPin } from "lucide-react";
import { toast } from "sonner";
import { PlayerAvatar, PlayerNameStack } from "@/components/player-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MATCH_BLIK_PHONE_COPY, MATCH_BLIK_PHONE_DISPLAY } from "@/lib/site";
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
  nextMatch: (MatchRow & { fee_pln?: number | null }) | null;
  signups: PlatnosciSignup[];
  isLoggedIn: boolean;
  userSigned: boolean;
  userPaid: boolean | null;
};

export function PlatnosciClient({
  nextMatch,
  signups,
  isLoggedIn,
  userSigned,
  userPaid,
}: Props) {
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
        <h1 className="text-3xl font-bold tracking-tight text-emerald-950 sm:text-4xl">Płatności za mecz</h1>
        <p className="mt-2 text-zinc-600">
          Informacje o wpłacie na najbliższe spotkanie — przelew <strong>BLIK</strong> na podany numer telefonu.
        </p>
      </div>

      {!nextMatch ? (
        <Card className="border-emerald-900/10 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-emerald-950">Brak nadchodzącego meczu</CardTitle>
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
                <p className="mt-3 text-xs text-emerald-100/85">
                  Zapisy na mecz: {nextMatch.signed_up}/{nextMatch.max_slots}
                </p>
              </div>
            </div>
          </Card>

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
                {nextMatch.fee_pln != null && Number.isFinite(nextMatch.fee_pln) ? (
                  <p className="mt-1 text-base font-semibold tabular-nums">
                    {formatPln(nextMatch.fee_pln)}
                  </p>
                ) : (
                  <p className="mt-1 text-amber-950/85">
                    Kwotę wpisowego ustala administrator — po zapisie sprawdź tutaj lub skontaktuj się z akademią.
                  </p>
                )}
              </div>
              <p className="text-xs text-zinc-600">
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
                <CardTitle className="text-lg text-emerald-950">Twój status</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-3">
                {userPaid ? (
                  <Badge className="border-emerald-200 bg-emerald-100 px-3 py-1 text-emerald-950">Opłacone</Badge>
                ) : (
                  <Badge variant="secondary" className="px-3 py-1">
                    Do zapłaty
                  </Badge>
                )}
                <span className="text-sm text-zinc-600">
                  {userPaid
                    ? "Dziękujemy — wpłata została potwierdzona przez administratora."
                    : "Po wysłaniu BLIK poczekaj na potwierdzenie."}
                </span>
              </CardContent>
            </Card>
          )}

          {isLoggedIn && signups.length > 0 ? (
            <Card className="mt-6 border-emerald-900/10 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-emerald-950">Zapisani na ten mecz</CardTitle>
                <CardDescription>Status opłaty widoczny dla zalogowanych użytkowników.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="max-h-80 space-y-0 overflow-y-auto rounded-xl border border-emerald-900/10 bg-emerald-50/30">
                  {signups.map((p, i) => (
                    <li
                      key={p.user_id}
                      className={`flex flex-wrap items-center gap-2 border-b border-emerald-100/90 px-3 py-2.5 text-sm last:border-b-0 ${
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
                        <PlayerNameStack
                          firstName={p.first_name}
                          lastName={p.last_name}
                          nick={p.zawodnik}
                        />
                      </div>
                      {p.paid ? (
                        <Badge className="border-emerald-200 bg-emerald-100 text-emerald-900">Opłacone</Badge>
                      ) : (
                        <Badge variant="secondary">Do zapłaty</Badge>
                      )}
                    </li>
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

function formatPln(n: number) {
  const v = Math.round(n * 100) / 100;
  return new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" }).format(v);
}
