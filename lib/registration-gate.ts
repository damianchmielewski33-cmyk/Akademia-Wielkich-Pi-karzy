import { getAppSettings } from "@/lib/app-settings";
import { REALMS, type Realm } from "@/lib/realm";

type DbLike = {
  prepare: (sql: string) => { get: (...args: unknown[]) => Promise<unknown> | unknown };
};

type RegistrationSettings = {
  allow_self_registration: boolean | null;
};

/**
 * Rejestracja samoobsługowa (osobno dla Akademii i PZU Cup):
 * - zawsze dozwolona, gdy w danym realm nie ma jeszcze użytkowników (pierwszy admin — tylko Akademia),
 * - w produkcji domyślnie wyłączona po utworzeniu pierwszego konta,
 * - można włączyć jawnie przez ALLOW_SELF_REGISTRATION=1,
 * - panel admina może wymusić otwarcie/zamknięcie (allow_self_registration w app_settings danego realm).
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

  const allowFromDb =
    settings?.allow_self_registration ??
    ((
      (await db
        .prepare("SELECT allow_self_registration FROM app_settings WHERE realm = ?")
        .get(realm)) as { allow_self_registration: number | null } | undefined
    )?.allow_self_registration);

  if (allowFromDb === 1) return true;
  if (allowFromDb === 0) return false;

  if (process.env.ALLOW_SELF_REGISTRATION === "1") return true;
  if (process.env.NODE_ENV !== "production") return true;
  return false;
}

export async function isSelfRegistrationAllowedForRealm(db: DbLike, realm: Realm): Promise<boolean> {
  const settings = await getAppSettings(db, realm);
  return isSelfRegistrationAllowed(db, settings, realm);
}
