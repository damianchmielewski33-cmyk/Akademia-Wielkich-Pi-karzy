import type { Metadata } from "next";
import { RegisterPageScreen } from "@/components/register-page-screen";
import { getRequestAppSettings } from "@/lib/request-app-settings";
import { sanitizeAppBridgeNext } from "@/lib/app-bridge";

export const metadata: Metadata = {
  title: "Rejestracja",
  description: "Załóż konto i dołącz do akademii.",
};

type PageProps = { searchParams: Promise<{ next?: string }> };

export default async function RegisterPage({ searchParams }: PageProps) {
  const { next: nextRaw } = await searchParams;
  const nextPath = sanitizeAppBridgeNext(nextRaw) ?? undefined;
  const settings = await getRequestAppSettings();

  return (
    <RegisterPageScreen siteName={settings.site_name} nextPath={nextPath} />
  );
}
