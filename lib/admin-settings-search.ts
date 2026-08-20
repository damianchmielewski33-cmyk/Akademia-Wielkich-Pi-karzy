/** Indeks wyszukiwania ustawień panelu admina (WWW + aplikacja). */

export type AdminSettingsSearchHit = {
  id: string;
  label: string;
  keywords: string;
  group: string;
};

export const ADMIN_SETTINGS_SEARCH_INDEX: AdminSettingsSearchHit[] = [
  { id: "settings-test-mode", label: "Tryb testowy", keywords: "sandbox test", group: "System" },
  {
    id: "settings-marketplace",
    label: "Wersja aplikacji",
    keywords: "v1 v2 wersja marketplace hale rezerwacje wyłącznik",
    group: "System",
  },
  {
    id: "settings-system",
    label: "Co działa na serwerze",
    keywords: "smtp produkcja rejestracja status serwer",
    group: "System",
  },
  { id: "settings-brand", label: "Nazwa i opis strony", keywords: "nazwa branding seo opis", group: "Marka i treści" },
  {
    id: "settings-assets",
    label: "Logo i tła",
    keywords: "logo tło grafika asset zdjęcia boiska gramy razem",
    group: "Marka i treści",
  },
  {
    id: "settings-home-video",
    label: "Film na stronie głównej",
    keywords: "youtube film video",
    group: "Marka i treści",
  },
  {
    id: "settings-contact",
    label: "Kontakt i organizatorzy",
    keywords: "email telefon blik facebook",
    group: "Kontakt",
  },
  { id: "settings-adsense", label: "Google AdSense", keywords: "reklamy adsense", group: "Reklamy i rejestracja" },
  {
    id: "settings-registration",
    label: "Rejestracja i powiadomienia",
    keywords: "rejestracja mail powiadomienia",
    group: "Reklamy i rejestracja",
  },
  {
    id: "settings-match-defaults",
    label: "Domyślne mecze",
    keywords: "miejsca lokalizacja mecz",
    group: "Mecze i rankingi",
  },
  {
    id: "settings-ranking-points",
    label: "Punkty rankingowe",
    keywords: "ranking punkty gol asysta",
    group: "Mecze i rankingi",
  },
  { id: "settings-pitch-plan", label: "Plan boiska", keywords: "składy boisko", group: "Mecze i rankingi" },
  {
    id: "settings-cancel-reasons",
    label: "Powody anulowania",
    keywords: "anuluj powód",
    group: "Mecze i rankingi",
  },
  {
    id: "settings-m-name",
    label: "Nazwa w aplikacji",
    keywords: "nazwa app android mobile",
    group: "Aplikacja",
  },
  {
    id: "settings-m-contact",
    label: "Kontakt (aplikacja)",
    keywords: "email telefon blik mobile",
    group: "Aplikacja",
  },
  {
    id: "settings-m-matches",
    label: "Domyślne mecze (aplikacja)",
    keywords: "miejsca lokalizacja mobile",
    group: "Aplikacja · Mecze",
  },
  {
    id: "settings-m-ranking",
    label: "Punkty rankingowe (aplikacja)",
    keywords: "ranking punkty mobile",
    group: "Aplikacja · Mecze",
  },
  {
    id: "settings-m-cancel",
    label: "Powody anulowania (aplikacja)",
    keywords: "anuluj powód mobile",
    group: "Aplikacja · Mecze",
  },
];
