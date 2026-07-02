import { describe, expect, it } from "vitest";
import type { MatchRow } from "@/lib/db";
import { categorizeMatches } from "@/lib/terminarz-shared";

function match(partial: Partial<MatchRow> & Pick<MatchRow, "id">): MatchRow {
  return {
    match_date: "2026-07-10",
    match_time: "20:00",
    location: "Boisko",
    max_slots: 14,
    signed_up: 0,
    played: 0,
    fee_pln: null,
    gate_pin: null,
    lineup_public: 0,
    cancelled: 0,
    cancellation_reason: null,
    ...partial,
  };
}

describe("categorizeMatches", () => {
  it("pomija anulowane mecze w sekcji do rozegrania", () => {
    const upcomingMatch = match({ id: 1 });
    const cancelledMatch = match({ id: 2, cancelled: 1 });
    const playedMatch = match({ id: 3, played: 1 });

    const { upcoming, playedConfirmed } = categorizeMatches([upcomingMatch, cancelledMatch, playedMatch]);

    expect(upcoming.map((m) => m.id)).toEqual([1]);
    expect(playedConfirmed.map((m) => m.id)).toEqual([3]);
  });
});
