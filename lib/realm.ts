/** Osobne „światy” aplikacji — Akademia i PZU Cup mają izolowane dane. */
export const REALMS = {
  ACADEMY: "academy",
  PZU_CUP: "pzu_cup",
} as const;

export type Realm = (typeof REALMS)[keyof typeof REALMS];

export const REALM_HEADER = "x-awp-realm";

export function isRealm(value: string | null | undefined): value is Realm {
  return value === REALMS.ACADEMY || value === REALMS.PZU_CUP;
}

export function parseRealm(value: string | null | undefined, fallback: Realm = REALMS.ACADEMY): Realm {
  return isRealm(value) ? value : fallback;
}

export function realmPathPrefix(realm: Realm): string {
  return realm === REALMS.PZU_CUP ? "/pzu-cup" : "";
}

export function realmLoginPath(realm: Realm): string {
  return realm === REALMS.PZU_CUP ? "/pzu-cup/login" : "/login";
}

export function realmRegisterPath(realm: Realm): string {
  return realm === REALMS.PZU_CUP ? "/pzu-cup/register" : "/register";
}

export function realmHomePath(realm: Realm): string {
  return realm === REALMS.PZU_CUP ? "/pzu-cup" : "/";
}

export function realmTerminarzPath(realm: Realm): string {
  return realm === REALMS.PZU_CUP ? "/pzu-cup/terminarz" : "/terminarz";
}

export function realmPilkarzePath(realm: Realm): string {
  return realm === REALMS.PZU_CUP ? "/pzu-cup/pilkarze" : "/pilkarze";
}

export function realmRankingiPath(realm: Realm): string {
  return realm === REALMS.PZU_CUP ? "/pzu-cup/rankingi" : "/rankingi";
}

export function realmFromPathname(pathname: string | null | undefined): Realm {
  if (pathname?.startsWith("/pzu-cup")) return REALMS.PZU_CUP;
  return REALMS.ACADEMY;
}

export function realmLabel(realm: Realm): string {
  return realm === REALMS.PZU_CUP ? "PZU Cup" : "Akademia";
}
