/** Trzy równorzędne produkty, jeden backend. */

export const AWP_PRODUCTS = ["www", "ios", "android"] as const;
export type AwpProduct = (typeof AWP_PRODUCTS)[number];

export const AWP_SURFACES = [
  "web-desktop",
  "web-tablet",
  "web-mobile",
  "ios",
  "android",
] as const;
export type AwpSurface = (typeof AWP_SURFACES)[number];

export type FeatureHome = "all" | "www-primary" | "mobile-primary";

export type EcosystemFeature = {
  id: string;
  label: string;
  home: FeatureHome;
  www: true;
  ios: true;
  android: true;
  wwwNote: string;
  mobileNote: string;
};

/** Każda funkcja biznesowa ma odpowiednik na WWW, iOS i Android. */
export const ECOSYSTEM_FEATURES: EcosystemFeature[] = [
  {
    id: "matches",
    label: "Mecze / terminarze",
    home: "all",
    www: true,
    ios: true,
    android: true,
    wwwNote: "Tabela, filtry, archiwum, zarządzanie składem.",
    mobileNote: "Lista kart + jeden przycisk Gram.",
  },
  {
    id: "signup",
    label: "Zapisy i wypisy",
    home: "mobile-primary",
    www: true,
    ios: true,
    android: true,
    wwwNote: "Dialog z gośćmi, waitlistą i komunikatem składki.",
    mobileNote: "Dwa kciuki: Gram / Nie gram, składka live.",
  },
  {
    id: "attendance",
    label: "Lista obecności",
    home: "all",
    www: true,
    ios: true,
    android: true,
    wwwNote: "Pełna lista IN / MAYBE / waitlist + goście.",
    mobileNote: "Potwierdzenie obecności jednym tapnięciem.",
  },
  {
    id: "payments",
    label: "Płatności",
    home: "all",
    www: true,
    ios: true,
    android: true,
    wwwNote: "Historia, korekty, statusy HotPay, BLIK.",
    mobileNote: "Szybka dopłata, Apple/Google Pay gdy dostępne.",
  },
  {
    id: "wallet",
    label: "Portfel",
    home: "all",
    www: true,
    ios: true,
    android: true,
    wwwNote: "Ledger, filtry transakcji, otwarte dopłaty.",
    mobileNote: "Saldo + doładuj + ostatnie 5 operacji.",
  },
  {
    id: "rankings",
    label: "Rankingi",
    home: "all",
    www: true,
    ios: true,
    android: true,
    wwwNote: "Sezony, zakładki, tabela 1–50 + ja.",
    mobileNote: "Podium + ja zawsze widoczne, swipe zakładek.",
  },
  {
    id: "stats",
    label: "Statystyki",
    home: "all",
    www: true,
    ios: true,
    android: true,
    wwwNote: "Wykresy, porównania, eksport.",
    mobileNote: "Szybki wpis goli/asyst po meczu.",
  },
  {
    id: "bookings",
    label: "Rezerwacje boisk",
    home: "all",
    www: true,
    ios: true,
    android: true,
    wwwNote: "Kalendarz, hold, marketplace, cenniki.",
    mobileNote: "Slot chips + timer hold + płatność.",
  },
  {
    id: "map",
    label: "Mapa boisk",
    home: "www-primary",
    www: true,
    ios: true,
    android: true,
    wwwNote: "Split mapa + lista + zaawansowane filtry.",
    mobileNote: "Pełny ekran + bottom sheet z kartą boiska.",
  },
  {
    id: "broadcasts",
    label: "Transmisje",
    home: "all",
    www: true,
    ios: true,
    android: true,
    wwwNote: "Player + czat + archiwum VOD.",
    mobileNote: "Player full-bleed, PiP, badge LIVE.",
  },
  {
    id: "gallery",
    label: "Galerie",
    home: "all",
    www: true,
    ios: true,
    android: true,
    wwwNote: "Albumy, tagi, lightbox, upload wielu plików.",
    mobileNote: "Siatka, aparat, tag siebie.",
  },
  {
    id: "profile",
    label: "Profil gracza",
    home: "all",
    www: true,
    ios: true,
    android: true,
    wwwNote: "Sezon, historia, ustawienia konta.",
    mobileNote: "Edycja zdjęcia, pozycji, powiadomień.",
  },
  {
    id: "notifications",
    label: "Powiadomienia",
    home: "mobile-primary",
    www: true,
    ios: true,
    android: true,
    wwwNote: "Centrum powiadomień + e-mail.",
    mobileNote: "Push natywny, preferencje w 3 przełącznikach.",
  },
  {
    id: "admin",
    label: "Administracja",
    home: "www-primary",
    www: true,
    ios: true,
    android: true,
    wwwNote: "Pełny panel: mecze, finanse, boiska, audit.",
    mobileNote: "Skrót: pilne akcje; tabele zostają na WWW.",
  },
];

export function assertFeatureParity(features: EcosystemFeature[] = ECOSYSTEM_FEATURES) {
  const missing = features.filter((f) => !f.www || !f.ios || !f.android);
  return missing.map((f) => f.id);
}

export const SHARED_STACK = [
  "backend",
  "API",
  "baza danych",
  "logowanie",
  "płatności",
  "ranking",
  "statystyki",
  "powiadomienia",
] as const;
