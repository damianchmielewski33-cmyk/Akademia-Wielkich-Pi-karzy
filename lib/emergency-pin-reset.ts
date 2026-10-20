import type { AppDb } from "@/lib/db";
import { hashPin, isValidPinFormat, isWeakPin } from "@/lib/pin";

export type EmergencyPinResetScope = "admins" | "all";

export type EmergencyPinResetResult = {
  updatedUsers: number;
  scope: EmergencyPinResetScope;
  emailPasswordAuthDisabled: boolean;
  tempPinDigits: number;
};

/**
 * Awaryjny reset PIN-ów po utracie PIN_PEPPER.
 * Ustawia ten sam tymczasowy PIN (hash pod bieżący env — bez starego peppera albo z nowym znanym).
 * Wyłącza logowanie e-mail/hasło, żeby PIN znów działał dla wszystkich.
 */
export async function runEmergencyPinReset(
  db: AppDb,
  args: { tempPin: string; scope: EmergencyPinResetScope }
): Promise<EmergencyPinResetResult> {
  const tempPin = args.tempPin.trim();
  if (!isValidPinFormat(tempPin)) {
    throw new Error("Tymczasowy PIN musi mieć 4–6 cyfr.");
  }
  if (isWeakPin(tempPin)) {
    throw new Error("Wybierz silniejszy tymczasowy PIN (unikaj 1234, 0000 itd.).");
  }

  const pinHash = await hashPin(tempPin);
  const where =
    args.scope === "admins" ? "WHERE COALESCE(is_admin, 0) = 1" : "";

  const update = await db
    .prepare(
      `UPDATE users
       SET pin_hash = ?,
           pin_hash_pending = NULL,
           pin_reset_requested = 0,
           auth_version = COALESCE(auth_version, 0) + 1
       ${where}`
    )
    .run(pinHash);

  const updatedUsers = Number(update.changes ?? 0);

  let emailPasswordAuthDisabled = false;
  try {
    await db
      .prepare(
        `UPDATE app_settings
         SET email_password_auth_enabled = 0
         WHERE COALESCE(realm, 'academy') = 'academy'`
      )
      .run();
    emailPasswordAuthDisabled = true;
  } catch {
    /* kolumna może nie istnieć na bardzo starej bazie */
  }

  return {
    updatedUsers,
    scope: args.scope,
    emailPasswordAuthDisabled,
    tempPinDigits: tempPin.length,
  };
}
