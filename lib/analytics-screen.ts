/** Klucz ekranu do raportów + etykieta w panelu admina. */
export const SCREEN_LABELS: Record<string, string> = {
  home: "Start",
  terminarz: "Terminarz",
  pilkarze: "Piłkarze",
  sklady: "Składy",
  profil: "Mój profil",
  statystyki: "Statystyki",
  platnosci: "Płatności",
  platnosci_public: "Link płatności (publiczny)",
  zaproszenie: "Zaproszenie na mecz",
  rankingi: "Rankingi",
  o_nas: "O nas",
  galeria: "Galeria",
  kontakt: "Kontakt",
  login: "Logowanie",
  register: "Rejestracja",
  confirm: "Potwierdzenie",
  players_detail: "Karta piłkarza",
  transport: "Transport",
  losowanie_kapitana: "Losowanie kapitana",
  ustaw_pin: "Ustawienie PIN",
  cookies: "Polityka cookies",
  polityka_prywatnosci: "Polityka prywatności",
  offline: "Offline",
  other: "Inna strona",
};

/** Wpisy w `page_views`, które nie są odsłonami stron (logi / APK). */
export function isPageViewNoiseScreenKey(screenKey: string): boolean {
  return screenKey === "android_apk_download" || screenKey.startsWith("client_log_");
}

/** Fragment SQL: tylko prawdziwe odsłony stron. */
export const PAGE_VIEWS_REAL_SQL = `(screen_key NOT LIKE 'client_log_%' AND screen_key <> 'android_apk_download')`;

export function normalizeAnalyticsPathname(pathname: string): string {
  let path = pathname.split("?")[0]?.split("#")[0] ?? pathname;
  path = path.trim() || "/";
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  return path.slice(0, 512);
}

export function getScreenFromPathname(pathname: string | null): { key: string; label: string } | null {
  if (!pathname || pathname.startsWith("/panel-admina")) return null;
  if (pathname.startsWith("/api")) return null;
  if (pathname.startsWith("/_next")) return null;

  const path = normalizeAnalyticsPathname(pathname);

  if (path === "/") return { key: "home", label: SCREEN_LABELS.home };
  if (path === "/terminarz") return { key: "terminarz", label: SCREEN_LABELS.terminarz };
  if (path === "/pilkarze") return { key: "pilkarze", label: SCREEN_LABELS.pilkarze };
  if (path === "/sklady") return { key: "sklady", label: SCREEN_LABELS.sklady };
  if (path === "/profil") return { key: "profil", label: SCREEN_LABELS.profil };
  if (path === "/statystyki") return { key: "statystyki", label: SCREEN_LABELS.statystyki };
  if (path === "/platnosci") return { key: "platnosci", label: SCREEN_LABELS.platnosci };
  if (path.startsWith("/platnosci-public/")) {
    return { key: "platnosci_public", label: SCREEN_LABELS.platnosci_public };
  }
  if (path.startsWith("/zaproszenie/")) {
    return { key: "zaproszenie", label: SCREEN_LABELS.zaproszenie };
  }
  if (path === "/rankingi") return { key: "rankingi", label: SCREEN_LABELS.rankingi };
  if (path === "/o-nas") return { key: "o_nas", label: SCREEN_LABELS.o_nas };
  if (path === "/galeria") return { key: "galeria", label: SCREEN_LABELS.galeria };
  if (path === "/kontakt") return { key: "kontakt", label: SCREEN_LABELS.kontakt };
  if (path === "/login") return { key: "login", label: SCREEN_LABELS.login };
  if (path === "/register") return { key: "register", label: SCREEN_LABELS.register };
  if (path === "/cookies") return { key: "cookies", label: SCREEN_LABELS.cookies };
  if (path === "/polityka-prywatnosci") {
    return { key: "polityka_prywatnosci", label: SCREEN_LABELS.polityka_prywatnosci };
  }
  if (path === "/ustaw-pin") return { key: "ustaw_pin", label: SCREEN_LABELS.ustaw_pin };
  if (path === "/offline") return { key: "offline", label: SCREEN_LABELS.offline };
  if (path.startsWith("/confirm/")) return { key: "confirm", label: SCREEN_LABELS.confirm };
  if (path.startsWith("/players/")) return { key: "players_detail", label: SCREEN_LABELS.players_detail };
  if (path.startsWith("/transport/")) return { key: "transport", label: SCREEN_LABELS.transport };
  if (path.startsWith("/losowanie-kapitana/")) {
    return { key: "losowanie_kapitana", label: SCREEN_LABELS.losowanie_kapitana };
  }

  return { key: "other", label: SCREEN_LABELS.other };
}
