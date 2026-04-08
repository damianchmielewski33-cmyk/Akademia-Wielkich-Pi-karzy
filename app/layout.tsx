import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { SiteShell } from "@/components/site-shell";
import { ShareLinkClientCleanup } from "@/components/share-link-client-cleanup";
import { MatchParticipationSurveyPrompt } from "@/components/match-participation-survey-prompt";
import { MatchNotificationPrompt } from "@/components/match-notification-prompt";
import { PinSetupGate } from "@/components/pin-setup-gate";
import { SessionIdleMonitor } from "@/components/session-idle-monitor";
import { getAccountNavFields } from "@/lib/account-server";
import { getServerSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { SITE_NAME } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: SITE_NAME,
    template: `%s · ${SITE_NAME}`,
  },
  description: "Terminarz, statystyki i społeczność na boisku",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession();
  const loggedInFull = Boolean(
    session && !session.needsPinSetup && !session.pinChangePending
  );

  let accountNav: {
    firstName: string;
    lastName: string;
    zawodnik: string;
    profilePhotoPath: string | null;
  } | null = null;
  if (loggedInFull) {
    const row = await getAccountNavFields(session!.userId);
    accountNav = {
      firstName: row?.firstName ?? session!.firstName,
      lastName: row?.lastName ?? session!.lastName,
      zawodnik: row?.zawodnik ?? session!.zawodnik,
      profilePhotoPath: row?.profilePhotoPath ?? null,
    };
  }

  const sessionIdleLogout = Boolean(session && !session.rememberMe);

  const db = await getDb();
  const settingsRow = (await db
    .prepare("SELECT match_notification_prompt_enabled FROM app_settings WHERE id = 1")
    .get()) as { match_notification_prompt_enabled: number } | undefined;
  const matchNotificationPromptEnabled = (settingsRow?.match_notification_prompt_enabled ?? 0) === 1;

  return (
    <html lang="pl">
      <body className={`${geistSans.variable} ${geistMono.variable} murawa-bg min-h-screen antialiased font-sans`}>
        <SessionIdleMonitor enabled={sessionIdleLogout} />
        <ShareLinkClientCleanup />
        <PinSetupGate>
          <SiteShell
            isLoggedIn={loggedInFull}
            isAdmin={session?.isAdmin && loggedInFull ? true : false}
            account={accountNav}
          >
            {children}
          </SiteShell>
        </PinSetupGate>
        <MatchParticipationSurveyPrompt />
        {matchNotificationPromptEnabled ? <MatchNotificationPrompt /> : null}
        <Toaster
          position="top-center"
          richColors
          closeButton
          toastOptions={{
            duration: 4200,
            classNames: {
              toast:
                "group rounded-xl border border-emerald-200/90 bg-white/95 font-sans shadow-[0_12px_40px_-12px_rgba(5,80,55,0.28)] backdrop-blur-md",
              title: "text-[15px] font-semibold text-emerald-950",
              description: "text-sm text-slate-600",
              closeButton:
                "rounded-lg border border-emerald-100 bg-white text-emerald-800 hover:bg-emerald-50",
            },
          }}
        />
      </body>
    </html>
  );
}
