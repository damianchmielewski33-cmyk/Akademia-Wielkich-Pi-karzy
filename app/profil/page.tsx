import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProfilClient } from "@/components/profil-client";
import { getServerSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getAppSettings } from "@/lib/app-settings";
import { isHotpayConfigured } from "@/lib/hotpay";
import { getProfileDashboard } from "@/lib/profile-data";
import { getUserWalletBalancePln } from "@/lib/wallet";

export const metadata: Metadata = {
  title: "Mój profil",
  description: "Edycja profilu, saldo portfela, zdjęcia, awatara i statystyk z meczów.",
};

export default async function ProfilPage() {
  const session = await getServerSession();
  if (!session) redirect("/login?next=/profil");

  const initial = await getProfileDashboard(session.userId);
  if (!initial) redirect("/login");

  const [walletBalancePln, db] = await Promise.all([
    getUserWalletBalancePln(session.userId),
    getDb(),
  ]);
  const appSettings = await getAppSettings(db);

  return (
    <ProfilClient
      initial={initial}
      walletBalancePln={walletBalancePln}
      hotpayEnabled={isHotpayConfigured() && appSettings.hotpay_enabled}
    />
  );
}
