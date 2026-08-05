/**
 * Sportowy ton komunikatów Akademii — zamiast suchych „Błąd sieci / Bad JSON”.
 */

const EXACT: Record<string, string> = {
  "Błąd sieci": "Zerwany kontakt z szatnią — sprawdź internet i zagraj jeszcze raz.",
  "Błąd sieci.": "Zerwany kontakt z szatnią — sprawdź internet i zagraj jeszcze raz.",
  "Błąd połączenia": "Piłka nie doszła do bramki — sprawdź połączenie.",
  "Bad JSON": "Nieczytelna piłka — odśwież stronę i spróbuj jeszcze raz.",
  "Nieprawidłowe JSON": "Nieczytelna piłka — odśwież stronę i spróbuj jeszcze raz.",
  "Nieprawidłowy JSON": "Nieczytelna piłka — odśwież stronę i spróbuj jeszcze raz.",
  "Invalid id": "Zły numer na koszulce — sprawdź dane.",
  "Not found": "Tego nie ma na liście składu.",
  "Wymagane logowanie": "Wejdź na boisko — zaloguj się imieniem, nazwiskiem i PIN-em.",
  "Brak uprawnień administratora": "Tej części boiska pilnuje sztab — tylko dla admina.",
  "Brak uprawnień do tej sekcji panelu administratora":
    "Tej części szatni strzeże sztab — nie masz wejścia na tę sekcję.",
  "Brak uprawnień do tej sekcji": "Tej części szatni strzeże sztab — nie masz wejścia.",
  "Brak uprawnień lub błąd": "Faul techniczny albo brak przepustki — spróbuj ponownie.",
  "Brak uprawnień": "Brak przepustki na boisko — ta akcja jest zablokowana.",
  "Nie udało się wykonać operacji": "Akcja nie doszła do bramki — spróbuj jeszcze raz.",
  "Nie udało się zapisać": "Zapis nie wpadł do siatki — spróbuj ponownie.",
  "Nie udało się skopiować linku": "Link nie wszedł do schowka — spróbuj jeszcze raz.",
  "Nie udało się wczytać przeglądu": "Przegląd nie wyszedł z szatni — odśwież panel.",
  "Nie udało się wczytać użytkowników": "Lista zawodników nie wyszła na murawę — odśwież.",
  "Nie udało się wczytać meczów": "Terminarz nie wyszedł ze szatni — odśwież.",
  "Nie udało się wczytać statystyk": "Statystyki nie doszły do tablicy wyników — odśwież.",
  "Nie udało się wczytać analityki": "Analityka nie wyszła na murawę — odśwież.",
  "Nie udało się wczytać zapisów": "Lista zapisów nie wyszła ze szatni — odśwież.",
  "Nie udało się wczytać sezonów": "Sezony nie wyszły na boisko — odśwież.",
  "Nie udało się wczytać składów": "Składy nie wyszły na boisko — odśwież.",
  "Nie udało się anulować meczu": "Anulacja nie doszła do sędziego — spróbuj ponownie.",
  "Błąd podczas anulacji meczu": "Faul przy anulacji — spróbuj jeszcze raz.",
  "Błąd podczas zapisu": "Faul przy zapisie — spróbuj jeszcze raz.",
  "Nie udało się zapisać opłaty": "Opłata nie wpadła do portfela — spróbuj ponownie.",
  "Nie udało się zapisać opłaty — sprawdź połączenie":
    "Opłata nie wpadła do portfela — sprawdź połączenie i spróbuj jeszcze raz.",
  "Nie udało się dodać gościa": "Gość nie wszedł na listę — spróbuj ponownie.",
  "Nie udało się usunąć piłkarza": "Piłkarz nie zszedł z boiska — spróbuj ponownie.",
  "Nie udało się utworzyć konta": "Konto nie weszło do szatni — spróbuj ponownie.",
  "Nie udało się zapisać zmian": "Zmiany nie wpadły do protokołu — spróbuj ponownie.",
  "Nie udało się usunąć użytkownika": "Konto nie zeszło z listy — spróbuj ponownie.",
  "Nie udało się zresetować PIN-u": "PIN nie poszedł do szatni na reset — spróbuj ponownie.",
  "Nie udało się wypisać": "Wypisanie nie doszło do protokołu — spróbuj ponownie.",
  "Nie udało się zapisać statystyk.": "Statystyki nie wpadły na tablicę — spróbuj ponownie.",
  "Nie udało się zapisać statystyk": "Statystyki nie wpadły na tablicę — spróbuj ponownie.",
  "Nie dodano meczu": "Mecz nie wszedł do terminarza — spróbuj ponownie.",
  "Nie zapisano składu": "Skład nie wpadł na boisko — spróbuj ponownie.",
  "Nie zapisano widoczności": "Widoczność składu nie weszła do gry — spróbuj ponownie.",
  "Wybierz zawodnika": "Wskaż zawodnika z listy — bez numeru na koszulce ani rusz.",
  "Podaj prawidłową kwotę": "Podaj uczciwą kwotę — bez tego piłka nie ruszy.",
  "Podaj prawidłowe saldo": "Podaj poprawne saldo — sztab potrzebuje czystych liczb.",
  "Podaj kwotę dla przynajmniej jednego zawodnika":
    "Ustaw kwotę choć jednemu zawodnikowi — inaczej mecz nie rozliczy się.",
  "Mecz nie istnieje": "Tego meczu nie ma w terminarzu.",
  "Mecz niedostępny": "Ten mecz jest poza boiskiem — niedostępny.",
  "Nie znaleziono wiadomości": "Wiadomość zniknęła z szatni łączności.",
  "Brak dostępu do rozmowy.": "Tej rozmowy pilnuje sztab — brak wejścia.",
  "Brak conversation_key": "Brak klucza rozmowy — zacznij czat od nowa.",
  "Administrator korzysta z panelu wiadomości.":
    "Admin gra ze szatni łączności w panelu — tu jest boisko graczy.",
  "Musisz ustawić PIN — otwórz stronę ustawiania PIN-u lub wyloguj się i zaloguj ponownie.":
    "Najpierw ustaw PIN jak numer na koszulce — wejdź w ustawianie PIN-u albo wyloguj się i wejdź od nowa.",
  "Zbyt wiele żądań. Spróbuj ponownie za chwilę.":
    "Za dużo sprintów naraz — złap oddech i spróbuj za chwilę.",
  "Za dużo sprintów naraz — złap oddech i spróbuj za chwilę.":
    "Za dużo sprintów naraz — złap oddech i spróbuj za chwilę.",
  "Brak dostępu do sekcji PZU Cup": "Brak karnetu na PZU Cup — poproś sztab o dostęp.",
  "Nie znaleziono meczu": "Tego meczu nie ma na tej połowie boiska.",
  "Wejdź na boisko — zaloguj się imieniem, nazwiskiem i PIN-em.":
    "Wejdź na boisko — zaloguj się imieniem, nazwiskiem i PIN-em.",
  "Tej części boiska pilnuje sztab — tylko dla admina.":
    "Tej części boiska pilnuje sztab — tylko dla admina.",
  "Tej części szatni strzeże sztab — nie masz wejścia na tę sekcję.":
    "Tej części szatni strzeże sztab — nie masz wejścia na tę sekcję.",
};

