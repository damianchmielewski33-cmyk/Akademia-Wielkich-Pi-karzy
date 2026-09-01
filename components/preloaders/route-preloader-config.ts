export type RoutePreloaderSpec = {
  title: string;
  subtitle: string;
  kicker?: string;
};

function stripQuery(path: string) {
  return (path.split("?")[0] || "/").trim() || "/";
}

/** Teksty ładowania V2 — krótko, bez stadionowej poetyki. */
export function getRoutePreloaderSpec(rawPath: string): RoutePreloaderSpec {
  const path = stripQuery(rawPath);

  if (path.startsWith("/obiekty")) {
    return {
      kicker: "Rezerwacja",
      title: "Obiekty",
      subtitle: "Szukamy wolnych boisk.",
    };
  }
  if (path.startsWith("/rezerwacje")) {
    return {
      kicker: "Rezerwacja",
      title: "Moje rezerwacje",
      subtitle: "Wczytujemy Twoje terminy.",
    };
  }
  if (path.startsWith("/dla-obiektow") || path.startsWith("/partner")) {
    return {
      kicker: "Rezerwacja",
      title: "Panel obiektu",
      subtitle: "Przygotowujemy narzędzia partnera.",
    };
  }
  if (path.startsWith("/panel-admina")) {
    return {
      kicker: "Admin",
      title: "Panel administratora",
      subtitle: "Wczytujemy panel.",
    };
  }
  if (path.startsWith("/terminarz") || path.startsWith("/terminator")) {
    return {
      kicker: "Akademia",
      title: "Terminarz",
      subtitle: "Pobieramy mecze i zapisy.",
    };
  }
  if (path.startsWith("/pilkarze")) {
    return {
      kicker: "Akademia",
      title: "Piłkarze",
      subtitle: "Ładujemy listę zawodników.",
    };
  }
  if (path === "/players" || path.startsWith("/players/")) {
    return {
      kicker: "Akademia",
      title: "Profil zawodnika",
      subtitle: "Wczytujemy kartę gracza.",
    };
  }
  if (path.startsWith("/sklady")) {
    return {
      kicker: "Akademia",
      title: "Składy",
      subtitle: "Przygotowujemy ustawienia.",
    };
  }
  if (path.startsWith("/statystyki")) {
    return {
      kicker: "Akademia",
      title: "Statystyki",
      subtitle: "Zbieramy wyniki.",
    };
  }
  if (path.startsWith("/rankingi")) {
    return {
      kicker: "Akademia",
      title: "Rankingi",
      subtitle: "Sortujemy tabele.",
    };
  }
  if (path.startsWith("/galeria")) {
    return {
      kicker: "Akademia",
      title: "Galeria",
      subtitle: "Wczytujemy media.",
    };
  }
  if (path.startsWith("/platnosci")) {
    return {
      kicker: "Akademia",
      title: "Płatności",
      subtitle: "Sprawdzamy saldo.",
    };
  }
  if (path.startsWith("/profil")) {
    return {
      kicker: "Konto",
      title: "Profil",
      subtitle: "Otwieramy konto.",
    };
  }
  if (path.startsWith("/o-nas")) {
    return {
      kicker: "Info",
      title: "O nas",
      subtitle: "Wczytujemy treść.",
    };
  }
  if (path.startsWith("/kontakt")) {
    return {
      kicker: "Info",
      title: "Kontakt",
      subtitle: "Ładujemy dane kontaktowe.",
    };
  }
  if (path.startsWith("/zaproszenie") || path.startsWith("/confirm")) {
    return {
      kicker: "Akademia",
      title: "Zaproszenie",
      subtitle: "Przygotowujemy wizytówkę meczu.",
    };
  }
  if (path.startsWith("/losowanie-kapitana")) {
    return {
      kicker: "Akademia",
      title: "Losowanie",
      subtitle: "Przygotowujemy kapitana.",
    };
  }
  if (path === "/") {
    return {
      kicker: "AWP",
      title: "Start",
      subtitle: "Chwila — otwieramy stronę.",
    };
  }

  return {
    kicker: "AWP",
    title: "Ładowanie",
    subtitle: "Zaraz wracamy.",
  };
}

/** @deprecated Zachowane dla kompatybilności importów. */
export function isFullBleedRoute(): boolean {
  return false;
}
