/**
 * Kopiuje plik bazy SQLite do data/backups/ z timestampem w nazwie.
 * Szanuje DATABASE_PATH (względem katalogu projektu), tak jak lib/db.ts.
 */
const fs = require("fs");
const path = require("path");

const cwd = process.cwd();
const dbPath = process.env.DATABASE_PATH ? path.resolve(cwd, process.env.DATABASE_PATH) : path.join(cwd, "data", "database.db");

if (!fs.existsSync(dbPath)) {
  console.error("Nie znaleziono pliku bazy:", dbPath);
  process.exit(1);
}

const backupDir = path.join(cwd, "data", "backups");
fs.mkdirSync(backupDir, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const dest = path.join(backupDir, `database-${stamp}.db`);

fs.copyFileSync(dbPath, dest);
console.log("Zapisano kopię:", dest);
