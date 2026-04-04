/**
 * Usuwa wszystkie wiersze z bazy SQLite (konta, mecze, zapisy, statystyki, log).
 * Szanuje DATABASE_PATH z .env.local jeśli ustawione.
 * Zatrzymaj `npm run dev` jeśli pojawi się błąd „database is locked”.
 */
const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const cwd = process.cwd();

function loadEnvLocal() {
  const f = path.join(cwd, ".env.local");
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

loadEnvLocal();

const dbPath = process.env.DATABASE_PATH
  ? path.resolve(cwd, process.env.DATABASE_PATH)
  : path.join(cwd, "data", "database.db");

if (!fs.existsSync(dbPath)) {
  console.error("Brak pliku bazy:", dbPath);
  process.exit(1);
}

const db = new Database(dbPath);
try {
  db.pragma("foreign_keys = OFF");
  db.exec(`
    DELETE FROM match_signups;
    DELETE FROM match_stats;
    DELETE FROM activity_log;
    DELETE FROM matches;
    DELETE FROM users;
    DELETE FROM sqlite_sequence;
  `);
  db.pragma("foreign_keys = ON");
  db.exec("VACUUM");
  console.log("Baza wyczyszczona:", dbPath);
} finally {
  db.close();
}
