/** Realm aplikacji — historycznie bywał też „pzu_cup”; dziś tylko Akademia. */
export const REALMS = {
  ACADEMY: "academy",
} as const;

export type Realm = (typeof REALMS)[keyof typeof REALMS];

/** Alias historyczny w DB / nagłówkach — mapujemy na Akademię. */
const LEGACY_PZU_CUP = "pzu_cup";

export const REALM_HEADER = "x-awp-realm";

export function isRealm(value: string | null | undefined): value is Realm {
  return value === REALMS.ACADEMY;
}

export function parseRealm(value: string | null | undefined, fallback: Realm = REALMS.ACADEMY): Realm {
  if (value === REALMS.ACADEMY) return REALMS.ACADEMY;
  if (value === LEGACY_PZU_CUP) return REALMS.ACADEMY;
  return fallback;
}

export function realmPathPrefix(_realm?: Realm): string {
  return "";
}

export function realmLoginPath(_realm?: Realm): string {
  return "/login";
}

export function realmRegisterPath(_realm?: Realm): string {
  return "/register";
}

export function realmHomePath(_realm?: Realm): string {
  return "/";
}

export function realmTerminarzPath(_realm?: Realm): string {
  return "/terminarz";
}

export function realmPilkarzePath(_realm?: Realm): string {
  return "/pilkarze";
}

export function realmRankingiPath(_realm?: Realm): string {
  return "/rankingi";
}

export function realmFromPathname(_pathname?: string | null): Realm {
  return REALMS.ACADEMY;
}

export function realmLabel(_realm?: Realm): string {
  return "Akademia";
}
