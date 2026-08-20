type DbLike = {
  prepare: (sql: string) => { get: (...args: unknown[]) => Promise<unknown> | unknown };
};

type RegistrationSettings = {
  allow_self_registration: boolean | null;
};

/**
 * Rejestracja samoobsługowa graczy jest zawsze włączona (Akademia i PZU Cup).
 * Flaga w panelu / env nie zamyka rejestracji.
 * Argumenty zachowane dla kompatybilności wywołań API.
 */
export async function isSelfRegistrationAllowed(
  ...args: [DbLike?, RegistrationSettings?, import("@/lib/realm").Realm?]
): Promise<boolean> {
  void args;
  return true;
}

export async function isSelfRegistrationAllowedForRealm(
  ...args: [DbLike?, import("@/lib/realm").Realm?]
): Promise<boolean> {
  void args;
  return true;
}
