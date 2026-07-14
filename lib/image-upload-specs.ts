import {
  SITE_ASSET_KEYS,
  SITE_ASSET_META,
  type SiteAssetKey,
} from "@/lib/site-assets";

/** Wspólny opis wymagań dla grafik wgrywanych w panelu admina. */
export type ImageUploadSpec = {
  label: string;
  hint: string;
  /** Gdzie na stronie pojawia się grafika. */
  whereUsed: string;
  /** Jak dużo miejsca zajmuje na ekranie (orientacyjnie). */
  displayOnSite: string;
  /** Zalecany rozmiar pliku, aby dobrze wypełnić pole. */
  recommendedPixels: string;
  aspectRatio: string;
  formats: string;
  maxFileSize: string;
  fillTip: string;
};

export const PROFILE_PHOTO_SPEC: ImageUploadSpec = {
  label: "Zdjęcie profilowe gracza",
  hint: "Gracze wgrywają je sami w Profil — tutaj tylko informacja dla administratora.",
  whereUsed: "Profil, lista piłkarzy, rankingi, składy, panel admina",
  displayOnSite: "Koło 128×128 px na profilu; w listach 28–56 px",
  recommendedPixels: "512×512 px (min. 256×256 px)",
  aspectRatio: "1:1 — kwadrat (wyświetlane w kole)",
  formats: "JPG, PNG, WebP, GIF",
  maxFileSize: "2 MB",
  fillTip: "Kadruj twarz na środku kwadratu — brzegi i tak zostaną przycięte do koła.",
};

export const SITE_ASSET_UPLOAD_SPECS: Record<SiteAssetKey, ImageUploadSpec> = {
  logo_header: {
    label: SITE_ASSET_META.logo_header.label,
    hint: SITE_ASSET_META.logo_header.hint,
    whereUsed: "Górny pasek nawigacji obok nazwy akademii",
    displayOnSite: "Ok. 36×36 px (do 44×44 px na większych ekranach)",
    recommendedPixels: "512×512 px (min. 160×160 px)",
    aspectRatio: "1:1 — kwadrat",
    formats: "PNG, SVG lub WebP (najlepiej z przezroczystym tłem)",
    maxFileSize: "4 MB",
    fillTip: "Logo powinno mieć margines w pliku — nie dotykać krawędzi obrazu.",
  },
  logo_crest: {
    label: SITE_ASSET_META.logo_crest.label,
    hint: SITE_ASSET_META.logo_crest.hint,
    whereUsed: "Nagłówki sekcji, stopka, panel admina, karty meczów",
    displayOnSite: "Ok. 36–40 px w hero; do 128 px w panelu admina",
    recommendedPixels: "512×512 px (min. 256×256 px)",
    aspectRatio: "1:1 — kwadrat",
    formats: "PNG, SVG lub WebP",
    maxFileSize: "4 MB",
    fillTip: "Herb wyśrodkuj w kwadracie — będzie skalowany proporcjonalnie.",
  },
  logo_favicon: {
    label: SITE_ASSET_META.logo_favicon.label,
    hint: SITE_ASSET_META.logo_favicon.hint,
    whereUsed: "Ikona karty przeglądarki i skrótu na ekranie telefonu",
    displayOnSite: "16×16 px (karta) do ok. 32×32 px",
    recommendedPixels: "512×512 px",
    aspectRatio: "1:1 — kwadrat",
    formats: "PNG lub SVG (prosty znak, czytelny w małym rozmiarze)",
    maxFileSize: "4 MB",
    fillTip: "Unikaj drobnych detali — w zakładce widać tylko miniaturę.",
  },
  bg_soccer_ball: {
    label: SITE_ASSET_META.bg_soccer_ball.label,
    hint: SITE_ASSET_META.bg_soccer_ball.hint,
    whereUsed: "Pływające saldo, stopka, dekoracje kart",
    displayOnSite: "Ok. 36–56 px (dekoracja, object-contain)",
    recommendedPixels: "512×512 px",
    aspectRatio: "1:1 — kwadrat",
    formats: "PNG, SVG lub WebP z przezroczystym tłem",
    maxFileSize: "4 MB",
    fillTip: "Piłka na przezroczystym tle — bez prostokątnego tła wokół.",
  },
  bg_stadium: {
    label: SITE_ASSET_META.bg_stadium.label,
    hint: SITE_ASSET_META.bg_stadium.hint,
    whereUsed: "Tło całej strony (body, tryb jasny i ciemny)",
    displayOnSite: "Pełny ekran — cover (wypełnia całe okno)",
    recommendedPixels: "1920×1080 px (zalecane 2560×1440 px)",
    aspectRatio: "16:9 — poziomy panoramiczny",
    formats: "JPG, WebP, PNG lub SVG",
    maxFileSize: "4 MB",
    fillTip: "Ważne elementy trzymaj bliżej środka — brzegi mogą być przycięte na wąskich ekranach.",
  },
  bg_pitch_lines: {
    label: SITE_ASSET_META.bg_pitch_lines.label,
    hint: SITE_ASSET_META.bg_pitch_lines.hint,
    whereUsed: "Dół zielonych kart, terminarz, stopka",
    displayOnSite: "Szeroki pas u dołu karty (szerokość 100%, wys. ok. 44–160 px)",
    recommendedPixels: "1920×320 px (min. 1200×200 px)",
    aspectRatio: "ok. 6:1 — szeroki poziomy pas",
    formats: "PNG, SVG lub WebP (linie boiska u dołu obrazu)",
    maxFileSize: "4 MB",
    fillTip: "Linie boiska umieść przy dolnej krawędzi pliku — tak wypełnią dół karty.",
  },
};

export const ALL_ADMIN_IMAGE_SPECS: ImageUploadSpec[] = [
  ...SITE_ASSET_KEYS.map((key) => SITE_ASSET_UPLOAD_SPECS[key]),
  PROFILE_PHOTO_SPEC,
];
