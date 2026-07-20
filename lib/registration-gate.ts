import { getAppSettings } from "@/lib/app-settings";
import { REALMS, type Realm } from "@/lib/realm";

type DbLike = {
  prepare: (sql: string) => { get: (...args: unknown[]) => Promise<unknown> | unknown };
};

type RegistrationSettings = {
  allow_self_registration: boolean | null;
};

/** null/undefined w bazie = domyślnie włączone; 0/false = wyłączone; 1/true = włączone. */
function resolveRegistrationFlag(raw: boolean | number | null | undefined): boolean | null {
  if (raw === null || raw === undefined) return null;
  if (raw === true || raw === 1) return true;
  if (raw === false || raw === 0) return false;
  return null;
}

/**
 * Rejestracja samoobsługowa (osobno dla Akademii i PZU Cup):
 * - zawsze dozwolona, gdy w danym realm nie ma jeszcze użytkowników (pierwszy admin),
 * - domyślnie włączona (brak wpisu lub null w app_settings),
 * - wyłączenie tylko jawnie: panel admina (allow_self_registration = 0) lub ALLOW_SELF_REGISTRATION=0.
 */
export async function isSelfRegistrationAllowed(
  db: DbLike,
  settings?: RegistrationSettings,
  realm: Realm = REALMS.ACADEMY
): Promise<boolean> {
  const count =
    (
      (await db
        .prepare("SELECT COUNT(*) AS c FROM users WHERE COALESCE(realm, ?) = ?")
        .get(REALMS.ACADEMY, realm)) as { c: number } | undefined
    )?.c ?? 0;
  if (count === 0) return true;

  const rawFromSettings = settings?.allow_self_registration;
  const rawFromDb =
    rawFromSettings !== undefined
      ? rawFromSettings
      : ((
          (await db
            .prepare("SELECT allow_self_registration FROM app_settings WHERE realm = ?")
            .get(realm)) as { allow_self_registration: number | null } | undefined
        )?.allow_self_registration);

  const flag = resolveRegistrationFlag(rawFromDb);

  if (flag === false) return false;
  if (flag === true) return true;

  if (process.env.ALLOW_SELF_REGISTRATION === "0") return false;
  return true;
}

export async function isSelfRegistrationAllowedForRealm(db: DbLike, realm: Realm): Promise<boolean> {
  const settings = await getAppSettings(db, realm);
  return isSelfRegistrationAllowed(db, settings, realm);
}
