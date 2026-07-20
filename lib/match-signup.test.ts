import { describe, expect, it } from "vitest";
import { assertMatchOpenForSignup, todayISO } from "@/lib/match-signup";

describe("assertMatchOpenForSignup", () => {
  const base = {
    id: 1,
    match_date: todayISO(),
    match_time: "18:00",
    location: "Boisko",
    signed_up: 0,
    max_slots: 10,
    played: 0,
  };

  it("rejects cancelled matches", () => {
    expect(assertMatchOpenForSignup({ ...base, cancelled: 1 })).toMatch(/anulowany/i);
  });

  it("rejects past matches", () => {
    expect(assertMatchOpenForSignup({ ...base, match_date: "2000-01-01" })).toMatch(/po terminie/i);
  });

  it("allows future open matches", () => {
    expect(assertMatchOpenForSignup(base)).toBeNull();
  });
});