const PREFIX_RULES: { test: RegExp; replace: (m: string, ...g: string[]) => string }[] = [
  {
    test: /^Nie znaleziono meczu #(\d+)$/i,
    replace: (_m, id) => `Mecz #${id} nie wyszedł na murawę — sprawdź numer.`,
  },
  {
    test: /^Nie znaleziono użytkownika #(\d+)$/i,
    replace: (_m, id) => `Zawodnik #${id} nie ma miejsca w szatni — sprawdź numer.`,
  },
  {
    test: /^Nie udało się wczytać wykresów godzinowych/i,
    replace: () => "Wykresy godzinowe nie wyszły na tablicę — odśwież analitykę.",
  },
  {
    test: /^Nie udało się wczytać/i,
    replace: (m) => m.replace(/^Nie udało się wczytać/i, "Nie udało się ściągnąć ze szatni"),
  },
  {
    test: /^Nie udało się rozpocząć sezonu/i,
    replace: () => "Nowy sezon nie wystartował z gwizdkiem — spróbuj ponownie.",
  },
  {
    test: /^Nie udało się zakończyć sezonu/i,
    replace: () => "Sezon nie domknął się w protokole — spróbuj ponownie.",
  },
  {
    test: /^Nie udało się dodać losowania/i,
    replace: () => "Losowanie kapitanów nie weszło do gry — spróbuj ponownie.",
  },
  {
    test: /^Nie udało się wyczyścić historii losowania/i,
    replace: () => "Historia losowania nie zeszła z tablicy — spróbuj ponownie.",
  },
  {
    test: /^Brak historii losowania/i,
    replace: () => "Pusto na tablicy losowań — nie ma czego czyścić.",
  },
  {
    test: /^Nie udało się (.+)$/i,
    replace: (_m, rest) => {
      const r = String(rest).replace(/\.$/, "").trim();
      return `Akcja nie doszła do bramki (${r}) — spróbuj jeszcze raz.`;
    },
  },
];

/** Zamienia suchy / techniczny komunikat błędu na sportowy ton Akademii. */
export function toSportError(message: unknown, fallback = "Faul techniczny — spróbuj jeszcze raz."): string {
  if (typeof message !== "string") return fallback;
  const raw = message.trim();
  if (!raw) return fallback;

  const exact = EXACT[raw];
  if (exact) return exact;

  for (const rule of PREFIX_RULES) {
    const m = raw.match(rule.test);
    if (m) return rule.replace(raw, ...(m.slice(1) as string[]));
  }

  // Angielskie resztki z API
  if (/^(bad |invalid |not |forbidden|unauthorized)/i.test(raw)) {
    return "Faul techniczny ze strony serwera — odśwież i spróbuj jeszcze raz.";
  }

  return raw;
}

export function toSportSuccess(message: unknown, fallback = "Jest! Akcja wpadła do siatki."): string {
  if (typeof message !== "string") return fallback;
  const raw = message.trim();
  if (!raw) return fallback;

  const map: Record<string, string> = {
    "Zapisano": "Zapisane — piłka w siatce!",
    "Zapisano ustawienia": "Ustawienia w protokole — gotowe do gry!",
    "Zapisano dane użytkownika": "Karta zawodnika zaktualizowana!",
    "Utworzono konto użytkownika": "Nowy zawodnik w szatni — konto gotowe!",
    "Mecz został anulowany": "Mecz zdjęty z terminarza — skład powiadomiony.",
  };
  return map[raw] ?? raw;
}
