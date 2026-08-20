"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, MapPin } from "lucide-react";
import { AppModal } from "@/components/ui/app-modal";
import { MarketplacePitchPhoto } from "@/components/marketplace-pitch-photo";
import { MARKETPLACE_PITCH_PHOTOS } from "@/lib/marketplace-photos";
import { parseSiteMode, persistSiteMode, shouldAskSiteMode, SITE_MODE_STORAGE_KEY, siteModeFromPathname, type SiteMode } from "@/lib/site-mode";

type Ctx = {
  mode: SiteMode | null;
  ready: boolean;
  marketplaceEnabled: boolean;
  setMode: (mode: SiteMode, options?: { navigateHome?: boolean }) => void;
};

const SiteModeContext = createContext<Ctx>({
  mode: null,
  ready: false,
  marketplaceEnabled: false,
  setMode: () => {},
});

export function useSiteMode() {
  return useContext(SiteModeContext);
}

export function SiteModeProvider({
  children,
  initialMode = null,
  marketplaceEnabled = false,
}: {
  children: ReactNode;
  initialMode?: SiteMode | null;
  marketplaceEnabled?: boolean;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [mode, setModeState] = useState<SiteMode | null>(() => {
    if (!marketplaceEnabled) return "academy";
    return parseSiteMode(searchParams.get("mode")) ?? siteModeFromPathname(pathname) ?? initialMode;
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!marketplaceEnabled) {
      setModeState("academy");
      setReady(true);
      return;
    }
    const fromQuery = parseSiteMode(searchParams.get("mode"));
    const fromPath = siteModeFromPathname(pathname);
    let stored: SiteMode | null = null;
    try {
      stored = parseSiteMode(localStorage.getItem(SITE_MODE_STORAGE_KEY));
    } catch {
      stored = null;
    }
    const next = fromQuery ?? fromPath ?? stored ?? initialMode;
    if (next) persistSiteMode(next);
    setModeState(next);
    setReady(true);
  }, [pathname, searchParams, initialMode, marketplaceEnabled]);

  const setMode = useCallback(
    (next: SiteMode, options?: { navigateHome?: boolean }) => {
      if (!marketplaceEnabled && next === "booking") return;
      persistSiteMode(next);
      setModeState(next);
      if (!options?.navigateHome) return;
      if (pathname === "/") router.refresh();
      else router.push("/");
    },
    [pathname, router, marketplaceEnabled]
  );

  const value = useMemo(
    () => ({ mode, ready, marketplaceEnabled, setMode }),
    [mode, ready, marketplaceEnabled, setMode]
  );

  return (
    <SiteModeContext.Provider value={value}>
      {children}
      <SiteModeGate
        pathname={pathname}
        mode={mode}
        ready={ready}
        marketplaceEnabled={marketplaceEnabled}
        onChoose={setMode}
      />
    </SiteModeContext.Provider>
  );
}

function SiteModeGate({
  pathname,
  mode,
  ready,
  marketplaceEnabled,
  onChoose,
}: {
  pathname: string | null;
  mode: SiteMode | null;
  ready: boolean;
  marketplaceEnabled: boolean;
  onChoose: (mode: SiteMode, options?: { navigateHome?: boolean }) => void;
}) {
  const open = ready && marketplaceEnabled && shouldAskSiteMode(pathname, mode, marketplaceEnabled);

  return (
    <AppModal
      open={open}
      onOpenChange={() => {}}
      preventDismiss
      hideCloseButton
      hideHeader
      scrollable
      size="lg"
      title="Co chcesz zrobić?"
    >
      <div className="space-y-4 p-0.5 sm:space-y-5 sm:p-2">
        <div className="text-center">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-[var(--mp-teal-dark)] sm:text-xs">
            Wybierz
          </p>
          <h2 className="mt-1.5 text-2xl font-black tracking-tight text-zinc-950 sm:mt-2 sm:text-3xl dark:text-white">
            Co chcesz zrobić?
          </h2>
          <p className="mt-2 text-sm text-zinc-500">To dwa osobne miejsca. Wybór zapamiętamy na tym urządzeniu.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => onChoose("booking", { navigateHome: true })}
            className="overflow-hidden rounded-2xl border border-zinc-200 bg-white text-left shadow-sm transition touch-manipulation hover:-translate-y-0.5 hover:border-[var(--mp-teal)] hover:shadow-md xs:rounded-3xl dark:border-zinc-700 dark:bg-zinc-900"
          >
            <span className="relative block h-24 w-full bg-zinc-200 sm:h-36">
              <MarketplacePitchPhoto src={MARKETPLACE_PITCH_PHOTOS[0]} sizes="(max-width: 640px) 100vw, 280px" />
            </span>
            <span className="block p-4 sm:p-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--mp-teal)] text-white sm:h-12 sm:w-12">
                <MapPin className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />
              </span>
              <p className="mt-3 text-lg font-black text-zinc-950 sm:mt-4 sm:text-xl dark:text-white">Szukam boiska</p>
              <p className="mt-1.5 text-sm text-zinc-500 sm:mt-2">
                Rezerwacja hali albo orlika — wolne godziny i płatność online.
              </p>
            </span>
          </button>
          <button
            type="button"
            onClick={() => onChoose("academy", { navigateHome: true })}
            className="overflow-hidden rounded-2xl border border-zinc-200 bg-white text-left shadow-sm transition touch-manipulation hover:-translate-y-0.5 hover:border-[var(--mp-teal)] hover:shadow-md xs:rounded-3xl dark:border-zinc-700 dark:bg-zinc-900"
          >
            <span className="relative block h-24 w-full bg-zinc-200 sm:h-36">
              <MarketplacePitchPhoto src={MARKETPLACE_PITCH_PHOTOS[3]} sizes="(max-width: 640px) 100vw, 280px" />
            </span>
            <span className="block p-4 sm:p-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-900 text-white sm:h-12 sm:w-12 dark:bg-white dark:text-zinc-950">
                <CalendarDays className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />
              </span>
              <p className="mt-3 text-lg font-black text-zinc-950 sm:mt-4 sm:text-xl dark:text-white">Gram z wami</p>
              <p className="mt-1.5 text-sm text-zinc-500 sm:mt-2">
                Akademia — terminarze meczów, składy, portfel i statystyki.
              </p>
            </span>
          </button>
        </div>
      </div>
    </AppModal>
  );
}
