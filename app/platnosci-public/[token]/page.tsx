import type { Metadata } from "next";
import { Suspense } from "react";
import { loadPublicShareLink, loadPublicWalletRows } from "@/lib/public-payment-share";
import { OpenDeepLinkInApp } from "@/components/open-deep-link-in-app";
import { PlatnosciPublicClient, PlatnosciPublicInactive } from "@/components/platnosci-public-client";
import { PlatnosciPublicPaymentReturn } from "@/components/platnosci-public-payment-return";
import { getAppSettings } from "@/lib/app-settings";
import { getServerSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { isHotpayConfigured } from "@/lib/hotpay";

export const metadata: Metadata = {
  title: "Podsumowanie płatności",
  description: "Publiczny podgląd sald zawodników (link od administratora).",
};

export const runtime = "nodejs";

type Ctx = { params: Promise<{ token: string }> };

export default async function PlatnosciPublicPage(ctx: Ctx) {
  const { token } = await ctx.params;
  const link = await loadPublicShareLink(String(token));

  if (!link) {
    return (
      <>
        <OpenDeepLinkInApp />
        <Suspense fallback={null}>
          <PlatnosciPublicPaymentReturn />
        </Suspense>
        <PlatnosciPublicInactive />
      </>
    );
  }

  const db = await getDb();
  const [appSettings, session] = await Promise.all([getAppSettings(db), getServerSession()]);
  const hotpayEnabled = isHotpayConfigured() && appSettings.hotpay_enabled;
  const view = await loadPublicWalletRows(link);

  return (
    <>
      <OpenDeepLinkInApp />
      <Suspense fallback={null}>
        <PlatnosciPublicPaymentReturn />
      </Suspense>
      <PlatnosciPublicClient
        token={link.token}
        hotpayEnabled={hotpayEnabled}
        isAdmin={session?.isAdmin ?? false}
        view={view}
      />
    </>
  );
}
