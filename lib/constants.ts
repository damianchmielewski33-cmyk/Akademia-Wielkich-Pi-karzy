export const SESSION_COOKIE = "awp_session";

/**
 * Parametr zapytania dodawany do linków wysyłanych na zewnątrz (e-mail, udostępnienie).
 * Middleware usuwa sesję i przekierowuje bez tego parametru — odbiorca nie jest traktowany jak zalogowany użytkownik z oryginalnej przeglądarki.
 */
export const SHARE_LINK_QUERY_PARAM = "awp_share";

/** Link z terminarza „zaproszenie na mecz” — razem z `mecz` uruchamia przepływ zapisu po zalogowaniu. */
export const INVITE_MATCH_QUERY_PARAM = "zaproszenie";

/** Krótkotrwałe ciasteczko (nie httpOnly): sygnał dla klienta, żeby wyczyścić sessionStorage / localStorage po wejściu z udostępnionego linku. */
export const CLIENT_STORAGE_CLEANUP_COOKIE = "awp_client_cleanup";

/** Klucz localStorage dla anonimowej analityki — zachowujemy przy czyszczeniu po udostępnionym linku. */
export const VISITOR_ID_STORAGE_KEY = "awp_visitor_id";

/** Teksty informacyjne na stronie logowania i ustawiania PIN-u. */
export const PIN_LOGIN_POLICY_LINES = [
  "Logujesz się imieniem, nazwiskiem i PIN-em (4–6 cyfr). Pseudonim piłkarza (awatar) wybierasz przy rejestracji — możesz go wyszukać w internecie albo wpisać ręcznie; przy pierwszym ustawieniu PIN-u potwierdzasz tożsamość tym samym pseudonimem.",
] as const;

/**
 * Tymczasowe przełączniki UI.
 * Jeśli potrzebujesz wrócić do pop-upu powiadomień, ustaw na `true`.
 */
export const MATCH_NOTIFICATION_PROMPT_ENABLED = false;
