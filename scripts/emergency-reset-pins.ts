/**
 * Awaryjny reset PIN-ów w Turso po utracie PIN_PEPPER.
 *
 * 1) W .env.local ustaw TURSO_DATABASE_URL + TURSO_AUTH_TOKEN (z Rendera).
 * 2) NIE ustawiaj starego PIN_PEPPER (albo ustaw nowy znany).
 * 3) Uruchom:
 *    EMERGENCY_TEMP_PIN=482917 CONFIRM=YES npx tsx scripts/emergency-reset-pins.ts
 *    EMERGENCY_TEMP_PIN=482917 CONFIRM=YES SCOPE=all npx tsx scripts/emergency-reset-pins.ts
 *
 * Domyślnie SCOPE=admins. Potem zaloguj się tymczasowym PIN-em i zmień PIN w aplikacji.
 */
import fs from "fs";
import path from "path";
import { createClient } from "@libsql/client";
import { hashPin, isValidPinFormat, isWeakPin } from "../lib/pin";

function loadEnvLocal() {
  const f = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(f)) return;
  for (const line of fs.readFileSync(f, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i <= 0) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

async function main() {
  loadEnvLocal();

  if (process.env.CONFIRM?.trim() !== "YES") {
    console.error("Odrzucono: ustaw CONFIRM=YES (świadome uruchomienie).");
    process.exit(1);
  }

  const tempPin = process.env.EMERGENCY_TEMP_PIN?.trim() ?? "";
  if (!isValidPinFormat(tempPin)) {
    console.error("EMERGENCY_TEMP_PIN musi mieć 4–6 cyfr.");
    process.exit(1);
  }
  if (isWeakPin(tempPin)) {
    console.error("Za słaby PIN (unikaj 1234, 0000 itd.). Wybierz inny tymczasowy.");
    process.exit(1);
  }

  const scope = (process.env.SCOPE?.trim() || "admins").toLowerCase();
  if (scope !== "admins" && scope !== "all") {
    console.error("SCOPE musi być admins albo all.");
    process.exit(1);
  }

  const url = process.env.TURSO_DATABASE_URL?.trim();
  if (!url) {
    console.error("Brak TURSO_DATABASE_URL (.env.local albo env).");
    process.exit(1);
  }

  const client = createClient({
    url,
    authToken: process.env.TURSO_AUTH_TOKEN?.trim() || undefined,
  });

  const pinHash = await hashPin(tempPin);
  const where = scope === "admins" ? "WHERE COALESCE(is_admin, 0) = 1" : "";
  const result = await client.execute({
    sql: `UPDATE users
           SET pin_hash = ?,
               pin_hash_pending = NULL,
               pin_reset_requested = 0,
               auth_version = COALESCE(auth_version, 0) + 1
           ${where}`,
    args: [pinHash],
  });

  try {
    await client.execute({
      sql: `UPDATE app_settings
            SET email_password_auth_enabled = 0
            WHERE COALESCE(realm, 'academy') = 'academy'`,
      args: [],
    });
  } catch {
    /* ignore */
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        scope,
        rowsAffected: result.rowsAffected,
        pinPepperInEnv: Boolean(process.env.PIN_PEPPER?.trim()),
        hint: "Zaloguj się imię+nazwisko+tymczasowy PIN. Na Renderze PIN_PEPPER musi być taki sam jak przy tym skrypcie (albo pusty w obu).",
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
