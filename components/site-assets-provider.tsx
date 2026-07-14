"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { ResolvedSiteAssets, SiteAssetKey } from "@/lib/site-assets";
import { SITE_ASSET_DEFAULTS } from "@/lib/site-assets";

const SiteAssetsContext = createContext<ResolvedSiteAssets>(SITE_ASSET_DEFAULTS);

export function SiteAssetsProvider({
  assets,
  children,
}: {
  assets: ResolvedSiteAssets;
  children: ReactNode;
}) {
  return <SiteAssetsContext.Provider value={assets}>{children}</SiteAssetsContext.Provider>;
}

export function useSiteAssets(): ResolvedSiteAssets {
  return useContext(SiteAssetsContext);
}

export function useSiteAsset(key: SiteAssetKey): string {
  return useContext(SiteAssetsContext)[key];
}
