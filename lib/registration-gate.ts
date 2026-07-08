type DbLike = {
  prepare: (sql: string) => { get: (...args: unknown[]) => Promise<unknown> | unknown };
};

type RegistrationSettings = {
  allow_self_registration: boolean | null;
};

/**
 * Rejestracja samoobsługowa:
 * - zawsze dozwolona, gdy w bazie nie ma jeszcze użytkowników (pierwszy admin),
 * - w produkcji domyślnie wyłączona po utworzeniu pierwszego konta,
 * - można włączyć jawnie przez ALLOW_SELF_REGISTRATION=1,
 * - panel admina może wymusić otwarcie/zamknięcie (allow_self_registration w app_settings).
 */
export async function isSelfRegistrationAllowed(
  db: DbLike,
  settings?: RegistrationSettings
): Promise<boolean> {
  const count =
    ((await db.prepare("SELECT COUNT(*) AS c FROM users").get()) as { c: number } | undefined)?.c ?? 0;
  if (count === 0) return true;

  const allowFromDb =
    settings?.allow_self_registration ??
    ((
      (await db
        .prepare("SELECT allow_self_registration FROM app_settings WHERE id = 1")
        .get()) as { allow_self_registration: number | null } | undefined
    )?.allow_self_registration);

  if (allowFromDb === 1) return true;
  if (allowFromDb === 0) return false;

  if (process.env.ALLOW_SELF_REGISTRATION === "1") return true;
  if (process.env.NODE_ENV !== "production") return true;
  return false;
}
