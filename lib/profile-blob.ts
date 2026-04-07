import { del } from "@vercel/blob";

/** Na Vercelu: ustaw Blob Store i `BLOB_READ_WRITE_TOKEN`, żeby zdjęcia nie ginęły z `/tmp`. */
export function isProfileBlobStorageEnabled(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

export function isVercelBlobUrl(url: string): boolean {
  try {
    const u = new URL(url.trim());
    return u.protocol === "https:" && u.hostname.endsWith(".public.blob.vercel-storage.com");
  } catch {
    return false;
  }
}

export async function deleteProfileBlobIfAny(url: string | null | undefined): Promise<void> {
  if (!url || !isVercelBlobUrl(url)) return;
  try {
    await del(url);
  } catch {
    /* ignore */
  }
}
