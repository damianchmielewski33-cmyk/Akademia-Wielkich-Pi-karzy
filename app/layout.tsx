import type { Metadata, Viewport } from "next";
import { Suspense, type CSSProperties } from "react";
import { headers, cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import { Toaster } from "sonner";
import { SiteShell } from "@/components/site-shell";
import { ShareLinkClientCleanup } from "@/components/share-link-client-cleanup";
import { PwaRegister } from "@/components/pwa-register";
import { AndroidAppUpdatePrompt } from "@/components/android-app-update-prompt";
import { WebPushEnabler } from "@/components/web-push-enabler";
import { MatchNotificationPrompt } from "@/components/match-notification-prompt";
import { PinChangePendingBanner } from "@/components/pin-change-pending-banner";
import { TestModeBanner } from "@/components/test-mode-banner";
import { PinSetupGate } from "@/components/pin-setup-gate";
import { SessionIdleMonitor } from "@/components/session-idle-monitor";
import { getAccountNavFields } from "@/lib/account-server";
import { getServerSession } from "@/lib/auth";
import { normalizeUiTheme } from "@/lib/ui-theme";
import { getDb } from "@/lib/db";
import { isAdminTestModeActive } from "@/lib/test-mode";
import { WalletBalanceFloat } from "@/components/wallet-balance-float";
import { WriteToAdminFloat } from "@/components/write-to-admin-float";
import { SiteJsonLd } from "@/components/site-json-ld";
import { SiteAssetsProvider } from "@/components/site-assets-provider";
import { MarketplacePhotosProvider } from "@/components/marketplace-photos-provider";
import { ScreenBlocksProvider } from "@/components/screen-blocks-provider";
import { SiteModeProvider } from "@/components/site-mode";
import { ScreenBlockPlaceholder } from "@/components/screen-block-placeholder";
import { AdminScreenBlockPreviewBanner } from "@/components/admin-screen-block-preview-banner";
import { ScreenBlockPreviewContent } from "@/components/screen-block-preview-content";
import { AdsenseProvider } from "@/components/adsense-provider";
import { getGoogleSiteVerification, getSiteUrl } from "@/lib/site";
import { resolveAdsenseClientId } from "@/lib/adsense";
import { getRequestAppSettings } from "@/lib/request-app-settings";
import {
  getScreenKeyFromPathname,
  isScreenDisabledForUser,
  screenBlockMessage,
  screenLabel,
} from "@/lib/screen-blocks";
import { getUnreadAdminMessageCount } from "@/lib/admin-messages";
import { isVenuePartner } from "@/lib/venue-partners";
import { contactAdminRecipientsFromSettings } from "@/lib/contact-admin-recipients";
import { siteAssetCssUrl } from "@/lib/site-assets";
import { parseSiteMode, SITE_MODE_COOKIE } from "@/lib/site-mode";
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

const displayFont = localFont({
  variable: "--font-display",
  display: "swap",
  src: [
    { path: "../public/fonts/teko-latin-ext.woff2", weight: "400 700", style: "normal" },
    { path: "../public/fonts/teko-latin.woff2", weight: "400 700", style: "normal" },
  ],
});

/** iPhone / PWA: dopasowanie do ekranu + kolor startowy zamiast czerni. */
export async function generateViewport(): Promise<Viewport> {
  const settings = await getRequestAppSettings();
  const marketplace = settings.booking_marketplace_enabled === true;
  return {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
    themeColor: marketplace ? "#00C9B1" : "#1A2D5A",
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getRequestAppSettings();
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
      icon: [
        { url: favicon, type: faviconType },
        { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
      // Jak Android (adaptive): crest na #1A2D5A — Safari / „Dodaj do ekranu początkowego”
      apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
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

  const [db, appSettings] = await Promise.all([getDb(), getRequestAppSettings()]);
  const marketplaceEnabled = appSettings.booking_marketplace_enabled === true;
  const htmlThemeClass = accountRow
    ? normalizeUiTheme(accountRow.uiTheme) === "dark"
      ? "dark"
      : ""
    : marketplaceEnabled
      ? ""
      : "dark";
  const initialSiteMode = marketplaceEnabled
    ? parseSiteMode(cookieStore.get(SITE_MODE_COOKIE)?.value)
    : "academy";
  const matchNotificationPromptEnabled = appSettings.match_notification_prompt_enabled === true;

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
  const [isVenuePartnerUser, testModeActive, adminUnreadMessages] = await Promise.all([
    loggedInFull && session ? isVenuePartner(db, session.userId) : Promise.resolve(false),
    isAdmin ? isAdminTestModeActive() : Promise.resolve(false),
    isAdmin ? getUnreadAdminMessageCount(db) : Promise.resolve(0),
  ]);
  /** Podgląd zaślepki — widok gracza dla każdego z aktywnym ciasteczkiem / parametrem (ustawiane z panelu admina). */
  const screenBlocksAsPlayer = previewBlocked;
  const shellIsAdmin = isAdmin && !screenBlocksAsPlayer;

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
  const adsenseClientId = resolveAdsenseClientId(appSettings.adsense_client_id);
  const assetCssVars = {
    "--awp-bg-stadium": siteAssetCssUrl(siteAssets.bg_stadium),
    "--awp-bg-pitch-lines": siteAssetCssUrl(siteAssets.bg_pitch_lines),
  } as CSSProperties;

  return (
    <html
      lang="pl"
      className={`${htmlThemeClass} ${marketplaceEnabled ? "site-chrome-marketplace" : "site-chrome-academy"}`.trim()}
      style={assetCssVars}
    >
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content={marketplaceEnabled ? "default" : "black-translucent"}
        />
        <meta name="mobile-web-app-capable" content="yes" />
        <style
          dangerouslySetInnerHTML={{
            __html: marketplaceEnabled
              ? "html,body{background-color:#f4f5f7;}"
              : "html,body{background-color:#1A2D5A;}",
          }}
        />
        {/* iOS PWA splash — solid brand color (Safari ignores manifest background_color). */}
        <link
          rel="apple-touch-startup-image"
          href="/splash/apple-splash-1290x2796.png"
          media="(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/apple-splash-1179x2556.png"
          media="(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/apple-splash-1284x2778.png"
          media="(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/apple-splash-1170x2532.png"
          media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/apple-splash-1125x2436.png"
          media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/apple-splash-1242x2688.png"
          media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/apple-splash-828x1792.png"
          media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/apple-splash-750x1334.png"
          media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)"
        />
        {adsenseClientId ? <meta name="google-adsense-account" content={adsenseClientId} /> : null}
        {/* Skrypt AdSense ładujemy dopiero po zgodzie marketingowej (AdsenseProvider). */}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${displayFont.variable} min-h-screen antialiased font-sans ${marketplaceEnabled ? "marketplace-bg" : "murawa-bg"}`}
      >
        <script
          // Marketplace: domyślnie jasny. Akademia (rezerwacje wyłączone): domyślnie stadion / ciemny.
          dangerouslySetInnerHTML={{
            __html: marketplaceEnabled
              ? "(function(){try{var t=localStorage.getItem('awp-ui-theme');if(t==='dark'){document.documentElement.classList.add('dark');}else{document.documentElement.classList.remove('dark');}}catch(e){}})();"
              : "(function(){try{var t=localStorage.getItem('awp-ui-theme');if(t==='light'){document.documentElement.classList.remove('dark');}else{document.documentElement.classList.add('dark');}}catch(e){}})();",
          }}
        />
        <SiteJsonLd
          siteName={appSettings.site_name}
          siteDescription={appSettings.site_description}
          contactEmail={appSettings.contact_email}
          blikPhone={appSettings.blik_phone}
          logoUrl={siteAssets.logo_favicon}
        />
        <PwaRegister />
        <AndroidAppUpdatePrompt />
        {loggedInFull ? <WebPushEnabler /> : null}
        <SessionIdleMonitor enabled={sessionIdleLogout} />
        <ShareLinkClientCleanup />
        <PinSetupGate>
          <Suspense fallback={null}>
            <SiteModeProvider initialMode={initialSiteMode} marketplaceEnabled={marketplaceEnabled}>
              <AdsenseProvider
                clientId={adsenseClientId}
                enabled={appSettings.adsense_enabled}
                slotFooter={appSettings.adsense_slot_footer}
                slotInline={appSettings.adsense_slot_inline}
                slotPopup={appSettings.adsense_slot_popup}
                popupEnabled={appSettings.adsense_popup_enabled}
              >
                <SiteAssetsProvider assets={siteAssets}>
                  <MarketplacePhotosProvider
                    photos={appSettings.marketplace_pitch_photos}
                    customSlots={appSettings.marketplace_pitch_photos_custom}
                  >
                  <ScreenBlocksProvider
                    blocks={appSettings.screen_blocks}
                    isAdmin={shellIsAdmin}
                    previewAsPlayer={screenBlocksAsPlayer}
                  >
                    <SiteShell
                      isLoggedIn={loggedInFull}
                      isAdmin={shellIsAdmin}
                      isVenuePartner={isVenuePartnerUser}
                      account={accountNav}
                      adminUnreadMessages={adminUnreadMessages}
                      siteName={appSettings.site_name}
                    >
                      {testModeActive ? <TestModeBanner /> : null}
                      {session?.pinChangePending && !session.needsPinSetup ? <PinChangePendingBanner /> : null}
                      {mainContent}
                    </SiteShell>
                  </ScreenBlocksProvider>
                  </MarketplacePhotosProvider>
                </SiteAssetsProvider>
              </AdsenseProvider>
              {loggedInFull && !isPzuCupSection ? <WalletBalanceFloat enabled /> : null}
              {!isPzuCupSection ? (
                <WriteToAdminFloat
                  defaults={writeToAdminDefaults}
                  recipients={contactAdminRecipients}
                  hideFloat={shellIsAdmin}
                />
              ) : null}
              {!isPzuCupSection && matchNotificationPromptEnabled ? <MatchNotificationPrompt /> : null}
            </SiteModeProvider>
          </Suspense>
        </PinSetupGate>
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
