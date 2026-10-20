"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { AndroidColdStartPreloaderUnlock } from "@/components/android-cold-start-preloader-unlock";
import { CsrfBootstrap } from "@/components/csrf-bootstrap";
import { SessionIdleMonitor } from "@/components/session-idle-monitor";
import { StartupSplash } from "@/components/startup-splash";

const DeferredToaster = dynamic(() => import("sonner").then((m) => m.Toaster), {
  ssr: false,
});

const DeferredAndroidAppUpdatePrompt = dynamic(
  () => import("@/components/android-app-update-prompt").then((m) => m.AndroidAppUpdatePrompt),
  { ssr: false }
);

const DeferredEmailAuthSetupPrompt = dynamic(
  () => import("@/components/email-auth-setup-prompt").then((m) => m.EmailAuthSetupPrompt),
  { ssr: false }
);

const DeferredMatchNotificationPrompt = dynamic(
  () => import("@/components/match-notification-prompt").then((m) => m.MatchNotificationPrompt),
  { ssr: false }
);

const DeferredPwaRegister = dynamic(() => import("@/components/pwa-register").then((m) => m.PwaRegister), {
  ssr: false,
});

const DeferredShareLinkClientCleanup = dynamic(
  () => import("@/components/share-link-client-cleanup").then((m) => m.ShareLinkClientCleanup),
  { ssr: false }
);

const DeferredStadiumSoundsUnlock = dynamic(
  () => import("@/components/stadium-sounds").then((m) => m.StadiumSoundsUnlock),
  { ssr: false }
);

const DeferredWebPushEnabler = dynamic(
  () => import("@/components/web-push-enabler").then((m) => m.WebPushEnabler),
  { ssr: false }
);

type IdleCapableWindow = Window & typeof globalThis & {
  requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
  cancelIdleCallback?: (handle: number) => void;
};

function useDeferredMount(enabled: boolean, timeoutMs = 1200) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setReady(false);
      return;
    }

    let cancelled = false;
    const win = window as IdleCapableWindow;
    let timeoutId: number | null = window.setTimeout(() => {
      if (!cancelled) setReady(true);
    }, timeoutMs);
    let idleId: number | null = null;

    if (typeof win.requestIdleCallback === "function") {
      idleId = win.requestIdleCallback(
        () => {
          if (timeoutId != null) {
            window.clearTimeout(timeoutId);
            timeoutId = null;
          }
          if (!cancelled) setReady(true);
        },
        { timeout: timeoutMs }
      );
    }

    return () => {
      cancelled = true;
      if (timeoutId != null) window.clearTimeout(timeoutId);
      if (idleId != null && typeof win.cancelIdleCallback === "function") {
        win.cancelIdleCallback(idleId);
      }
    };
  }, [enabled, timeoutMs]);

  return ready;
}

export function DeferredRootClientFeatures({
  loggedInFull,
  sessionIdleLogout,
}: {
  loggedInFull: boolean;
  sessionIdleLogout: boolean;
}) {
  const deferredReady = useDeferredMount(true);

  return (
    <>
      <StartupSplash />
      <AndroidColdStartPreloaderUnlock />
      <CsrfBootstrap />
      <SessionIdleMonitor enabled={sessionIdleLogout} />

      {deferredReady ? (
        <>
          <DeferredPwaRegister />
          <DeferredAndroidAppUpdatePrompt />
          <DeferredStadiumSoundsUnlock />
          <DeferredShareLinkClientCleanup />
          {loggedInFull ? <DeferredWebPushEnabler /> : null}
          <DeferredToaster
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
        </>
      ) : null}
    </>
  );
}

export function DeferredPublicPrompts({
  showMatchNotificationPrompt,
  showEmailAuthSetupPrompt,
  forceEmailAuthSetup,
}: {
  showMatchNotificationPrompt: boolean;
  showEmailAuthSetupPrompt: boolean;
  forceEmailAuthSetup: boolean;
}) {
  const deferredReady = useDeferredMount(
    showMatchNotificationPrompt || showEmailAuthSetupPrompt,
    900
  );

  if (!deferredReady) return null;

  return (
    <>
      {showMatchNotificationPrompt ? <DeferredMatchNotificationPrompt /> : null}
      {showEmailAuthSetupPrompt ? (
        <DeferredEmailAuthSetupPrompt initialNeedsSetup={forceEmailAuthSetup} />
      ) : null}
    </>
  );
}
