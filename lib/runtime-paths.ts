import os from "os";
import path from "path";

const TMP_APP = "akademia-wielkich-pilkarzy";

/** Vercel Serverless: tylko `/tmp` jest zapisywalny; `/var/task` jest read-only. */
export function isVercel(): boolean {
  return Boolean(process.env.VERCEL);
}

/**
 * Plik w `data/` — statyczny wzorzec ścieżki (bez path.resolve(cwd, dynamiczny)).
 * Wartość z env może być `database.db` lub `data/database.db`.
 */
function resolveProjectDataPath(relativeOrFileName: string, fallbackFileName: string): string {
  const normalized = relativeOrFileName.replace(/\\/g, "/").replace(/^\/+/, "");
  const withoutDataPrefix = normalized.replace(/^data\//, "");
  const base = path.basename(withoutDataPrefix);
  const safe = base && base !== "." && base !== ".." ? base : fallbackFileName;
  return path.join(process.cwd(), "data", safe);
}

/**
 * Ścieżka pliku SQLite. Na Vercelu bez DATABASE_PATH: katalog tymczasowy (dane nietrwałe między instancjami).
 * Do produkcji na Vercelu rozważ bazę hostowaną (Postgres, Turso itd.).
 */
export function resolveDatabaseFilePath(): string {
  if (process.env.DATABASE_PATH) {
    const raw = process.env.DATABASE_PATH.trim();
    if (path.isAbsolute(raw)) {
      return raw;
    }
    return resolveProjectDataPath(raw, "database.db");
  }
  if (isVercel()) {
    return path.join(os.tmpdir(), TMP_APP, "database.db");
  }
  return path.join(process.cwd(), "data", "database.db");
}

/**
 * Osobna baza trybu testowego admina (lokalny SQLite).
 * Na Vercelu bez TURSO_TEST_* nie używamy pliku — wymagany jest Turso TEST.
 */
export function resolveTestDatabaseFilePath(): string {
  if (process.env.DATABASE_TEST_PATH) {
    const raw = process.env.DATABASE_TEST_PATH.trim();
    if (path.isAbsolute(raw)) {
      return raw;
    }
    return resolveProjectDataPath(raw, "database-test.db");
  }
  if (isVercel()) {
    return path.join(os.tmpdir(), TMP_APP, "database-test.db");
  }
  return path.join(process.cwd(), "data", "database-test.db");
}
