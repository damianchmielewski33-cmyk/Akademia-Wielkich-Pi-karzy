"use client";

import { useEffect, useState } from "react";
import { HomeFallingDecor } from "@/components/home-falling-decor";
import { SiteAssetImage } from "@/components/site-asset-image";
import { isInstalledAndroidAppClient } from "@/lib/app-webview";
import { cn } from "@/lib/utils";

const SESSION_KEY = "awp-startup-splash-shown";
const BOOT_SPLASH_ID = "awp-boot-splash";
const VISIBLE_MS = 3200;
const FADE_MS = 420;

function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function isStandaloneApp(): boolean {
  if (typeof window === "undefined") return false;
  const mq = window.matchMedia("(display-mode: standalone)").matches;
  const iosStandalone =
    "standalone" in navigator &&
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return mq || iosStandalone;
}

export function shouldShowIosStartupSplash(): boolean {
  if (typeof window === "undefined") return false;
  if (isInstalledAndroidAppClient()) return false;
  if (!isIosDevice()) return false;
  if (!isStandaloneApp()) return false;
  try {
    if (sessionStorage.getItem(SESSION_KEY) === "1") return false;
  } catch {
    /* private mode */
  }
  return true;
}

function removeBootSplashDom() {
  if (typeof document === "undefined") return;
  document.getElementById(BOOT_SPLASH_ID)?.remove();
  document.documentElement.classList.remove("awp-boot-splash-pending");
}

function JugglingPlayer({ className, marketplace }: { className?: string; marketplace: boolean }) {
  const jersey = marketplace ? "#00C9B1" : "#00A651";
  const shorts = marketplace ? "#171717" : "#1A2D5A";
  return (
    <div className={cn("awp-juggle", className)} aria-hidden>
      <svg viewBox="0 0 200 220" className="h-full w-full" role="presentation">
        <ellipse cx="100" cy="205" rx="42" ry="8" fill="rgba(0,0,0,0.18)" />
        <g className="awp-juggle__arms">
          <line x1="78" y1="78" x2="48" y2="110" stroke="#F2C4A0" strokeWidth="9" strokeLinecap="round" />
          <line x1="122" y1="78" x2="152" y2="110" stroke="#F2C4A0" strokeWidth="9" strokeLinecap="round" />
        </g>
        <path d={`M78 68 L122 68 L128 118 L72 118 Z`} fill={jersey} stroke="rgba(0,0,0,0.2)" strokeWidth="2" />
        <circle cx="100" cy="48" r="18" fill="#F2C4A0" stroke="rgba(0,0,0,0.15)" strokeWidth="2" />
        <path d="M82 42 A18 18 0 0 1 118 42" fill="#2A1A12" />
        <rect x="74" y="112" width="52" height="22" rx="2" fill={shorts} />
        <g className="awp-juggle__leg awp-juggle__leg--l">
          <line x1="86" y1="132" x2="80" y2="168" stroke="#F2C4A0" strokeWidth="11" strokeLinecap="round" />
          <line x1="80" y1="168" x2="74" y2="196" stroke="#F2C4A0" strokeWidth="10" strokeLinecap="round" />
          <ellipse cx="70" cy="198" rx="14" ry="6" fill="#E8E8E8" />
        </g>
        <g className="awp-juggle__leg awp-juggle__leg--r">
          <line x1="114" y1="132" x2="120" y2="168" stroke="#F2C4A0" strokeWidth="11" strokeLinecap="round" />
          <line x1="120" y1="168" x2="126" y2="196" stroke="#F2C4A0" strokeWidth="10" strokeLinecap="round" />
          <ellipse cx="130" cy="198" rx="14" ry="6" fill="#E8E8E8" />
        </g>
        <g className="awp-juggle__ball">
          <circle cx="100" cy="108" r="16" fill="#fff" stroke="#111" strokeWidth="1.5" />
          <circle cx="100" cy="108" r="5" fill="#1a1a1a" />
          <circle cx="90" cy="102" r="3.5" fill="#1a1a1a" />
          <circle cx="110" cy="102" r="3.5" fill="#1a1a1a" />
          <circle cx="92" cy="116" r="3.5" fill="#1a1a1a" />
          <circle cx="108" cy="116" r="3.5" fill="#1a1a1a" />
        </g>
      </svg>
    </div>
  );
}

export function StartupSplash({ marketplaceEnabled = false }: { marketplaceEnabled?: boolean }) {
  const [phase, setPhase] = useState<"hidden" | "show" | "leave">("hidden");

  useEffect(() => {
    if (!shouldShowIosStartupSplash()) {
      removeBootSplashDom();
      setPhase("hidden");
      return;
    }
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      /* ignore */
    }
    setPhase("show");
    removeBootSplashDom();
    const leaveTimer = window.setTimeout(() => setPhase("leave"), VISIBLE_MS);
    const hideTimer = window.setTimeout(() => setPhase("hidden"), VISIBLE_MS + FADE_MS);
    return () => {
      window.clearTimeout(leaveTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  if (phase === "hidden") return null;

  return (
    <div
      className={cn(
        "awp-startup-splash fixed inset-0 z-[300] flex flex-col items-center justify-center px-6",
        marketplaceEnabled && "awp-startup-splash--v2",
        phase === "leave" && "awp-startup-splash--leave"
      )}
      role="status"
      aria-live="polite"
      aria-busy={phase === "show"}
      aria-label="Uruchamianie aplikacji"
    >
      <HomeFallingDecor cover />
      <div className="relative z-10 flex flex-col items-center text-center">
        <p
          className={cn(
            "text-[0.65rem] font-bold uppercase tracking-[0.2em]",
            marketplaceEnabled ? "text-[var(--mp-teal-dark)]" : "text-[var(--mundial-gold,#f5c518)]"
          )}
        >
          {marketplaceEnabled ? "Wersja V2" : "Akademia"}
        </p>
        <SiteAssetImage
          asset="logo_crest"
          alt=""
          width={144}
          height={144}
          className="mt-3 h-[4.5rem] w-[4.5rem] drop-shadow-md"
          sizes="72px"
          priority
        />
        <p
          className={cn(
            "mt-3 font-[family-name:var(--font-display)] text-2xl font-black tracking-tight drop-shadow-sm",
            marketplaceEnabled ? "text-zinc-950" : "text-white"
          )}
        >
          Akademia Wielkich Piłkarzy
        </p>
        <p className={cn("mt-1 text-sm", marketplaceEnabled ? "text-zinc-500" : "text-white/80")}>
          {marketplaceEnabled ? "Przygotowujemy boiska…" : "Rozgrzewka…"}
        </p>
        <JugglingPlayer marketplace={marketplaceEnabled} className="mt-7 h-[13.75rem] w-[12.5rem]" />
      </div>
    </div>
  );
}
