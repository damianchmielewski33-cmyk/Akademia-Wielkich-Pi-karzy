import type { Metadata } from "next";
import { RegisterPageScreen } from "@/components/register-page-screen";
import { getDb } from "@/lib/db";
import { getAppSettings } from "@/lib/app-settings";
import { isSelfRegistrationAllowed } from "@/lib/registration-gate";

export const metadata: Metadata = {
  title: "Rejestracja",
  description: "Załóż konto i dołącz do akademii.",
};

type PageProps = { searchParams: Promise<{ next?: string }> };

export default async function RegisterPage({ searchParams }: PageProps) {
  const { next: nextRaw } = await searchParams;
  const nextPath = nextRaw && nextRaw.startsWith("/") ? nextRaw : undefined;
  const db = await getDb();
  const settings = await getAppSettings(db);
  const registrationOpen = await isSelfRegistrationAllowed(db, settings);

  return (
    <RegisterPageScreen siteName={settings.site_name} nextPath={nextPath} closed={!registrationOpen} />
  );
}
