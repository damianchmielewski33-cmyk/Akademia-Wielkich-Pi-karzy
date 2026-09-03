import { describe, expect, it } from "vitest";
import {
  blobDeleteTarget,
  isBlobAccessMismatchError,
  isSafeBlobPathname,
  isVercelBlobUrl,
  MEDIA_BLOB_PREFIX,
  storedUrlForUploadedBlob,
} from "@/lib/profile-blob";

describe("profile-blob helpers", () => {
  it("accepts public and private Vercel Blob hostnames", () => {
    expect(isVercelBlobUrl("https://abc123.public.blob.vercel-storage.com/profiles/1.jpg")).toBe(true);
    expect(isVercelBlobUrl("https://abc123.private.blob.vercel-storage.com/site/logo.png")).toBe(true);
    expect(isVercelBlobUrl("https://example.com/photo.jpg")).toBe(false);
  });

  it("treats same-origin media proxy URLs as blob refs", () => {
    expect(isVercelBlobUrl(`${MEDIA_BLOB_PREFIX}site/mp-pitch-0-1.webp`)).toBe(true);
    expect(isVercelBlobUrl(`${MEDIA_BLOB_PREFIX}../secret`)).toBe(false);
    expect(isVercelBlobUrl(`${MEDIA_BLOB_PREFIX}other/file.jpg`)).toBe(false);
  });

  it("rewrites private blob URLs to the media proxy", () => {
    expect(
      storedUrlForUploadedBlob({
        url: "https://store.private.blob.vercel-storage.com/site/hero.webp",
        pathname: "site/hero.webp",
      })
    ).toBe("/api/media/blob/site/hero.webp");
  });

  it("keeps public blob URLs on the CDN", () => {
    expect(
      storedUrlForUploadedBlob({
        url: "https://store.public.blob.vercel-storage.com/profiles/1.jpg",
        pathname: "profiles/1.jpg",
      })
    ).toBe("https://store.public.blob.vercel-storage.com/profiles/1.jpg");
  });

  it("extracts delete targets from proxy and remote URLs", () => {
    expect(blobDeleteTarget("/api/media/blob/chat/u1-2.jpg")).toBe("chat/u1-2.jpg");
    expect(blobDeleteTarget("https://store.public.blob.vercel-storage.com/profiles/1.jpg")).toBe(
      "https://store.public.blob.vercel-storage.com/profiles/1.jpg"
    );
    expect(blobDeleteTarget("/uploads/site/logo.png")).toBe(null);
  });

  it("rejects unsafe blob pathnames", () => {
    expect(isSafeBlobPathname("site/ok.jpg")).toBe(true);
    expect(isSafeBlobPathname("site/../etc/passwd")).toBe(false);
    expect(isSafeBlobPathname("/site/ok.jpg")).toBe(false);
  });

  it("detects public/private store access mismatch errors", () => {
    expect(
      isBlobAccessMismatchError(
        new Error("Vercel Blob: Cannot use public access on a private store. The store is configured with private access")
      )
    ).toBe(true);
    expect(isBlobAccessMismatchError(new Error("Vercel Blob: Cannot use private access on a public store"))).toBe(
      true
    );
    expect(isBlobAccessMismatchError(new Error("network timeout"))).toBe(false);
  });
});
