import type { Metadata } from "next";
import { getServerSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getAppSettings } from "@/lib/app-settings";
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
    <PlatnosciClient
      isLoggedIn={Boolean(session)}
      isAdmin={session?.isAdmin ?? false}
      blikPhoneDisplay={appSettings.blik_phone}
      defaultMatchFeePln={appSettings.default_match_fee_pln}
      playerLabel={playerLabel}
    />
  );
}
