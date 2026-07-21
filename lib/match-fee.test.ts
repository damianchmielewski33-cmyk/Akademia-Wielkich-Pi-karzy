import { describe, expect, it } from "vitest";
import { ceilToHalfPln, perPersonMatchFeePln } from "@/lib/match-fee";

describe("ceilToHalfPln", () => {
  it("keeps exact half-złoty amounts", () => {
    expect(ceilToHalfPln(10)).toBe(10);
    expect(ceilToHalfPln(10.5)).toBe(10.5);
  });

  it("rounds up to the next 0.50", () => {
    expect(ceilToHalfPln(10.01)).toBe(10.5);
    expect(ceilToHalfPln(10.51)).toBe(11);
    expect(ceilToHalfPln(14.285714)).toBe(14.5);
    expect(ceilToHalfPln(16.666)).toBe(17);
  });

  it("returns 0 for non-positive / non-finite", () => {
    expect(ceilToHalfPln(0)).toBe(0);
    expect(ceilToHalfPln(-1)).toBe(0);
    expect(ceilToHalfPln(Number.NaN)).toBe(0);
  });
});

describe("perPersonMatchFeePln", () => {
  it("divides rental by signed-up and rounds up to 0.50", () => {
    expect(perPersonMatchFeePln(100, 7)).toBe(14.5);
    expect(perPersonMatchFeePln(100, 6)).toBe(17);
    expect(perPersonMatchFeePln(90, 10)).toBe(9);
  });

  it("returns null without rental or signups", () => {
    expect(perPersonMatchFeePln(null, 5)).toBeNull();
    expect(perPersonMatchFeePln(100, 0)).toBeNull();
    expect(perPersonMatchFeePln(undefined, 3)).toBeNull();
  });
});
