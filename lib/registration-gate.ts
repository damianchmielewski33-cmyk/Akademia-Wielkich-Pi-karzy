import { REALMS, type Realm } from "@/lib/realm";

type DbLike = {
  prepare: (sql: string) => { get: (...args: unknown[]) => Promise<unknown> | unknown };
};

type RegistrationSettings = {
  allow_self_registration: boolean | null;
};

/**
 * Rejestracja samoobsługowa graczy jest zawsze włączona (Akademia i PZU Cup).
 * Flaga w panelu / env nie zamyka rejestracji.
 */
export async function isSelfRegistrationAllowed(
  _db: DbLike,
  _settings?: RegistrationSettings,
  _realm: Realm = REALMS.ACADEMY
): Promise<boolean> {
  return true;
}

export async function isSelfRegistrationAllowedForRealm(
  _db: DbLike,
  _realm: Realm
): Promise<boolean> {
  return true;
}
