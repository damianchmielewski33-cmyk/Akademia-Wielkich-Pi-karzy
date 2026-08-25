import { describe, expect, it } from "vitest";
import { adminIdsForRosterPush, adminMatchRosterPushCopy } from "@/lib/match-notifications";

describe("adminIdsForRosterPush", () => {
  it("usuwa duplikaty i pomija osobę, która wykonała akcję", () => {
    expect(adminIdsForRosterPush([1, 2, 2, 3], 2)).toEqual([1, 3]);
  });

  it("zwraca pustą listę, gdy jedyny admin to autor zapisu", () => {
    expect(adminIdsForRosterPush([7], 7)).toEqual([]);
  });
});

describe("adminMatchRosterPushCopy", () => {
  it("opisuje zapis na mecz", () => {
    expect(
      adminMatchRosterPushCopy({
        action: "signup",
        playerName: "Jan Kowalski (janek)",
        matchDate: "2026-08-30",
        matchTime: "18:00",
        location: "Orlik",
      })
    ).toEqual({
      title: "Nowy zapis na mecz",
      body: "Jan Kowalski (janek) — zapis na mecz 2026-08-30 18:00 · Orlik",
    });
  });

  it("opisuje wypis z meczu", () => {
    const copy = adminMatchRosterPushCopy({
      action: "unsubscribe",
      playerName: "Anna Nowak",
      matchDate: "2026-08-30",
      matchTime: "18:00",
      location: "Orlik",
    });
    expect(copy.title).toBe("Wypis z meczu");
    expect(copy.body).toContain("Anna Nowak — wypis z meczu");
  });
});
