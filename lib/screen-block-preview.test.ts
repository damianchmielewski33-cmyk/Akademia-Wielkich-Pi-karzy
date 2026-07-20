import { describe, expect, it } from "vitest";
import { screenBlockPreviewHref } from "@/lib/screen-block-preview";

describe("screenBlockPreviewHref", () => {
  it("dodaje preview_blocked do ścieżki", () => {
    expect(screenBlockPreviewHref("/terminarz")).toBe("/terminarz?preview_blocked=1");
    expect(screenBlockPreviewHref("/")).toBe("/?preview_blocked=1");
  });

  it("mapuje kartę piłkarza na listę", () => {
    expect(screenBlockPreviewHref("/players/*")).toBe("/pilkarze?preview_blocked=1");
  });
});
