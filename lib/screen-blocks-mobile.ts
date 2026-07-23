import {
  DEFAULT_SCREEN_BLOCK_MESSAGE,
  isScreenEffectivelyDisabled,
  todayPlYmd,
  type ScreenBlockEntry,
} from "@/lib/screen-blocks";

/** Ekrany aplikacji Android, które admin może zaślepić niezależnie od strony. */
export const BLOCKABLE_MOBILE_SCREENS = [
  { key: "home", label: "Home (kolejny mecz)", route: "home" },
  { key: "schedule", label: "Terminarz", route: "schedule" },
  { key: "wallet", label: "Portfel", route: "wallet" },
  { key: "stats", label: "Statystyki", route: "stats" },
  { key: "rankings", label: "Rankingi", route: "rankings" },
  { key: "lineups", label: "Składy", route: "lineups" },
  { key: "profile", label: "Profil", route: "profile" },
  { key: "more", label: "Więcej (hub)", route: "more" },
  { key: "pilkarze", label: "Piłkarze (WebView)", route: "web:pilkarze" },
  { key: "galeria", label: "Galeria (WebView)", route: "web:galeria" },
  { key: "o_nas", label: "O nas (WebView)", route: "web:o_nas" },
  { key: "kontakt", label: "Kontakt (WebView)", route: "web:kontakt" },
  { key: "pzu_cup", label: "PZU Cup (WebView)", route: "web:pzu_cup" },
  { key: "platnosci_web", label: "Płatności WWW (WebView)", route: "web:platnosci" },
  { key: "profil_web", label: "Profil WWW (WebView)", route: "web:profil" },
  { key: "transport", label: "Transport (WebView)", route: "web:transport" },
] as const;

export type BlockableMobileScreenKey = (typeof BLOCKABLE_MOBILE_SCREENS)[number]["key"];

export type MobileScreenBlocksMap = Partial<Record<BlockableMobileScreenKey, ScreenBlockEntry>>;

const MAX_BLOCK_MESSAGE_LEN = 500;

export function emptyMobileScreenBlocksMap(): Record<BlockableMobileScreenKey, ScreenBlockEntry> {
  return Object.fromEntries(
    BLOCKABLE_MOBILE_SCREENS.map((s) => [s.key, { disabled: false, message: "" }])
  ) as Record<BlockableMobileScreenKey, ScreenBlockEntry>;
}

export function parseMobileScreenBlocksJson(
  raw: string | null | undefined
): Record<BlockableMobileScreenKey, ScreenBlockEntry> {
  const base = emptyMobileScreenBlocksMap();
  if (!raw?.trim()) return base;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return base;
    for (const screen of BLOCKABLE_MOBILE_SCREENS) {
      const entry = (parsed as MobileScreenBlocksMap)[screen.key];
      if (!entry || typeof entry !== "object") continue;
      const disabled = Boolean((entry as ScreenBlockEntry).disabled);
      const message =
        typeof (entry as ScreenBlockEntry).message === "string"
          ? (entry as ScreenBlockEntry).message.trim().slice(0, MAX_BLOCK_MESSAGE_LEN)
          : "";
      const active_from =
        typeof (entry as ScreenBlockEntry).active_from === "string"
          ? (entry as ScreenBlockEntry).active_from!.trim().slice(0, 10)
          : "";
      const active_until =
        typeof (entry as ScreenBlockEntry).active_until === "string"
          ? (entry as ScreenBlockEntry).active_until!.trim().slice(0, 10)
          : "";
      base[screen.key] = {
        disabled,
        message,
        ...(active_from ? { active_from } : {}),
        ...(active_until ? { active_until } : {}),
      };
    }
  } catch {
    return base;
  }
  return base;
}

export function serializeMobileScreenBlocksMap(map: MobileScreenBlocksMap): string {
  const out: MobileScreenBlocksMap = {};
  for (const screen of BLOCKABLE_MOBILE_SCREENS) {
    const entry = map[screen.key];
    if (!entry?.disabled && !entry?.message?.trim() && !entry?.active_from && !entry?.active_until) continue;
    out[screen.key] = {
      disabled: Boolean(entry.disabled),
      message: (entry.message ?? "").trim().slice(0, MAX_BLOCK_MESSAGE_LEN),
      ...(entry.active_from ? { active_from: entry.active_from } : {}),
      ...(entry.active_until ? { active_until: entry.active_until } : {}),
    };
  }
  return JSON.stringify(out);
}

export function getMobileScreenBlockEntry(
  blocks: Record<BlockableMobileScreenKey, ScreenBlockEntry>,
  key: BlockableMobileScreenKey
): ScreenBlockEntry {
  return blocks[key] ?? { disabled: false, message: "" };
}

export function isMobileScreenDisabledForUser(
  blocks: Record<BlockableMobileScreenKey, ScreenBlockEntry>,
  key: BlockableMobileScreenKey,
  isAdmin: boolean,
  todayYmd = todayPlYmd()
): boolean {
  if (isAdmin) return false;
  return isScreenEffectivelyDisabled(getMobileScreenBlockEntry(blocks, key), todayYmd);
}

export function mobileScreenBlockMessage(
  blocks: Record<BlockableMobileScreenKey, ScreenBlockEntry>,
  key: BlockableMobileScreenKey
): string {
  const msg = getMobileScreenBlockEntry(blocks, key).message.trim();
  return msg || DEFAULT_SCREEN_BLOCK_MESSAGE;
}

/** Mapowanie ścieżek API → klucz zaślepki mobilnej. */
export function getMobileScreenKeyFromApiPath(pathname: string): BlockableMobileScreenKey | null {
  if (pathname.startsWith("/api/terminarz")) return "schedule";
  if (pathname.startsWith("/api/wallet")) return "wallet";
  if (pathname.startsWith("/api/player-stats") || pathname.startsWith("/api/stats")) return "stats";
  if (pathname.startsWith("/api/rankingi")) return "rankings";
  if (pathname.startsWith("/api/sklady")) return "lineups";
  if (pathname.startsWith("/api/profile")) return "profile";
  return null;
}
