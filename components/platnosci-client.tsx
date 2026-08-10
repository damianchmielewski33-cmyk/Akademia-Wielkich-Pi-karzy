"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LogIn, UserPlus } from "lucide-react";
import { AdminWalletsSaldoSection } from "@/components/admin-wallets-saldo-section";
import { HotpayPayButtons } from "@/components/hotpay-pay-buttons";
import { MatchCartPayPanel } from "@/components/match-cart-pay-panel";
import { PlayerWalletPanel } from "@/components/player-wallet-panel";
import { PitchCard, PitchPageHero, pitchLabelClass } from "@/components/ui/pitch-card";
import { Button } from "@/components/ui/button";
import { useHotpayPaymentReturn } from "@/hooks/use-hotpay-payment-return";

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
  currentUserId: number | null;
  hotpayEnabled: boolean;
};

export function PlatnosciClient({
  isLoggedIn,
  isAdmin,
  currentUserId,
  hotpayEnabled,
}: Props) {
  const [walletRefreshKey, setWalletRefreshKey] = useState(0);
  const [adminWalletLoading, setAdminWalletLoading] = useState(false);

  async function refreshAdminWallet() {
    if (!isLoggedIn || !isAdmin) return;
    setAdminWalletLoading(true);
    try {
      await fetch("/api/wallet/me");
    } finally {
      setAdminWalletLoading(false);
    }
  }

  useEffect(() => {
    void refreshAdminWallet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, isAdmin]);

  useHotpayPaymentReturn({
    enabled: isLoggedIn,
    onSettled: () => {
      setWalletRefreshKey((k) => k + 1);
      void refreshAdminWallet();
    },
  });

  return (
    <div className="awp-page awp-page--default text-center">
      <PitchPageHero
        title="Płatności"
        subtitle={
          isAdmin
            ? "Twoje saldo i historia, salda graczy, doładowania oraz korekty."
            : isLoggedIn
              ? hotpayEnabled
                ? "Saldo, pełna historia transakcji i opłata meczu — dla siebie i innych."
                : "Saldo, pełna historia transakcji i opłata meczu dla siebie lub innych."
              : "Zaloguj się, aby zobaczyć saldo portfela."
        }
      />

      <div className="mt-10 text-left">
        {!isLoggedIn ? (
          <PitchCard className="mx-auto max-w-md" contentClassName="px-5 py-6 text-center sm:px-6">
            <div className="flex flex-col items-center gap-2">
              <span className={pitchLabelClass}>Portfel</span>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 ring-2 ring-white/30 backdrop-blur-[2px]">
                <LogIn className="h-6 w-6 text-white" strokeWidth={2.25} aria-hidden />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-white drop-shadow-sm">Zaloguj się</h2>
              <p className="text-sm text-emerald-100/90">Po zalogowaniu zobaczysz saldo swojego portfela.</p>
            </div>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Button asChild variant="pitch">
                <Link href="/login">Logowanie</Link>
              </Button>
              <Button asChild variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/15">
                <Link href="/register">
                  <UserPlus className="mr-2 h-4 w-4" aria-hidden />
                  Rejestracja
                </Link>
              </Button>
            </div>
          </PitchCard>
        ) : isAdmin ? (
          <div className="mx-auto max-w-4xl space-y-4">
            <HotpayPayButtons
              enabled={hotpayEnabled}
              walletLoading={adminWalletLoading}
            />
            <PlayerWalletPanel
              currentUserId={currentUserId}
              hotpayEnabled={hotpayEnabled}
              showTopup={false}
              refreshKey={walletRefreshKey}
            />
            <MatchCartPayPanel
              hotpayEnabled={hotpayEnabled}
              onPaid={() => setWalletRefreshKey((k) => k + 1)}
            />
            <AdminWalletsSaldoSection embedded showPublicLinks showTopUp />
          </div>
        ) : (
          <div className="mx-auto max-w-4xl space-y-4">
            <PlayerWalletPanel
              currentUserId={currentUserId}
              hotpayEnabled={hotpayEnabled}
              refreshKey={walletRefreshKey}
            />
            <MatchCartPayPanel
              hotpayEnabled={hotpayEnabled}
              onPaid={() => setWalletRefreshKey((k) => k + 1)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
