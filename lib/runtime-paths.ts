import os from "os";
import path from "path";

const TMP_APP = "akademia-wielkich-pilkarzy";

/** Vercel Serverless: tylko `/tmp` jest zapisywalny; `/var/task` jest read-only. */
export function isVercel(): boolean {
  return Boolean(process.env.VERCEL);
}

/**
 * Ścieżka pliku SQLite. Na Vercelu bez DATABASE_PATH: katalog tymczasowy (dane nietrwałe między instancjami).
 * Do produkcji na Vercelu rozważ bazę hostowaną (Postgres, Turso itd.).
 */
export function resolveDatabaseFilePath(): string {
  if (process.env.DATABASE_PATH) {
    const raw = process.env.DATABASE_PATH;
    if (path.isAbsolute(raw)) {
      return raw;
    }
    return path.resolve(process.cwd(), raw);
  }
  if (isVercel()) {
    return path.join(os.tmpdir(), TMP_APP, "database.db");
  }
  return path.join(process.cwd(), "data", "database.db");
}

export function profileUploadsDir(): string {
  if (isVercel()) {
    return path.join(os.tmpdir(), TMP_APP, "public", "uploads", "profiles");
  }
  return path.join(process.cwd(), "public", "uploads", "profiles");
}

/** Wartość `profile_photo_path` w bazie — URL widoczny w `<img src>`. */
export function profilePhotoPublicUrl(filename: string): string {
  if (isVercel()) {
    return `/api/uploads/profiles/${filename}`;
  }
  return `/uploads/profiles/${filename}`;
}

/** Rozwiązuje ścieżkę z bazy do pliku na dysku (usuwanie starego pliku). */
export function resolveProfilePhotoAbsolute(dbPath: string): string | null {
  const trimmed = dbPath.trim();
  if (trimmed.startsWith("/api/uploads/profiles/")) {
    const name = trimmed.slice("/api/uploads/profiles/".length);
    if (!name || name.includes("..") || name.includes("/") || name.includes("\\")) return null;
    return path.join(profileUploadsDir(), name);
  }
  if (trimmed.startsWith("/uploads/profiles/")) {
    const name = trimmed.slice("/uploads/profiles/".length);
    if (!name || name.includes("..") || name.includes("/") || name.includes("\\")) return null;
    return path.join(profileUploadsDir(), name);
  }
  return null;
}
