import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { headers, cookies } from "next/headers";
import { Geist, Geist_Mono, Teko } from "next/font/google";
import { Toaster } from "sonner";
import { SiteShell } from "@/components/site-shell";
import { ShareLinkClientCleanup } from "@/components/share-link-client-cleanup";
import { MatchParticipationSurveyPrompt } from "@/components/match-participation-survey-prompt";
import { MatchNotificationPrompt } from "@/components/match-notification-prompt";
import { PinChangePendingBanner } from "@/components/pin-change-pending-banner";
import { PinSetupGate } from "@/components/pin-setup-gate";
import { SessionIdleMonitor } from "@/components/session-idle-monitor";
import { getAccountNavFields } from "@/lib/account-server";
import { getServerSession } from "@/lib/auth";
import { normalizeUiTheme } from "@/lib/ui-theme";
import { getDb } from "@/lib/db";
import { getUserWalletBalancePln } from "@/lib/wallet";
import { WalletBalanceFloat } from "@/components/wallet-balance-float";
import { WriteToAdminFloat } from "@/components/write-to-admin-float";
import { SiteJsonLd } from "@/components/site-json-ld";
import { SiteAssetsProvider } from "@/components/site-assets-provider";
import { ScreenBlocksProvider } from "@/components/screen-blocks-provider";
import { ScreenBlockPlaceholder } from "@/components/screen-block-placeholder";
import { AdminScreenBlockPreviewBanner } from "@/components/admin-screen-block-preview-banner";
import { ScreenBlockPreviewContent } from "@/components/screen-block-preview-content";
import { getGoogleSiteVerification, getSiteUrl } from "@/lib/site";
import { getAppSettings } from "@/lib/app-settings";
import {
  getScreenKeyFromPathname,
  isScreenDisabledForUser,
  screenBlockMessage,
  screenLabel,
} from "@/lib/screen-blocks";
import { getUnreadAdminMessageCount } from "@/lib/admin-messages";
import { contactAdminRecipientsFromSettings } from "@/lib/contact-admin-recipients";
import { siteAssetCssUrl } from "@/lib/site-assets";
import { PREVIEW_BLOCKED_COOKIE } from "@/lib/constants";
import { isPreviewBlockedCookieValue } from "@/lib/screen-block-preview";
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

