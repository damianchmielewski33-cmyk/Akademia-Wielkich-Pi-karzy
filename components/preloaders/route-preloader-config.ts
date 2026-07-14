export type RoutePreloaderSpec = {
  title: string;
  subtitle: string;
  kicker?: string;
};

function stripQuery(path: string) {
  return (path.split("?")[0] || "/").trim() || "/";
}

/** Teksty ładowania dopasowane do docelowej trasy. */
export function getRoutePreloaderSpec(rawPath: string): RoutePreloaderSpec {
  const path = stripQuery(rawPath);

  if (path.startsWith("/panel-admina")) {
    return {
      title: "Panel administratora",
      subtitle: "Wczytujemy narzędzia zarządzania akademią.",
    };
  }
  if (path.startsWith("/terminarz") || path.startsWith("/terminator")) {
    return {
      title: "Terminarz",
      subtitle: "Pobieramy terminy meczów i zapisy.",
    };
  }
  if (path.startsWith("/pilkarze")) {
    return {
      title: "Piłkarze",
      subtitle: "Ładujemy listę zawodników akademii.",
    };
  }
  if (path === "/players" || path.startsWith("/players/")) {
    return {
      title: "Profil zawodnika",
      subtitle: "Wczytujemy kartę gracza.",
    };
  }
  if (path.startsWith("/sklady")) {
    return {
      title: "Składy",
      subtitle: "Przygotowujemy ustawienia drużyn.",
    };
  }
  if (path.startsWith("/statystyki")) {
    return {
      title: "Statystyki",
      subtitle: "Zbieramy liczby z boiska.",
    };
  }
  if (path.startsWith("/rankingi")) {
    return {
      title: "Rankingi",
      subtitle: "Sortujemy tabele wyników.",
    };
  }
  if (path.startsWith("/galeria")) {
    return {
      title: "Galeria",
      subtitle: "Wczytujemy nagrania z meczów.",
    };
  }
  if (path.startsWith("/platnosci")) {
    return {
      title: "Płatności",
      subtitle: "Sprawdzamy saldo i wpłaty.",
    };
  }
  if (path.startsWith("/profil")) {
    return {
      title: "Profil",
      subtitle: "Otwieramy Twoje konto zawodnika.",
    };
  }
  if (path.startsWith("/o-nas")) {
    return {
      title: "O nas",
      subtitle: "Wczytujemy informacje o akademii.",
    };
  }
  if (path.startsWith("/kontakt")) {
    return {
      title: "Kontakt",
      subtitle: "Chwila — ładujemy dane kontaktowe.",
    };
  }
  if (path.startsWith("/zaproszenie") || path.startsWith("/confirm")) {
    return {
      title: "Zaproszenie na mecz",
      subtitle: "Przygotowujemy wizytówkę meczu.",
    };
  }
  if (path.startsWith("/transport")) {
    return {
      title: "Transport",
      subtitle: "Ładujemy ustalenia dojazdu na mecz.",
    };
  }
  if (path === "/") {
    return {
      title: "Akademia Wielkich Piłkarzy",
      subtitle: "Witamy na boisku — chwila cierpliwości.",
    };
  }

  return {
    title: "Ładujemy stronę",
    subtitle: "Zaraz wracamy na murawę.",
  };
}

/** @deprecated Wszystkie trasy używają tego samego układu — zachowane dla kompatybilności importów. */
export function isFullBleedRoute(): boolean {
  return false;
}
