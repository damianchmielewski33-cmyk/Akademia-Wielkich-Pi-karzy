import type { Metadata } from "next";
import { getAccountNavFields } from "@/lib/account-server";
import { getServerSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getAppSettings } from "@/lib/app-settings";
import { REALMS } from "@/lib/realm";
import { PzuCupFetchProvider } from "@/components/pzu-cup-fetch-provider";
import { PzuCupShell } from "@/components/pzu-cup-shell";
import { SiteAssetsProvider } from "@/components/site-assets-provider";

export async function generateMetadata(): Promise<Metadata> {
  const db = await getDb();
  const settings = await getAppSettings(db, REALMS.PZU_CUP);
  return {
    title: {
      default: settings.site_name,
      template: `%s · ${settings.site_name}`,
    },
    description: settings.site_description,
    robots: { index: false, follow: false },
  };
}

export default async function PzuCupLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  const loggedInFull = Boolean(session && !session.needsPinSetup && !session.pinChangePending);
  const accountRow = session ? await getAccountNavFields(session.userId) : null;

  const db = await getDb();
  const appSettings = await getAppSettings(db, REALMS.PZU_CUP);

  let accountNav: {
    firstName: string;
    lastName: string;
    zawodnik: string;
    profilePhotoPath: string | null;
  } | null = null;
  if (loggedInFull && session) {
    accountNav = {
      firstName: accountRow?.firstName ?? session.firstName,
      lastName: accountRow?.lastName ?? session.lastName,
      zawodnik: accountRow?.zawodnik ?? session.zawodnik,
      profilePhotoPath: accountRow?.profilePhotoPath ?? null,
    };
  }

  return (
    <PzuCupFetchProvider>
      <SiteAssetsProvider assets={appSettings.site_assets}>
        <PzuCupShell
          siteName={appSettings.site_name}
          isLoggedIn={loggedInFull}
          isAdmin={session?.isAdmin && loggedInFull ? true : false}
          account={accountNav}
        >
          {children}
        </PzuCupShell>
      </SiteAssetsProvider>
    </PzuCupFetchProvider>
  );
}
