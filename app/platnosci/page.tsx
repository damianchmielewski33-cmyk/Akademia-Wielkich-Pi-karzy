import type { Metadata } from "next";
import { Suspense } from "react";
import { getServerSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getAppSettings } from "@/lib/app-settings";
import { isHotpayConfigured } from "@/lib/hotpay";
import { PlatnosciClient } from "@/components/platnosci-client";

export const metadata: Metadata = {
  title: "Płatności",
  description: "Saldo portfela zawodnika lub zarządzanie saldami przez administratora.",
};

export default async function PlatnosciPage() {
  const session = await getServerSession();
  const db = await getDb();
  const appSettings = await getAppSettings(db);

  const playerLabel = session
    ? [session.firstName, session.lastName].filter(Boolean).join(" ").trim() || session.zawodnik
    : "";

  return (
    <Suspense fallback={<div className="awp-page awp-page--default p-8 text-center text-sm text-zinc-500">Ładowanie płatności…</div>}>
      <PlatnosciClient
        isLoggedIn={Boolean(session)}
        isAdmin={session?.isAdmin ?? false}
        currentUserId={session?.userId ?? null}
        blikPhoneDisplay={appSettings.blik_phone}
        defaultMatchFeePln={appSettings.default_match_fee_pln}
        playerLabel={playerLabel}
        hotpayEnabled={isHotpayConfigured()}
      />
    </Suspense>
  );
}
