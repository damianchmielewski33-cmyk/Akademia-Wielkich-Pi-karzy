/** Sekcje panelu admina — uprawnienia per administrator. */

export const ADMIN_SECTIONS = [
  { id: "overview", label: "Przegląd" },
  { id: "people", label: "Ludzie" },
  { id: "matches", label: "Mecze i rywalizacja" },
  { id: "finance", label: "Finanse" },
  { id: "site", label: "Treść i witryna" },
] as const;

export type AdminSectionId = (typeof ADMIN_SECTIONS)[number]["id"];

export const ADMIN_SECTION_IDS = ADMIN_SECTIONS.map((s) => s.id);

/** Mapowanie zakładki panelu → sekcja uprawnień. */
export const TAB_TO_SECTION: Record<string, AdminSectionId> = {
  dashboard: "overview",
  users: "people",
  messages: "people",
  matches: "matches",
  lineups: "matches",
  stats: "matches",
  rankings: "matches",
  "pzu-cup": "matches",
  wallets: "finance",
  gallery: "site",
  "screen-blocks": "site",
  analytics: "site",
  settings: "site",
};

/** Mapowanie ścieżki API → sekcja (null = dowolny admin). */
export function adminSectionForApiPath(pathname: string): AdminSectionId | null {
  const p = pathname;
  if (
    p.includes("/api/admin/summary") ||
    p.includes("/api/admin/activity") ||
    p.includes("/api/admin/search")
  ) {
    return null;
  }
  if (p.includes("/api/admin/wallet")) return "finance";
  if (
    p.includes("/api/admin/users") ||
    p.includes("/api/admin/user/") ||
    p.includes("/api/admin/messages")
  ) {
    return "people";
  }
  if (
    p.includes("/api/admin/matches") ||
    p.includes("/api/admin/match/") ||
    p.includes("/api/admin/lineup") ||
    p.includes("/api/admin/stats") ||
    p.includes("/api/admin/stat/") ||
    p.includes("/api/admin/ranking-seasons") ||
    p.includes("/api/terminarz/add") ||
    p.includes("/api/terminarz/edit")
  ) {
    return "matches";
  }
  if (
    p.includes("/api/admin/gallery") ||
    p.includes("/api/admin/analytics") ||
    p.includes("/api/admin/app-settings") ||
    p.includes("/api/admin/site-assets")
  ) {
    return "site";
  }
  return null;
}

export function parseAdminPermissions(raw: string | null | undefined): AdminSectionId[] | null {
  if (raw == null || raw.trim() === "" || raw.trim() === "*") return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    if (parsed.length === 0) return [];
    const ids = parsed.filter(
      (x): x is AdminSectionId => typeof x === "string" && (ADMIN_SECTION_IDS as readonly string[]).includes(x)
    );
    return ids.length === ADMIN_SECTION_IDS.length ? null : ids;
  } catch {
    return null;
  }
}

export function serializeAdminPermissions(sections: AdminSectionId[] | null): string | null {
  if (sections == null) return null;
  const unique = [...new Set(sections)].filter((id) =>
    (ADMIN_SECTION_IDS as readonly string[]).includes(id)
  );
  if (unique.length === 0) return "[]";
  if (unique.length === ADMIN_SECTION_IDS.length) return null;
  return JSON.stringify(unique);
}

/** null w uprawnieniach = pełny dostęp do wszystkich sekcji. */
export function hasAdminSection(
  permissions: AdminSectionId[] | null | undefined,
  section: AdminSectionId
): boolean {
  if (permissions == null) return true;
  return permissions.includes(section);
}

export function canAccessTab(
  permissions: AdminSectionId[] | null | undefined,
  tabId: string
): boolean {
  const section = TAB_TO_SECTION[tabId];
  if (!section) return true;
  return hasAdminSection(permissions, section);
}
