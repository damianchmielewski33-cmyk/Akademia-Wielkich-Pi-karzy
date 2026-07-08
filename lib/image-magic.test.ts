import { describe, expect, it } from "vitest";
import { imageMimeMatchesMagicBytes } from "@/lib/image-magic";

describe("imageMimeMatchesMagicBytes", () => {
  it("accepts JPEG, PNG, GIF and WebP signatures", () => {
    expect(imageMimeMatchesMagicBytes(Buffer.from([0xff, 0xd8, 0xff, 0xe0]), "image/jpeg")).toBe(true);
    expect(
      imageMimeMatchesMagicBytes(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        "image/png"
      )
    ).toBe(true);
    expect(imageMimeMatchesMagicBytes(Buffer.from("GIF89a", "ascii"), "image/gif")).toBe(true);
    expect(
      imageMimeMatchesMagicBytes(
        Buffer.concat([Buffer.from("RIFFxxxx", "ascii"), Buffer.from("WEBP", "ascii")]),
        "image/webp"
      )
    ).toBe(true);
  });

  it("rejects mismatched content", () => {
    expect(imageMimeMatchesMagicBytes(Buffer.from("not-an-image"), "image/jpeg")).toBe(false);
    expect(imageMimeMatchesMagicBytes(Buffer.from([0xff, 0xd8, 0xff]), "image/png")).toBe(false);
  });
});
