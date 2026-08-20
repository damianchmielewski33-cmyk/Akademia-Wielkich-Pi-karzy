import type { Metadata } from "next";
import { RegisterPageScreen } from "@/components/register-page-screen";
import { getRequestAppSettings } from "@/lib/request-app-settings";
import { sanitizeAppBridgeNext } from "@/lib/app-bridge";
import { getDb } from "@/lib/db";
import { isSelfRegistrationAllowed } from "@/lib/registration-gate";

export const metadata: Metadata = {
  title: "Rejestracja",
  description: "Załóż konto i dołącz do akademii.",
};

type PageProps = { searchParams: Promise<{ next?: string }> };

export default async function RegisterPage({ searchParams }: PageProps) {
  const { next: nextRaw } = await searchParams;
  const nextPath = sanitizeAppBridgeNext(nextRaw) ?? undefined;
  const settings = await getRequestAppSettings();
  const db = await getDb();
  const allowed = await isSelfRegistrationAllowed(db, {
    allow_self_registration: settings.allow_self_registration,
  });

  return (
    <RegisterPageScreen
      siteName={settings.site_name}
      nextPath={nextPath}
      closed={!allowed}
      marketplaceEnabled={settings.booking_marketplace_enabled === true}
    />
  );
}
