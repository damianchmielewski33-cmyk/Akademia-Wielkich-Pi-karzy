import { PREVIEW_BLOCKED_COOKIE, PREVIEW_BLOCKED_QUERY_PARAM, PREVIEW_BLOCKS_DRAFT_STORAGE_KEY } from "@/lib/constants";
import { parseScreenBlocksJson, serializeScreenBlocksMap, type BlockableScreenKey, type ScreenBlockEntry, type ScreenBlocksMap } from "@/lib/screen-blocks";

/** Ścieżka z parametrem podglądu zaślepki (admin). */
export function screenBlockPreviewHref(href: string): string {
  const path = href === "/players/*" ? "/pilkarze" : href;
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}${PREVIEW_BLOCKED_QUERY_PARAM}=1`;
}

export function isPreviewBlockedCookieValue(value: string | undefined | null): boolean {
  return value === "1";
}

export function storeScreenBlocksPreviewDraft(blocks: ScreenBlocksMap): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(PREVIEW_BLOCKS_DRAFT_STORAGE_KEY, serializeScreenBlocksMap(blocks));
  } catch {
    /* ignore quota / private mode */
  }
}

export function readScreenBlocksPreviewDraft(): Record<BlockableScreenKey, ScreenBlockEntry> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(PREVIEW_BLOCKS_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    return parseScreenBlocksJson(raw);
  } catch {
    return null;
  }
}

export { PREVIEW_BLOCKED_COOKIE, PREVIEW_BLOCKED_QUERY_PARAM, PREVIEW_BLOCKS_DRAFT_STORAGE_KEY };
