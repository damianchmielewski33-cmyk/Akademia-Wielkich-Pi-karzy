/**
 * Tworzy tabele w zdalnej bazie Turso (libSQL).
 * Użycie: skopiuj TURSO_DATABASE_URL i TURSO_AUTH_TOKEN do .env.local, potem:
 *   npm run db:init-turso
 */
import { createClient } from "@libsql/client";
import fs from "fs";
import path from "path";
import { initLibsqlSchema } from "../lib/turso-init-schema";

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
  const url = process.env.TURSO_DATABASE_URL?.trim();
  if (!url) {
    console.error("Brak TURSO_DATABASE_URL. Dodaj ją do .env.local (skopiuj z Vercela / Turso).");
    process.exit(1);
  }
  const client = createClient({
    url,
    authToken: process.env.TURSO_AUTH_TOKEN?.trim() || undefined,
  });
  try {
    await initLibsqlSchema(client);
    console.log("OK: schemat zapisany w Turso (CREATE TABLE IF NOT EXISTS + migracje kolumn).");
  } finally {
    client.close();
  }
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
