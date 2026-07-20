import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginPageScreen } from "@/components/login-page-screen";
import { getDb } from "@/lib/db";
import { getAppSettings } from "@/lib/app-settings";

export const metadata: Metadata = {
  title: "Logowanie",
  description: "Zaloguj się do konta zawodnika akademii.",
};

type Props = { searchParams: Promise<{ next?: string; setup?: string; wylogowano?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const { next: nextPath, setup, wylogowano } = await searchParams;

  if (setup === "1") {
    const q = new URLSearchParams();
    if (nextPath && nextPath.startsWith("/")) q.set("next", nextPath);
    redirect(q.size ? `/ustaw-pin?${q}` : "/ustaw-pin");
  }

  const db = await getDb();
  const settings = await getAppSettings(db);

  return (
    <LoginPageScreen
      siteName={settings.site_name}
      nextPath={nextPath && nextPath.startsWith("/") ? nextPath : "/"}
      idleLogout={wylogowano === "bezczynnosc"}
    />
  );
}
