"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LogIn, UserPlus } from "lucide-react";
import { AdminWalletsSaldoSection } from "@/components/admin-wallets-saldo-section";
import { HotpayPayButtons } from "@/components/hotpay-pay-buttons";
import { PayMatchButton } from "@/components/pay-match-button";
import { formatWalletPln, PlayerWalletPanel } from "@/components/player-wallet-panel";
import { useAppMessage } from "@/components/ui/app-message-modal";
import { PitchCard, PitchPageHero, pitchLabelClass } from "@/components/ui/pitch-card";
import { Button } from "@/components/ui/button";

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
  blikPhoneDisplay: string;
  defaultMatchFeePln: number | null;
  playerLabel: string;
  hotpayEnabled: boolean;
};

export function PlatnosciClient({
  isLoggedIn,
  isAdmin,
  currentUserId,
  blikPhoneDisplay,
  defaultMatchFeePln,
  playerLabel,
  hotpayEnabled,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paymentReturnHandled = useRef(false);
  const [walletRefreshKey, setWalletRefreshKey] = useState(0);
  const [adminBalancePln, setAdminBalancePln] = useState<number | null>(null);
  const [adminWalletLoading, setAdminWalletLoading] = useState(false);
  const { showError, showSuccess, showInfo, MessageModal } = useAppMessage();

  const meczRaw = searchParams.get("mecz");
  const initialMatchId = (() => {
    if (!meczRaw) return null;
    const n = Number.parseInt(meczRaw, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  })();

  async function refreshAdminWallet() {
    if (!isLoggedIn || !isAdmin) return;
    setAdminWalletLoading(true);
    try {
      const res = await fetch("/api/wallet/me");
      const json = (await res.json().catch(() => null)) as { balance_pln?: unknown } | null;
      if (res.ok) setAdminBalancePln(Number(json?.balance_pln ?? 0));
    } finally {
      setAdminWalletLoading(false);
    }
  }

  useEffect(() => {
    void refreshAdminWallet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, isAdmin]);

  useEffect(() => {
    if (!isLoggedIn || paymentReturnHandled.current) return;
    const payment = searchParams.get("payment");
    const sessionId = searchParams.get("session_id");
    if (!payment) return;
    paymentReturnHandled.current = true;

    const clearQuery = () => {
      router.replace("/platnosci", { scroll: false });
    };

    async function handleReturn() {
      if (payment === "error" || payment === "cancelled" || payment === "failure") {
        showError(
          payment === "cancelled" ? "Płatność została anulowana" : "Płatność HotPay nie powiodła się",
          "HotPay"
        );
        clearQuery();
        return;
      }

      if (payment === "success") {
        showSuccess("Wpłata zaksięgowana na portfelu", "HotPay");
        setWalletRefreshKey((k) => k + 1);
        await refreshAdminWallet();
        clearQuery();
        return;
      }

      if (sessionId) {
        // HotPay wraca zawsze na ADRES_WWW bez STATUS — wynik jest w notyfikacji (SUCCESS/PENDING/FAILURE).
        showInfo("Sprawdzamy status płatności HotPay…", "HotPay");
        for (let i = 0; i < 10; i++) {
          try {
            const res = await fetch(`/api/wallet/hotpay/status?session_id=${encodeURIComponent(sessionId)}`);
            const data = (await res.json().catch(() => null)) as {
              status?: string;
              error_message?: string | null;
              amount_pln?: number;
            } | null;
            if (res.ok && data?.status === "success") {
              showSuccess(
                typeof data.amount_pln === "number"
                  ? `Wpłata ${formatWalletPln(data.amount_pln)} zaksięgowana na portfelu`
                  : "Wpłata zaksięgowana na portfelu",
                "HotPay"
              );
              setWalletRefreshKey((k) => k + 1);
              await refreshAdminWallet();
              clearQuery();
              return;
            }
            if (res.ok && (data?.status === "failure" || data?.status === "cancelled")) {
              showError(
                data.error_message ||
                  (data.status === "cancelled"
                    ? "Płatność została anulowana"
                    : "Płatność HotPay została odrzucona"),
                "HotPay"
              );
              clearQuery();
              return;
            }
          } catch {
            /* retry */
          }
          await new Promise((r) => setTimeout(r, 1200));
        }

        // Brak SUCCESS/FAILURE z webhooka (częste przy anulowaniu BLIK) — oznacz lokalnie i pokaż błąd.
        try {
          await fetch("/api/wallet/hotpay/abandon", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ session_id: sessionId }),
          });
        } catch {
          /* ignore */
        }
        showError(
          "Płatność nie została potwierdzona. Jeśli anulowałeś lub odrzuciłeś BLIK — transakcja nie przeszła i saldo się nie zmieni.",
          "HotPay"
        );
        setWalletRefreshKey((k) => k + 1);
        await refreshAdminWallet();
        clearQuery();
        return;
      }

      showInfo("Wróciłeś z płatności — odśwież saldo, jeśli środki jeszcze nie widać.", "HotPay");
      setWalletRefreshKey((k) => k + 1);
      await refreshAdminWallet();
      clearQuery();
    }

    void handleReturn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, searchParams]);

  return (
    <div className="awp-page awp-page--default text-center">
      <PitchPageHero
        title="Płatności"
        subtitle={
          isAdmin
            ? "Salda portfeli, doładowania po przelewie i korekty — w stylu reszty akademii."
            : isLoggedIn
              ? hotpayEnabled
                ? "Saldo → doładuj HotPay → opłać mecz. BLIK i przelewy są w zaawansowanych."
                : "Saldo, opłata meczu i historia. BLIK oraz przelewy są w zaawansowanych."
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
              balancePln={adminBalancePln}
              defaultMatchFeePln={defaultMatchFeePln}
              walletLoading={adminWalletLoading}
            />
            <PayMatchButton
              blikPhoneDisplay={blikPhoneDisplay}
              defaultMatchFeePln={defaultMatchFeePln}
              balancePln={adminBalancePln}
              playerLabel={playerLabel}
            />
            <AdminWalletsSaldoSection embedded showPublicLinks showTopUp />
          </div>
        ) : (
          <div className="mx-auto max-w-4xl">
            <PlayerWalletPanel
              currentUserId={currentUserId}
              blikPhoneDisplay={blikPhoneDisplay}
              defaultMatchFeePln={defaultMatchFeePln}
              playerLabel={playerLabel}
              hotpayEnabled={hotpayEnabled}
              refreshKey={walletRefreshKey}
              initialMatchId={initialMatchId}
            />
          </div>
        )}
      </div>
      {MessageModal}
    </div>
  );
}
