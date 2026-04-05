import type { ComponentType } from "react";
import { HomeStadiumPreloader } from "./scenes-academy";
import { TerminarzCalendarPreloader } from "./scenes-schedule";
import { PilkarzeLockerPreloader, SkladyTacticsPreloader } from "./scenes-roster";
import {
  AdminConsolePreloader,
  ProfilBadgePreloader,
  StatystykiBarsPreloader,
} from "./scenes-data";
import { RankingNightPreloader } from "./rankingi-night-preloader";

export type RoutePreloaderSpec = {
  title: string;
  subtitle: string;
  Preloader: ComponentType;
};

function stripQuery(path: string) {
  return (path.split("?")[0] || "/").trim() || "/";
}

/** Pełny ekran jak transport — bez `PagePreloaderLayout` w nakładce nawigacji. */
export function isFullBleedRoute(rawPath: string): boolean {
  const path = stripQuery(rawPath);
  return path.startsWith("/rankingi");
}

/** Preloader i copy dopasowane do docelowej ścieżki (nawigacja + loading.tsx). */
export function getRoutePreloaderSpec(rawPath: string): RoutePreloaderSpec {
  const path = stripQuery(rawPath);

  if (path.startsWith("/panel-admina")) {
    return {
      title: "Panel administratora",
      subtitle: "Konsola trenera: kafelki, skan i checklisty — ładujemy narzędzia.",
      Preloader: AdminConsolePreloader,
    };
  }
  if (path.startsWith("/terminarz")) {
    return {
      title: "Terminarz",
      subtitle: "Kalendarz, zegar i gwizdek — pobieramy najbliższe spotkania.",
      Preloader: TerminarzCalendarPreloader,
    };
  }
  if (path.startsWith("/pilkarze")) {
    return {
      title: "Piłkarze",
      subtitle: "Szatnia, koszulki na wieszakach i numerki — składa się lista.",
      Preloader: PilkarzeLockerPreloader,
    };
  }
  if (path === "/players" || path.startsWith("/players/")) {
    return {
      title: "Karta zawodnika",
      subtitle: "Numer, herb i detale — wczytujemy profil na boisku.",
      Preloader: PilkarzeLockerPreloader,
    };
  }
  if (path.startsWith("/sklady")) {
    return {
      title: "Składy",
      subtitle: "Tablica taktyczna: boisko z góry, żetony i zapiski trenera.",
      Preloader: SkladyTacticsPreloader,
    };
  }
  if (path.startsWith("/statystyki")) {
    return {
      title: "Statystyki",
      subtitle: "Słupki, siatka i liczby z ostatnich meczów.",
      Preloader: StatystykiBarsPreloader,
    };
  }
  if (path.startsWith("/rankingi")) {
    return {
      title: "Rankingi",
      subtitle: "Klasyfikacja — podium i kolejność w tabeli.",
      Preloader: RankingNightPreloader,
    };
  }
  if (path.startsWith("/platnosci")) {
    return {
      title: "Płatności",
      subtitle: "Wpłata BLIK na mecz — wczytujemy szczegóły i listę zapisów.",
      Preloader: HomeStadiumPreloader,
    };
  }
  if (path.startsWith("/profil")) {
    return {
      title: "Profil",
      subtitle: "Legitymacja zawodnika, smycz i podpis — przygotowujemy kartę.",
      Preloader: ProfilBadgePreloader,
    };
  }
  if (path.startsWith("/login") || path.startsWith("/register")) {
    return {
      title: "Konto",
      subtitle: "Murawa, światła i wejście na boisko — chwila cierpliwości.",
      Preloader: HomeStadiumPreloader,
    };
  }
  if (path.startsWith("/o-nas")) {
    return {
      title: "O nas",
      subtitle: "Akademia na murawie — wczytujemy zasady i historię boiska.",
      Preloader: HomeStadiumPreloader,
    };
  }
  if (path.startsWith("/confirm")) {
    return {
      title: "Potwierdzenie",
      subtitle: "Sprawdzamy zaproszenie — zaraz wracasz na boisko.",
      Preloader: HomeStadiumPreloader,
    };
  }

  return {
    title: "Ładujemy stronę",
    subtitle: "Światła stadionu, murawa i piłka — zaraz jesteś na boisku.",
    Preloader: HomeStadiumPreloader,
  };
}