export async function generateMetadata(): Promise<Metadata> {
  const db = await getDb();
  const settings = await getAppSettings(db);
  const siteName = settings.site_name;
  const siteDescription = settings.site_description;
  const favicon = settings.site_assets.logo_favicon;
  const faviconType = favicon.toLowerCase().endsWith(".svg") ? "image/svg+xml" : "image/png";
  return {
    metadataBase: new URL(getSiteUrl()),
    applicationName: siteName,
    title: {
      default: siteName,
      template: `%s · ${siteName}`,
    },
    description: siteDescription,
    icons: {
      icon: [{ url: favicon, type: faviconType }],
      apple: [{ url: favicon, type: faviconType }],
    },
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      type: "website",
      locale: "pl_PL",
      siteName,
      title: siteName,
      description: siteDescription,
    },
    twitter: {
      card: "summary_large_image",
      title: siteName,
      description: siteDescription,
    },
    verification: {
      google: getGoogleSiteVerification(),
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession();
  const headerStore = await headers();
  const cookieStore = await cookies();
  const pathname = headerStore.get("x-pathname") ?? "";
  const previewBlocked =
    headerStore.get("x-preview-blocked") === "1" ||
    isPreviewBlockedCookieValue(cookieStore.get(PREVIEW_BLOCKED_COOKIE)?.value);
  const isPzuCupSection = pathname.startsWith("/pzu-cup");
  const loggedInFull = Boolean(
    session && !session.needsPinSetup && !session.pinChangePending
  );

  const accountRow = session ? await getAccountNavFields(session.userId) : null;
  const htmlThemeClass = accountRow ? (normalizeUiTheme(accountRow.uiTheme) === "dark" ? "dark" : "") : "dark";

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
  const appSettings = await getAppSettings(db);
  const settingsRow = (await db
    .prepare("SELECT match_notification_prompt_enabled FROM app_settings WHERE realm = 'academy'")
    .get()) as { match_notification_prompt_enabled: number } | undefined;
  const matchNotificationPromptEnabled = (settingsRow?.match_notification_prompt_enabled ?? 0) === 1;

  const walletBalancePln =
    loggedInFull && session ? await getUserWalletBalancePln(session.userId) : null;

  let writeToAdminDefaults: { senderName: string } | null = null;
  if (session) {
    const senderName =
      [accountRow?.firstName ?? session.firstName, accountRow?.lastName ?? session.lastName]
        .filter(Boolean)
        .join(" ")
        .trim() || session.zawodnik;
    writeToAdminDefaults = { senderName };
  }

  const contactAdminRecipients = contactAdminRecipientsFromSettings(appSettings);

  const isAdmin = Boolean(session?.isAdmin && loggedInFull);
  /** Podgląd zaślepki — widok gracza dla każdego z aktywnym ciasteczkiem / parametrem (ustawiane z panelu admina). */
  const screenBlocksAsPlayer = previewBlocked;
  const shellIsAdmin = isAdmin && !screenBlocksAsPlayer;
  const adminUnreadMessages = isAdmin ? await getUnreadAdminMessageCount(db) : 0;

  const screenKey = !isPzuCupSection ? getScreenKeyFromPathname(pathname) : null;
  const screenBlocksAdminBypass = shellIsAdmin;
  const screenBlockedForPlayers =
    screenKey != null && isScreenDisabledForUser(appSettings.screen_blocks, screenKey, false);
  const screenBlocked =
    screenKey != null && isScreenDisabledForUser(appSettings.screen_blocks, screenKey, screenBlocksAdminBypass);

  let mainContent = children;
  if (screenBlocksAsPlayer && screenKey) {
    mainContent = (
      <>
        <AdminScreenBlockPreviewBanner
          mode="as-player"
          screenTitle={screenLabel(screenKey)}
          blocked={screenBlocked}
        />
        {screenBlocked ? (
          <ScreenBlockPreviewContent
            screenKey={screenKey}
            screenTitle={screenLabel(screenKey)}
            serverBlocked={screenBlocked}
            serverMessage={screenBlockMessage(appSettings.screen_blocks, screenKey)}
          >
            {children}
          </ScreenBlockPreviewContent>
        ) : (
          children
        )}
      </>
    );
  } else if (screenBlocked && screenKey) {
    mainContent = (
      <ScreenBlockPlaceholder
        title={screenLabel(screenKey)}
        message={screenBlockMessage(appSettings.screen_blocks, screenKey)}
      />
    );
  } else if (screenBlockedForPlayers && screenKey && shellIsAdmin) {
    mainContent = (
      <>
        <AdminScreenBlockPreviewBanner screenTitle={screenLabel(screenKey)} />
        {children}
      </>
    );
  }

  const siteAssets = appSettings.site_assets;
  const assetCssVars = {
    "--awp-bg-stadium": siteAssetCssUrl(siteAssets.bg_stadium),
    "--awp-bg-pitch-lines": siteAssetCssUrl(siteAssets.bg_pitch_lines),
  } as CSSProperties;

  return (
    <html lang="pl" className={htmlThemeClass} style={assetCssVars}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${displayFont.variable} murawa-bg min-h-screen antialiased font-sans`}
      >
        <script
          // Default jest "dark" (boiskowy klimat). Ten skrypt pozwala zapamiętać wybór dla niezalogowanych.
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('awp-ui-theme');if(t==='light'){document.documentElement.classList.remove('dark');}else if(t==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();",
          }}
        />
        <SiteJsonLd
          siteName={appSettings.site_name}
          siteDescription={appSettings.site_description}
          contactEmail={appSettings.contact_email}
          blikPhone={appSettings.blik_phone}
          logoUrl={siteAssets.logo_favicon}
        />
        <SessionIdleMonitor enabled={sessionIdleLogout} />
        <ShareLinkClientCleanup />
        <PinSetupGate>
          <SiteAssetsProvider assets={siteAssets}>
            <ScreenBlocksProvider
              blocks={appSettings.screen_blocks}
              isAdmin={shellIsAdmin}
              previewAsPlayer={screenBlocksAsPlayer}
            >
              <SiteShell
                isLoggedIn={loggedInFull}
                isAdmin={shellIsAdmin}
                account={accountNav}
                adminUnreadMessages={adminUnreadMessages}
                siteName={appSettings.site_name}
              >
                {session?.pinChangePending && !session.needsPinSetup ? <PinChangePendingBanner /> : null}
                {mainContent}
              </SiteShell>
            </ScreenBlocksProvider>
          </SiteAssetsProvider>
        </PinSetupGate>
        {walletBalancePln != null && !isPzuCupSection ? (
          <WalletBalanceFloat balancePln={walletBalancePln} />
        ) : null}
        {!isPzuCupSection ? (
          <WriteToAdminFloat
            defaults={writeToAdminDefaults}
            recipients={contactAdminRecipients}
            hideFloat={shellIsAdmin}
          />
        ) : null}
        {!isPzuCupSection ? <MatchParticipationSurveyPrompt /> : null}
        {!isPzuCupSection && matchNotificationPromptEnabled ? <MatchNotificationPrompt /> : null}
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
