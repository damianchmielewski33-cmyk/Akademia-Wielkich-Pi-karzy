/** Klucz ekranu do raportów + etykieta w panelu admina. */
export const SCREEN_LABELS: Record<string, string> = {
  home: "Start",
  terminarz: "Terminarz",
  pilkarze: "Piłkarze",
  sklady: "Składy",
  profil: "Mój profil",
  statystyki: "Statystyki",
  platnosci: "Płatności",
  rankingi: "Rankingi",
  o_nas: "O nas",
  login: "Logowanie",
  register: "Rejestracja",
  confirm: "Potwierdzenie",
  players_detail: "Karta piłkarza",
  other: "Inna strona",
};

export function getScreenFromPathname(pathname: string | null): { key: string; label: string } | null {
  if (!pathname || pathname.startsWith("/panel-admina")) return null;
  if (pathname.startsWith("/api")) return null;
  if (pathname.startsWith("/_next")) return null;

  const path = pathname.split("?")[0] ?? pathname;
  if (path === "/") return { key: "home", label: SCREEN_LABELS.home };
  if (path === "/terminarz") return { key: "terminarz", label: SCREEN_LABELS.terminarz };
  if (path === "/pilkarze") return { key: "pilkarze", label: SCREEN_LABELS.pilkarze };
  if (path === "/sklady") return { key: "sklady", label: SCREEN_LABELS.sklady };
  if (path === "/profil") return { key: "profil", label: SCREEN_LABELS.profil };
  if (path === "/statystyki") return { key: "statystyki", label: SCREEN_LABELS.statystyki };
  if (path === "/platnosci") return { key: "platnosci", label: SCREEN_LABELS.platnosci };
  if (path === "/rankingi") return { key: "rankingi", label: SCREEN_LABELS.rankingi };
  if (path === "/o-nas") return { key: "o_nas", label: SCREEN_LABELS.o_nas };
  if (path === "/login") return { key: "login", label: SCREEN_LABELS.login };
  if (path === "/register") return { key: "register", label: SCREEN_LABELS.register };
  if (path.startsWith("/confirm/")) return { key: "confirm", label: SCREEN_LABELS.confirm };
  if (path.startsWith("/players/")) return { key: "players_detail", label: SCREEN_LABELS.players_detail };

  return { key: "other", label: SCREEN_LABELS.other };
}
