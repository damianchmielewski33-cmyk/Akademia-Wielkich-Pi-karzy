import { describe, expect, it } from "vitest";
import { isCancelNoticeRelevant } from "@/lib/match-cancel-notice";

describe("isCancelNoticeRelevant", () => {
  it("odrzuca stare daty meczu", () => {
    expect(isCancelNoticeRelevant("2026-05-13")).toBe(false);
  });

  it("akceptuje dzisiejszą / niedawną datę", () => {
    const d = new Date();
    const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    expect(isCancelNoticeRelevant(ymd)).toBe(true);
  });
});
