/** Ekrany akademii, które administrator może zaślepić dla graczy. */
export const BLOCKABLE_SCREENS = [
  { key: "home", label: "Start", href: "/" },
  { key: "terminarz", label: "Terminarz", href: "/terminarz" },
  { key: "pilkarze", label: "Piłkarze", href: "/pilkarze" },
  { key: "sklady", label: "Składy", href: "/sklady" },
  { key: "galeria", label: "Galeria", href: "/galeria" },
  { key: "statystyki", label: "Statystyki", href: "/statystyki" },
  { key: "platnosci", label: "Płatności", href: "/platnosci" },
  { key: "rankingi", label: "Rankingi", href: "/rankingi" },
  { key: "o_nas", label: "O nas", href: "/o-nas" },
  { key: "kontakt", label: "Kontakt", href: "/kontakt" },
  { key: "profil", label: "Mój profil", href: "/profil" },
  { key: "players_detail", label: "Karta piłkarza", href: "/players/*" },
] as const;

export type BlockableScreenKey = (typeof BLOCKABLE_SCREENS)[number]["key"];

export type ScreenBlockEntry = {
  disabled: boolean;
  message: string;
  /** YYYY-MM-DD (PL) — zaślepka aktywna od tego dnia włącznie */
  active_from?: string;
  /** YYYY-MM-DD (PL) — zaślepka aktywna do tego dnia włącznie */
  active_until?: string;
};

export type ScreenBlocksMap = Partial<Record<BlockableScreenKey, ScreenBlockEntry>>;

export const DEFAULT_SCREEN_BLOCK_MESSAGE =
  "Ta sekcja jest tymczasowo niedostępna. Administracja przygotowuje zmiany — zajrzyj ponownie wkrótce.";

const MAX_BLOCK_MESSAGE_LEN = 500;

export function emptyScreenBlocksMap(): Record<BlockableScreenKey, ScreenBlockEntry> {
  return Object.fromEntries(
    BLOCKABLE_SCREENS.map((s) => [s.key, { disabled: false, message: "" }])
  ) as Record<BlockableScreenKey, ScreenBlockEntry>;
}

export function parseScreenBlocksJson(raw: string | null | undefined): Record<BlockableScreenKey, ScreenBlockEntry> {
  const base = emptyScreenBlocksMap();
  if (!raw?.trim()) return base;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return base;
    for (const screen of BLOCKABLE_SCREENS) {
      const entry = (parsed as ScreenBlocksMap)[screen.key];
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

export function serializeScreenBlocksMap(map: ScreenBlocksMap): string {
  const out: ScreenBlocksMap = {};
  for (const screen of BLOCKABLE_SCREENS) {
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

export function todayPlYmd(timeZone = "Europe/Warsaw"): string {
  return new Date().toLocaleDateString("en-CA", { timeZone });
}

export function isScreenEffectivelyDisabled(
  entry: ScreenBlockEntry,
  todayYmd = todayPlYmd()
): boolean {
  if (!entry.disabled) return false;
  if (entry.active_from && todayYmd < entry.active_from) return false;
  if (entry.active_until && todayYmd > entry.active_until) return false;
  return true;
}

export function getScreenKeyFromPathname(pathname: string | null | undefined): BlockableScreenKey | null {
  if (!pathname) return null;
  const path = pathname.split("?")[0] ?? pathname;
  if (path === "/") return "home";
  if (path === "/terminarz") return "terminarz";
  if (path === "/pilkarze") return "pilkarze";
  if (path === "/sklady") return "sklady";
  if (path === "/galeria") return "galeria";
  if (path === "/statystyki") return "statystyki";
  if (path === "/platnosci") return "platnosci";
  if (path === "/rankingi") return "rankingi";
  if (path === "/o-nas") return "o_nas";
  if (path === "/kontakt") return "kontakt";
  if (path === "/profil") return "profil";
  if (path.startsWith("/players/")) return "players_detail";
  return null;
}

export function getScreenBlockEntry(
  blocks: Record<BlockableScreenKey, ScreenBlockEntry>,
  key: BlockableScreenKey
): ScreenBlockEntry {
  return blocks[key] ?? { disabled: false, message: "" };
}

export function isScreenDisabledForUser(
  blocks: Record<BlockableScreenKey, ScreenBlockEntry>,
  key: BlockableScreenKey,
  isAdmin: boolean,
  todayYmd = todayPlYmd()
): boolean {
  if (isAdmin) return false;
  return isScreenEffectivelyDisabled(getScreenBlockEntry(blocks, key), todayYmd);
}

export function screenBlockMessage(
  blocks: Record<BlockableScreenKey, ScreenBlockEntry>,
  key: BlockableScreenKey
): string {
  const msg = getScreenBlockEntry(blocks, key).message.trim();
  return msg || DEFAULT_SCREEN_BLOCK_MESSAGE;
}

export function screenLabel(key: BlockableScreenKey): string {
  return BLOCKABLE_SCREENS.find((s) => s.key === key)?.label ?? key;
}

export function hrefMatchesBlockableScreen(href: string): BlockableScreenKey | null {
  if (href === "/") return "home";
  const exact = BLOCKABLE_SCREENS.find((s) => s.href === href);
  return exact?.key ?? null;
}

/** Mapowanie ścieżek API na klucz ekranu (zaślepki). */
export function getScreenKeyFromApiPath(pathname: string): BlockableScreenKey | null {
  if (pathname.startsWith("/api/terminarz")) return "terminarz";
  if (pathname.startsWith("/api/stats")) return "statystyki";
  if (pathname.startsWith("/api/wallet")) return "platnosci";
  if (pathname.startsWith("/api/profile")) return "profil";
  if (pathname.startsWith("/api/player-stats")) return "pilkarze";
  if (pathname.startsWith("/api/chat")) return "kontakt";
  return null;
}
