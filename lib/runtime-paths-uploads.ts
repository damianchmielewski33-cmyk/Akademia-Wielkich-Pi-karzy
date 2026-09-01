import os from "os";
import path from "path";
import { isVercel } from "@/lib/runtime-paths";

const TMP_APP = "akademia-wielkich-pilkarzy";

/** Join z nazwą pliku z bazy/URL — nie śledzi całego projektu w bundlerze. */
function joinUploadFile(uploadsDir: string, fileName: string): string {
  return path.join(/* turbopackIgnore: true */ uploadsDir, fileName);
}

function localPublicUploadsDir(...segments: string[]): string {
  return path.join(process.cwd(), "public", "uploads", ...segments);
}

function vercelPublicUploadsDir(...segments: string[]): string {
  return path.join(os.tmpdir(), TMP_APP, "public", "uploads", ...segments);
}

export function profileUploadsDir(): string {
  if (isVercel()) {
    return vercelPublicUploadsDir("profiles");
  }
  return localPublicUploadsDir("profiles");
}

/** Wartość `profile_photo_path` w bazie — URL widoczny w `<img src>`. */
export function profilePhotoPublicUrl(filename: string): string {
  if (isVercel()) {
    return `/api/uploads/profiles/${filename}`;
  }
  return `/uploads/profiles/${filename}`;
}

export function siteUploadsDir(): string {
  if (isVercel()) {
    return vercelPublicUploadsDir("site");
  }
  return localPublicUploadsDir("site");
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
    return joinUploadFile(siteUploadsDir(), name);
  }
  if (trimmed.startsWith("/uploads/site/")) {
    const name = trimmed.slice("/uploads/site/".length);
    if (!name || name.includes("..") || name.includes("/") || name.includes("\\")) return null;
    return joinUploadFile(siteUploadsDir(), name);
  }
  return null;
}

export function resolveProfilePhotoAbsolute(dbPath: string): string | null {
  const trimmed = dbPath.trim();
  if (trimmed.startsWith("/api/uploads/profiles/")) {
    const name = trimmed.slice("/api/uploads/profiles/".length);
    if (!name || name.includes("..") || name.includes("/") || name.includes("\\")) return null;
    return joinUploadFile(profileUploadsDir(), name);
  }
  if (trimmed.startsWith("/uploads/profiles/")) {
    const name = trimmed.slice("/uploads/profiles/".length);
    if (!name || name.includes("..") || name.includes("/") || name.includes("\\")) return null;
    return joinUploadFile(profileUploadsDir(), name);
  }
  return null;
}

export function chatUploadsDir(): string {
  if (isVercel()) {
    return vercelPublicUploadsDir("chat");
  }
  return localPublicUploadsDir("chat");
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
    return joinUploadFile(chatUploadsDir(), name);
  }
  if (trimmed.startsWith("/uploads/chat/")) {
    const name = trimmed.slice("/uploads/chat/".length);
    if (!name || name.includes("..") || name.includes("/") || name.includes("\\")) return null;
    return joinUploadFile(chatUploadsDir(), name);
  }
  return null;
}
