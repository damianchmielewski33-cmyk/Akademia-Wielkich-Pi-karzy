"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LogIn, RefreshCw, UserPlus, Wallet } from "lucide-react";
import { AdminWalletsSaldoSection } from "@/components/admin-wallets-saldo-section";
import { AdminCard, AdminToolbar, adminEmptyStateClass } from "@/components/admin-ui";
import { HotpayPayButtons } from "@/components/hotpay-pay-buttons";
import { MatchCartPayPanel } from "@/components/match-cart-pay-panel";
import { MarketplacePitchPhoto } from "@/components/marketplace-pitch-photo";
import { PlayerWalletPanel } from "@/components/player-wallet-panel";
import { PhotoPanel } from "@/components/photo-panel";
import { useSiteMode } from "@/components/site-mode";
import { Button } from "@/components/ui/button";
import { useHotpayPaymentReturn } from "@/hooks/use-hotpay-payment-return";
import { MARKETPLACE_PITCH_PHOTOS } from "@/lib/marketplace-photos";
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
  hotpayEnabled: boolean;
};

export function PlatnosciClient({
  isLoggedIn,
  isAdmin,
  hotpayEnabled,
}: Props) {
  const { marketplaceEnabled } = useSiteMode();
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
      ? "Twoje saldo, historia, salda graczy oraz doładowania."
      : hotpayEnabled
        ? "Saldo, historia i opłata meczu — dla siebie i innych."
        : "Saldo, historia i opłata meczu dla siebie lub innych.";

  const body = !isLoggedIn ? (
    marketplaceEnabled ? (
      <PhotoPanel
        src={MARKETPLACE_PITCH_PHOTOS[4]}
        className="min-h-[16rem] rounded-3xl"
        contentClassName="flex min-h-[16rem] flex-col items-center justify-center gap-4 px-6 py-10 text-center"
        sizes="(max-width: 768px) 100vw, 1152px"
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--mp-teal)] text-white shadow-lg">
          <Wallet className="h-7 w-7" aria-hidden />
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/80">Portfel</p>
          <h2 className="mt-1 text-2xl font-black text-white">Zaloguj się, by płacić</h2>
          <p className="mt-2 text-sm text-white/85">
            Saldo, historia i opłaty za mecze są dostępne po wejściu na konto.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <Button asChild className="h-11 rounded-full bg-white px-6 font-bold text-zinc-950 hover:bg-zinc-100">
            <Link href="/login">
              <LogIn className="mr-2 h-4 w-4" aria-hidden />
              Logowanie
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-11 rounded-full border-white/40 bg-white/10 px-6 font-bold text-white hover:bg-white/20"
          >
            <Link href="/register">
              <UserPlus className="mr-2 h-4 w-4" aria-hidden />
              Rejestracja
            </Link>
          </Button>
        </div>
      </PhotoPanel>
    ) : (
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
    )
  ) : isAdmin ? (
    <div className="space-y-6">
      <HotpayPayButtons enabled={hotpayEnabled} walletLoading={adminWalletLoading} />
      <PlayerWalletPanel
        hotpayEnabled={hotpayEnabled}
        showTopup={false}
        refreshKey={walletRefreshKey}
      />
      <MatchCartPayPanel
        hotpayEnabled={hotpayEnabled}
        refreshKey={walletRefreshKey}
        onPaid={() => setWalletRefreshKey((k) => k + 1)}
      />
      <AdminWalletsSaldoSection embedded showPublicLinks showTopUp />
    </div>
  ) : (
    <div className="space-y-6">
      <PlayerWalletPanel
        hotpayEnabled={hotpayEnabled}
        refreshKey={walletRefreshKey}
      />
      <MatchCartPayPanel
        hotpayEnabled={hotpayEnabled}
        refreshKey={walletRefreshKey}
        onPaid={() => setWalletRefreshKey((k) => k + 1)}
      />
    </div>
  );

  if (marketplaceEnabled) {
    return (
      <div className="relative flex flex-1 flex-col text-zinc-900 dark:text-zinc-50">
        <section className="mp-hero mp-hero--photo relative z-10 flex flex-col justify-end overflow-hidden pb-10 pt-12 sm:pb-16 sm:pt-20">
          <MarketplacePitchPhoto src={MARKETPLACE_PITCH_PHOTOS[2]} priority className="z-0" />
          <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black/75 via-black/40 to-black/20" />
          <div className="relative z-10 mx-auto w-full max-w-6xl px-3 xs:px-4">
            <p className="text-[0.65rem] font-black uppercase tracking-[0.22em] text-white/80 sm:text-xs">
              {isAdmin ? "Admin · Portfel" : "Akademia"}
            </p>
            <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h1 className="text-[1.85rem] font-black leading-tight tracking-tight text-white xs:text-4xl sm:text-5xl">
                  Płatności
                </h1>
                <p className="mt-3 max-w-xl text-sm text-white/85 sm:text-base">{subtitle}</p>
              </div>
              <Button
                type="button"
                variant="secondary"
                className="h-11 rounded-full bg-white px-5 font-bold text-zinc-950 hover:bg-zinc-100"
                disabled={adminWalletLoading}
                onClick={reloadPage}
              >
                <RefreshCw className={cn("mr-2 h-4 w-4", adminWalletLoading && "animate-spin")} aria-hidden />
                Odśwież
              </Button>
            </div>
          </div>
        </section>
        <div className="relative z-10 mx-auto w-full min-w-0 max-w-6xl space-y-6 px-3 py-8 xs:px-4 sm:py-10">
          {body}
        </div>
      </div>
    );
  }

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
        {body}
      </div>
    </div>
  );
}
