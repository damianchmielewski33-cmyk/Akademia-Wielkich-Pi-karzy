"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AdminWalletsSaldoSection } from "@/components/admin-wallets-saldo-section";
import { PitchPageHero } from "@/components/ui/pitch-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type PlatnosciUserLite = {
  id: number;
  first_name: string;
  last_name: string;
  zawodnik: string;
  profile_photo_path: string | null;
};

type Props = {
  isLoggedIn: boolean;
  isAdmin: boolean;
};

function formatPln(n: number) {
  const v = Math.round(n * 100) / 100;
  return new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" }).format(v);
}

export function PlatnosciClient({ isLoggedIn, isAdmin }: Props) {
  const [walletBalancePln, setWalletBalancePln] = useState<number | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);

  async function refreshWallet() {
    if (!isLoggedIn || isAdmin) return;
    setWalletLoading(true);
    try {
      const res = await fetch("/api/wallet/me");
      const json = (await res.json().catch(() => null)) as { balance_pln?: unknown; error?: unknown } | null;
      if (!res.ok) {
        const msg = json?.error;
        toast.error(typeof msg === "string" ? msg : "Nie udało się wczytać salda");
        return;
      }
      setWalletBalancePln(Number(json?.balance_pln ?? 0));
    } catch {
      toast.error("Błąd sieci");
    } finally {
      setWalletLoading(false);
    }
  }

  useEffect(() => {
    void refreshWallet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, isAdmin]);

  return (
    <div className="container mx-auto max-w-2xl flex-1 px-4 py-8 sm:py-10">
      <PitchPageHero
        title="Płatności"
        subtitle={
          isAdmin
            ? "Salda portfeli zawodników, korekty i linki do podsumowań płatności."
            : isLoggedIn
              ? "Twoje aktualne saldo portfela."
              : "Zaloguj się, aby zobaczyć saldo portfela."
        }
      />

      <div className="mt-8">
      {!isLoggedIn ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Zaloguj się</CardTitle>
            <CardDescription>Po zalogowaniu zobaczysz saldo swojego portfela.</CardDescription>
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
      ) : isAdmin ? (
        <AdminWalletsSaldoSection embedded showPublicLinks />
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Twój portfel</CardTitle>
            <CardDescription>Aktualne saldo po rozliczeniach administratora.</CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                "pitch-panel flex flex-wrap items-center justify-between gap-3 px-4 py-4",
                walletBalancePln != null && walletBalancePln < 0 && "border-red-200/40 bg-red-950/25",
                walletBalancePln != null && walletBalancePln > 0 && "border-emerald-200/40 bg-emerald-500/10"
              )}
            >
              <div>
                <p className="pitch-label">Saldo</p>
                <p
                  className={cn(
                    "mt-1 text-3xl font-bold tabular-nums text-white",
                    walletBalancePln == null && "text-white/75",
                    walletBalancePln != null && walletBalancePln < 0 && "text-red-200",
                    walletBalancePln != null && walletBalancePln > 0 && "text-emerald-100"
                  )}
                >
                  {walletBalancePln === null ? "—" : formatPln(walletBalancePln)}
                </p>
                {walletBalancePln != null && walletBalancePln < 0 ? (
                  <p className="mt-1 text-xs font-medium text-red-200">Niedopłata do uregulowania</p>
                ) : walletBalancePln != null && walletBalancePln > 0 ? (
                  <p className="mt-1 text-xs font-medium text-emerald-100">Nadwyżka na koncie</p>
                ) : null}
              </div>
              <Button type="button" variant="pitch" disabled={walletLoading} onClick={() => void refreshWallet()}>
                {walletLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
                Odśwież
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      </div>
    </div>
  );
}
