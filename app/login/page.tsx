import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginPageScreen } from "@/components/login-page-screen";
import { getServerSession } from "@/lib/auth";
import { sanitizeAppBridgeNext } from "@/lib/app-bridge";
import { getRequestAppSettings } from "@/lib/request-app-settings";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getRequestAppSettings();
  if (settings.email_password_auth_enabled) {
    return {
      title: "Logowanie",
      description: "Wejście akademii — e-mail i hasło. Stare konto? Zaloguj się PIN-em i uzupełnij dane.",
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
  const safeNext = sanitizeAppBridgeNext(nextPath) ?? "/";

  if (setup === "1") {
    const q = new URLSearchParams();
    if (safeNext !== "/") q.set("next", safeNext);
    redirect(q.size ? `/ustaw-pin?${q}` : "/ustaw-pin");
  }

  if (!wylogowano) {
    const session = await getServerSession();
    if (session && !session.needsPinSetup && !session.pinChangePending) {
      redirect(safeNext);
    }
  }

  const settings = await getRequestAppSettings();

  return (
    <LoginPageScreen
      siteName={settings.site_name}
      nextPath={safeNext}
      idleLogout={wylogowano === "bezczynnosc"}
      emailPasswordAuthEnabled={settings.email_password_auth_enabled === true}
    />
  );
}
