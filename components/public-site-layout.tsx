import { Suspense, type ReactNode } from "react";
import { DeferredPublicPrompts } from "@/components/layout-deferred-client-features";
import { PinChangePendingBanner } from "@/components/pin-change-pending-banner";
import { SiteShell } from "@/components/site-shell";
import { SiteAssetsProvider } from "@/components/site-assets-provider";
import { MarketplacePhotosProvider } from "@/components/marketplace-photos-provider";
import { ScreenBlocksProvider } from "@/components/screen-blocks-provider";
import { SiteModeProvider } from "@/components/site-mode";
import { AdsenseProvider } from "@/components/adsense-provider";
import { TestModeBanner } from "@/components/test-mode-banner";
import { WalletBalanceFloat } from "@/components/wallet-balance-float";
import { WriteToAdminFloat } from "@/components/write-to-admin-float";
import type { AppSettings } from "@/lib/app-settings";
import type { ContactAdminRecipientOption } from "@/lib/contact-admin-recipients";
import type { SiteMode } from "@/lib/site-mode";

type AccountNav = {
  firstName: string;
  lastName: string;
  zawodnik: string;
  profilePhotoPath: string | null;
};

type Props = {
  children: ReactNode;
  appSettings: AppSettings;
  initialSiteMode: SiteMode | null;
  isLoggedIn: boolean;
  isAdmin: boolean;
  isVenuePartner: boolean;
  account: AccountNav | null;
  adminUnreadMessages: number;
  testModeActive: boolean;
  showPinChangePendingBanner: boolean;
  showWalletBalanceFloat: boolean;
  showWriteToAdminFloat: boolean;
  writeToAdminDefaults: { senderName: string } | null;
  contactAdminRecipients: ContactAdminRecipientOption[];
  showMatchNotificationPrompt: boolean;
  showEmailAuthSetupPrompt: boolean;
  forceEmailAuthSetup: boolean;
  previewScreenBlocksAsPlayer: boolean;
  adsenseClientId: string | null;
};

export function PublicSiteLayout({
  children,
  appSettings,
  initialSiteMode,
  isLoggedIn,
  isAdmin,
  isVenuePartner,
  account,
  adminUnreadMessages,
  testModeActive,
  showPinChangePendingBanner,
  showWalletBalanceFloat,
  showWriteToAdminFloat,
  writeToAdminDefaults,
  contactAdminRecipients,
  showMatchNotificationPrompt,
  showEmailAuthSetupPrompt,
  forceEmailAuthSetup,
  previewScreenBlocksAsPlayer,
  adsenseClientId,
}: Props) {
  return (
    <Suspense fallback={null}>
      <SiteModeProvider
        initialMode={initialSiteMode}
        emailPasswordAuthEnabled={appSettings.email_password_auth_enabled === true}
      >
        <AdsenseProvider
          clientId={adsenseClientId}
          enabled={appSettings.adsense_enabled}
          slotFooter={appSettings.adsense_slot_footer}
          slotInline={appSettings.adsense_slot_inline}
          slotPopup={appSettings.adsense_slot_popup}
          popupEnabled={appSettings.adsense_popup_enabled}
        >
          <SiteAssetsProvider assets={appSettings.site_assets}>
            <MarketplacePhotosProvider
              photos={appSettings.marketplace_pitch_photos}
              customSlots={appSettings.marketplace_pitch_photos_custom}
            >
              <ScreenBlocksProvider
                blocks={appSettings.screen_blocks}
                isAdmin={isAdmin}
                previewAsPlayer={previewScreenBlocksAsPlayer}
              >
                <SiteShell
                  isLoggedIn={isLoggedIn}
                  isAdmin={isAdmin}
                  isVenuePartner={isVenuePartner}
                  account={account}
                  adminUnreadMessages={adminUnreadMessages}
                  siteName={appSettings.site_name}
                >
                  {testModeActive ? <TestModeBanner /> : null}
                  {showPinChangePendingBanner ? <PinChangePendingBanner /> : null}
                  {children}
                </SiteShell>
              </ScreenBlocksProvider>
            </MarketplacePhotosProvider>
          </SiteAssetsProvider>
        </AdsenseProvider>
        {showWalletBalanceFloat ? <WalletBalanceFloat enabled /> : null}
        {showWriteToAdminFloat ? (
          <WriteToAdminFloat
            defaults={writeToAdminDefaults}
            recipients={contactAdminRecipients}
            hideFloat={isAdmin}
          />
        ) : null}
        <DeferredPublicPrompts
          showMatchNotificationPrompt={showMatchNotificationPrompt}
          showEmailAuthSetupPrompt={showEmailAuthSetupPrompt}
          forceEmailAuthSetup={forceEmailAuthSetup}
        />
      </SiteModeProvider>
    </Suspense>
  );
}
