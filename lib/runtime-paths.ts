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
export function siteUploadsDir(): string {
  if (isVercel()) {
    return path.join(os.tmpdir(), TMP_APP, "public", "uploads", "site");
  }
  return path.join(process.cwd(), "public", "uploads", "site");
}

/** Wartość URL grafiki witryny w bazie — widoczna w `<img src>` / CSS. */
export function siteAssetPublicUrl(filename: string): string {
  if (isVercel()) {
    return `/api/uploads/site/${filename}`;
  }
  return `/uploads/site/${filename}`;
}

export function resolveSiteAssetAbsolute(dbPath: string): string | null {
  const trimmed = dbPath.trim();
  if (trimmed.startsWith("/api/uploads/site/")) {
    const name = trimmed.slice("/api/uploads/site/".length);
    if (!name || name.includes("..") || name.includes("/") || name.includes("\\")) return null;
    return path.join(siteUploadsDir(), name);
  }
  if (trimmed.startsWith("/uploads/site/")) {
    const name = trimmed.slice("/uploads/site/".length);
    if (!name || name.includes("..") || name.includes("/") || name.includes("\\")) return null;
    return path.join(siteUploadsDir(), name);
  }
  return null;
}

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

export function chatUploadsDir(): string {
  if (isVercel()) {
    return path.join(os.tmpdir(), TMP_APP, "public", "uploads", "chat");
  }
  return path.join(process.cwd(), "public", "uploads", "chat");
}

export function chatAttachmentPublicUrl(filename: string): string {
  if (isVercel()) {
    return `/api/uploads/chat/${filename}`;
  }
  return `/uploads/chat/${filename}`;
}

export function resolveChatAttachmentAbsolute(dbPath: string): string | null {
  const trimmed = dbPath.trim();
  if (trimmed.startsWith("/api/uploads/chat/")) {
    const name = trimmed.slice("/api/uploads/chat/".length);
    if (!name || name.includes("..") || name.includes("/") || name.includes("\\")) return null;
    return path.join(chatUploadsDir(), name);
  }
  if (trimmed.startsWith("/uploads/chat/")) {
    const name = trimmed.slice("/uploads/chat/".length);
    if (!name || name.includes("..") || name.includes("/") || name.includes("\\")) return null;
    return path.join(chatUploadsDir(), name);
  }
  return null;
}
