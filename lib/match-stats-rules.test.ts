import { describe, expect, it } from "vitest";
import { isWithinStatsEditWindow, statsEditWindowEndYmd } from "@/lib/match-stats-rules";

describe("statsEditWindowEndYmd", () => {
  it("adds 7 days to match date (UTC)", () => {
    expect(statsEditWindowEndYmd("2026-04-01")).toBe("2026-04-08");
  });
});

describe("isWithinStatsEditWindow", () => {
  it("allows edits through the 7th day after match", () => {
    expect(isWithinStatsEditWindow("2026-04-01", "2026-04-08")).toBe(true);
  });

  it("denies edits starting the day after the window end", () => {
    expect(isWithinStatsEditWindow("2026-04-01", "2026-04-09")).toBe(false);
  });

  it("allows on match day", () => {
    expect(isWithinStatsEditWindow("2026-04-05", "2026-04-05")).toBe(true);
  });
});
