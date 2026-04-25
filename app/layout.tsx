import type { Metadata } from "next";
import { Geist, Geist_Mono, Teko } from "next/font/google";
import { Toaster } from "sonner";
import { SiteShell } from "@/components/site-shell";
import { ShareLinkClientCleanup } from "@/components/share-link-client-cleanup";
import { MatchParticipationSurveyPrompt } from "@/components/match-participation-survey-prompt";
import { MatchNotificationPrompt } from "@/components/match-notification-prompt";
import { PinSetupGate } from "@/components/pin-setup-gate";
import { SessionIdleMonitor } from "@/components/session-idle-monitor";
import { getAccountNavFields } from "@/lib/account-server";
import { getServerSession } from "@/lib/auth";
import { normalizeUiTheme } from "@/lib/ui-theme";
import { getDb } from "@/lib/db";
import { SiteJsonLd } from "@/components/site-json-ld";
import { getGoogleSiteVerification, getSiteUrl, SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const displayFont = Teko({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  applicationName: SITE_NAME,
  title: {
    default: SITE_NAME,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  icons: {
    icon: [{ url: "/logo-akademia.svg", type: "image/svg+xml" }],
    apple: [{ url: "/logo-akademia.svg", type: "image/svg+xml" }],
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "pl_PL",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  verification: {
    google: getGoogleSiteVerification(),
  },
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

  const accountRow = session ? await getAccountNavFields(session.userId) : null;
  const htmlThemeClass = accountRow && normalizeUiTheme(accountRow.uiTheme) === "dark" ? "dark" : "";

  let accountNav: {
    firstName: string;
    lastName: string;
    zawodnik: string;
    profilePhotoPath: string | null;
  } | null = null;
  if (loggedInFull) {
    accountNav = {
      firstName: accountRow?.firstName ?? session!.firstName,
      lastName: accountRow?.lastName ?? session!.lastName,
      zawodnik: accountRow?.zawodnik ?? session!.zawodnik,
      profilePhotoPath: accountRow?.profilePhotoPath ?? null,
    };
  }

  const sessionIdleLogout = Boolean(session && !session.rememberMe);

  const db = await getDb();
  const settingsRow = (await db
    .prepare("SELECT match_notification_prompt_enabled FROM app_settings WHERE id = 1")
    .get()) as { match_notification_prompt_enabled: number } | undefined;
  const matchNotificationPromptEnabled = (settingsRow?.match_notification_prompt_enabled ?? 0) === 1;

  return (
    <html lang="pl" className={htmlThemeClass}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${displayFont.variable} murawa-bg min-h-screen antialiased font-sans`}
      >
        <SiteJsonLd />
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
                "group rounded-xl border border-emerald-200/90 bg-white/95 font-sans shadow-[0_12px_40px_-12px_rgba(5,80,55,0.28)] backdrop-blur-md dark:border-emerald-800/50 dark:bg-zinc-900/95 dark:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.45)]",
              title: "text-[15px] font-semibold text-emerald-950 dark:text-emerald-100",
              description: "text-sm text-slate-600 dark:text-zinc-400",
              closeButton:
                "rounded-lg border border-emerald-100 bg-white text-emerald-800 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-zinc-800 dark:text-emerald-200 dark:hover:bg-zinc-700",
            },
          }}
        />
      </body>
    </html>
  );
}
