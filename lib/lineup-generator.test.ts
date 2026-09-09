import { describe, expect, it } from "vitest";
import { buildLineupPlayerProfiles, generateBalancedLineupProposal, type LineupGeneratorPlayerInput } from "@/lib/lineup-generator";

function player(
  userId: number,
  firstName: string,
  lastName: string,
  zawodnik: string,
  matches: LineupGeneratorPlayerInput["matches"]
): LineupGeneratorPlayerInput {
  return {
    userId,
    firstName,
    lastName,
    zawodnik,
    profilePhotoPath: null,
    matches,
  };
}

describe("lineup generator", () => {
  it("buduje profile z archetypami i baseline dla zawodnika bez danych", () => {
    const profiles = buildLineupPlayerProfiles([
      player(1, "Adam", "Gol", "snajper", [
        { matchDate: "2026-09-01", goals: 2, assists: 1, distance: 6.8, saves: 0 },
        { matchDate: "2026-08-20", goals: 1, assists: 0, distance: 6.2, saves: 0 },
      ]),
      player(2, "Bartek", "Mur", "anchor", [
        { matchDate: "2026-09-01", goals: 0, assists: 0, distance: 5.5, saves: 6 },
        { matchDate: "2026-08-20", goals: 0, assists: 1, distance: 5.1, saves: 5 },
      ]),
      player(3, "Cezary", "Nowy", "rookie", []),
    ]);

    const striker = profiles.find((profile) => profile.userId === 1)!;
    const defender = profiles.find((profile) => profile.userId === 2)!;
    const rookie = profiles.find((profile) => profile.userId === 3)!;

    expect(striker.attackScore).toBeGreaterThan(defender.attackScore);
    expect(defender.defenseScore).toBeGreaterThan(striker.defenseScore);
    expect(striker.archetype).toBe("finisher");
    expect(defender.archetype).toBe("anchor");
    expect(rookie.confidence).toBe(0);
    expect(rookie.overallMMR).toBeGreaterThan(0.9);
    expect(rookie.overallMMR).toBeLessThan(1.1);
  });

  it("dzieli najmocniejszych zawodnikow pomiedzy druzyny i nie duplikuje slotow", () => {
    const roster = [
      player(1, "Adam", "A", "a1", [
        { matchDate: "2026-09-01", goals: 3, assists: 1, distance: 7.2, saves: 0 },
        { matchDate: "2026-08-25", goals: 2, assists: 0, distance: 6.9, saves: 0 },
      ]),
      player(2, "Bartek", "B", "b2", [
        { matchDate: "2026-09-01", goals: 2, assists: 2, distance: 7.1, saves: 0 },
        { matchDate: "2026-08-25", goals: 1, assists: 1, distance: 6.6, saves: 0 },
      ]),
      player(3, "Celina", "C", "c3", [
        { matchDate: "2026-09-01", goals: 0, assists: 2, distance: 8.4, saves: 0 },
        { matchDate: "2026-08-25", goals: 1, assists: 1, distance: 8.1, saves: 0 },
      ]),
      player(4, "Daniel", "D", "d4", [
        { matchDate: "2026-09-01", goals: 0, assists: 0, distance: 6.4, saves: 5 },
        { matchDate: "2026-08-25", goals: 0, assists: 0, distance: 6.1, saves: 4 },
      ]),
      player(5, "Ela", "E", "e5", [
        { matchDate: "2026-09-01", goals: 1, assists: 1, distance: 7.7, saves: 1 },
      ]),
      player(6, "Filip", "F", "f6", [
        { matchDate: "2026-09-01", goals: 0, assists: 1, distance: 7.4, saves: 2 },
      ]),
      player(7, "Gosia", "G", "g7", []),
      player(8, "Hubert", "H", "h8", []),
    ];

    const proposal = generateBalancedLineupProposal({
      players: roster,
      pitchSlotTotal: 6,
      homeSlotCount: 3,
      awaySlotCount: 3,
      seed: 12345,
      attempts: 240,
    });

    const assigned = [...proposal.home, ...proposal.away].filter((userId): userId is number => userId != null);
    const unique = new Set(assigned);
    const topTwo = proposal.profiles.slice(0, 2).map((profile) => profile.userId);
    const homeSet = new Set(proposal.home.filter((userId): userId is number => userId != null));
    const awaySet = new Set(proposal.away.filter((userId): userId is number => userId != null));

    expect(assigned).toHaveLength(6);
    expect(unique.size).toBe(6);
    expect(proposal.bench).toHaveLength(2);
    expect(topTwo.some((userId) => homeSet.has(userId))).toBe(true);
    expect(topTwo.some((userId) => awaySet.has(userId))).toBe(true);
    expect(proposal.diagnostics.mmrGap).toBeLessThan(0.25);
  });

  it("utrzymuje rozsadny balans przy nieparzystym podziale slotow", () => {
    const roster = [
      player(1, "A", "One", "a", [{ matchDate: "2026-09-01", goals: 2, assists: 0, distance: 6.5, saves: 0 }]),
      player(2, "B", "Two", "b", [{ matchDate: "2026-09-01", goals: 1, assists: 2, distance: 7.7, saves: 0 }]),
      player(3, "C", "Three", "c", [{ matchDate: "2026-09-01", goals: 0, assists: 0, distance: 5.4, saves: 4 }]),
      player(4, "D", "Four", "d", [{ matchDate: "2026-09-01", goals: 1, assists: 0, distance: 8.2, saves: 0 }]),
      player(5, "E", "Five", "e", [{ matchDate: "2026-09-01", goals: 0, assists: 1, distance: 7.9, saves: 1 }]),
      player(6, "F", "Six", "f", []),
      player(7, "G", "Seven", "g", []),
    ];

    const proposal = generateBalancedLineupProposal({
      players: roster,
      pitchSlotTotal: 7,
      homeSlotCount: 4,
      awaySlotCount: 3,
      seed: 7,
      attempts: 200,
    });

    expect(proposal.home).toHaveLength(4);
    expect(proposal.away).toHaveLength(3);
    expect(proposal.bench).toHaveLength(0);
    expect(proposal.diagnostics.balanceScore).toBeGreaterThanOrEqual(70);
  });
});
