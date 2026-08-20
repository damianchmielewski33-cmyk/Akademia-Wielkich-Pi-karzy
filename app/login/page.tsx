import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginPageScreen } from "@/components/login-page-screen";
import { getDb } from "@/lib/db";
import { getAppSettings } from "@/lib/app-settings";
import { getServerSession } from "@/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  const db = await getDb();
  const settings = await getAppSettings(db);
  if (!settings.booking_marketplace_enabled) {
    return {
      title: "Logowanie",
      description: "Wejście akademii — imię, nazwisko i PIN.",
    };
  }
  return {
    title: "Logowanie",
    description: "PIN akademii albo rezerwacja boiska bez konta — to dwa osobne wejścia.",
  };
}

type Props = { searchParams: Promise<{ next?: string; setup?: string; wylogowano?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const { next: nextPath, setup, wylogowano } = await searchParams;

  if (setup === "1") {
    const q = new URLSearchParams();
    if (nextPath && nextPath.startsWith("/")) q.set("next", nextPath);
    redirect(q.size ? `/ustaw-pin?${q}` : "/ustaw-pin");
  }

  if (!wylogowano) {
    const session = await getServerSession();
    if (session && !session.needsPinSetup && !session.pinChangePending) {
      redirect(nextPath && nextPath.startsWith("/") ? nextPath : "/");
    }
  }

  const db = await getDb();
  const settings = await getAppSettings(db);

  return (
    <LoginPageScreen
      siteName={settings.site_name}
      nextPath={nextPath && nextPath.startsWith("/") ? nextPath : "/"}
      idleLogout={wylogowano === "bezczynnosc"}
      marketplaceEnabled={settings.booking_marketplace_enabled === true}
    />
  );
}
