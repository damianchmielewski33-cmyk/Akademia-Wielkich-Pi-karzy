import { del, put } from "@vercel/blob";

/** Na Vercelu: ustaw Blob Store i `BLOB_READ_WRITE_TOKEN`, żeby zdjęcia nie ginęły z `/tmp`. */
export function isProfileBlobStorageEnabled(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

/** Vercel bez Blob: zapis do `/tmp` jest nietrwały między instancjami → 404 przy odczycie. */
export function isEphemeralUploadStorage(): boolean {
  return Boolean(process.env.VERCEL) && !isProfileBlobStorageEnabled();
}

export const BLOB_REQUIRED_ON_VERCEL_MSG =
  "Na Vercel upload wymaga trwałego magazynu: dodaj BLOB_READ_WRITE_TOKEN (Vercel → Storage → Blob), potem wgraj plik ponownie.";

/** Same-origin URL do `<img src>` dla plików z prywatnego Blob Store. */
export const MEDIA_BLOB_PREFIX = "/api/media/blob/";

const BLOB_PATH_PREFIXES = ["profiles/", "site/", "chat/"] as const;

let cachedBlobAccess: "public" | "private" | null = null;

export function isSafeBlobPathname(pathname: string): boolean {
  if (!pathname || pathname.length > 400) return false;
  if (pathname.startsWith("/") || pathname.includes("..") || pathname.includes("\\")) return false;
  if (!/^[a-zA-Z0-9._/-]+$/.test(pathname)) return false;
  return BLOB_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isRemoteVercelBlobUrl(url: string): boolean {
  try {
    const u = new URL(url.trim());
    return u.protocol === "https:" && u.hostname.endsWith(".blob.vercel-storage.com");
  } catch {
    return false;
  }
}

function isPrivateBlobUrl(url: string): boolean {
  try {
    const u = new URL(url.trim());
    return u.protocol === "https:" && u.hostname.endsWith(".private.blob.vercel-storage.com");
  } catch {
    return false;
  }
}

/** URL w bazie, który trzeba skasować z Vercel Blob (CDN albo nasz proxy). */
export function isVercelBlobUrl(url: string): boolean {
  return blobDeleteTarget(url) !== null;
}

export function storedUrlForUploadedBlob(blob: { url: string; pathname: string }): string {
  if (!isPrivateBlobUrl(blob.url)) return blob.url;
  const pathname = blob.pathname.replace(/^\/+/, "");
  if (!isSafeBlobPathname(pathname)) return blob.url;
  return `${MEDIA_BLOB_PREFIX}${pathname}`;
}

export function blobDeleteTarget(url: string): string | null {
  const t = url.trim();
  if (t.startsWith(MEDIA_BLOB_PREFIX)) {
    const pathname = t.slice(MEDIA_BLOB_PREFIX.length);
    return isSafeBlobPathname(pathname) ? pathname : null;
  }
  return isRemoteVercelBlobUrl(t) ? t : null;
}

export function isBlobAccessMismatchError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return /cannot use (public|private) access on a (private|public) store/i.test(msg);
}

/**
 * Upload na publiczny albo prywatny Blob Store.
 * Prywatny store nie przyjmuje `access: "public"` — wtedy zapisujemy prywatnie
 * i zwracamy same-origin `/api/media/blob/...`, żeby `<img>` działało bez tokena CDN.
 */
export async function putPublicFacingBlob(
  pathname: string,
  body: Buffer,
  options: { contentType: string }
): Promise<string> {
  const blob = await putWithStoreAccess(pathname, body, options.contentType);
  return storedUrlForUploadedBlob(blob);
}

async function putWithStoreAccess(pathname: string, body: Buffer, contentType: string) {
  const first = cachedBlobAccess ?? "public";
  try {
    const blob = await put(pathname, body, { access: first, contentType });
    cachedBlobAccess = first;
    return blob;
  } catch (error) {
    if (!isBlobAccessMismatchError(error)) throw error;
    const other = first === "public" ? "private" : "public";
    const blob = await put(pathname, body, { access: other, contentType });
    cachedBlobAccess = other;
    return blob;
  }
}

export async function deleteProfileBlobIfAny(url: string | null | undefined): Promise<void> {
  if (!url) return;
  const target = blobDeleteTarget(url);
  if (!target) return;
  try {
    await del(target);
  } catch {
    /* ignore */
  }
}
