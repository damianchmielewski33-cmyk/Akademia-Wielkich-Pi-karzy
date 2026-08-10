"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LogIn, UserPlus } from "lucide-react";
import { AdminWalletsSaldoSection } from "@/components/admin-wallets-saldo-section";
import { HotpayPayButtons } from "@/components/hotpay-pay-buttons";
import { MatchCartPayPanel } from "@/components/match-cart-pay-panel";
import { PlayerWalletPanel } from "@/components/player-wallet-panel";
import { AdminCard, AdminToolbar, adminEmptyStateClass } from "@/components/admin-ui";
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

  function reloadPage() {
    setWalletRefreshKey((k) => k + 1);
    void refreshAdminWallet();
  }

  const subtitle = !isLoggedIn
    ? "Zaloguj się, aby zobaczyć saldo portfela."
    : isAdmin
      ? "Twoje saldo i historia, salda graczy, doładowania oraz korekty."
      : hotpayEnabled
        ? "Saldo, pełna historia transakcji i opłata meczu — dla siebie i innych."
        : "Saldo, pełna historia transakcji i opłata meczu dla siebie lub innych.";

  return (
    <div className="relative text-white">
      <div className="relative z-10 mx-auto w-full min-w-0 max-w-6xl p-3 xs:p-4 sm:p-6 lg:p-8">
        <AdminToolbar
          title="Płatności"
          kicker={isAdmin ? "Panel admina" : "Akademia Wielkich Piłkarzy"}
          description={subtitle}
          onReload={reloadPage}
          loading={adminWalletLoading}
        />

        {!isLoggedIn ? (
          <AdminCard title="Portfel" description="Po zalogowaniu zobaczysz saldo swojego portfela.">
            <div className={adminEmptyStateClass}>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/15 ring-2 ring-white/30">
                <LogIn className="h-6 w-6 text-white" strokeWidth={2.25} aria-hidden />
              </div>
              <p className="mt-3 text-sm text-emerald-100/90">Zaloguj się lub załóż konto, aby korzystać z płatności.</p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <Button asChild variant="gold">
                  <Link href="/login">Logowanie</Link>
                </Button>
                <Button asChild variant="gold">
                  <Link href="/register">
                    <UserPlus className="mr-2 h-4 w-4" aria-hidden />
                    Rejestracja
                  </Link>
                </Button>
              </div>
            </div>
          </AdminCard>
        ) : isAdmin ? (
          <div className="space-y-6">
            <HotpayPayButtons enabled={hotpayEnabled} walletLoading={adminWalletLoading} />
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
            <AdminWalletsSaldoSection showPublicLinks showTopUp />
          </div>
        ) : (
          <div className="space-y-6">
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
