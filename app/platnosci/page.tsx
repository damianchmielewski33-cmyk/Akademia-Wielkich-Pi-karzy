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

  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-zinc-500 dark:text-zinc-400">Ładowanie płatności…</div>}>
      <PlatnosciClient
        isLoggedIn={Boolean(session)}
        isAdmin={session?.isAdmin ?? false}
        currentUserId={session?.userId ?? null}
        hotpayEnabled={isHotpayConfigured() && appSettings.hotpay_enabled}
      />
    </Suspense>
  );
}
