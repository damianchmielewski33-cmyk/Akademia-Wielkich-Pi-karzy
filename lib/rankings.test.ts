import { describe, expect, it } from "vitest";
import {
  formatMatchCountPl,
  perMatchRate,
  rankPlayers,
  rankingRate,
  type RankablePlayer,
} from "@/lib/rankings";

function player(partial: Partial<RankablePlayer> & Pick<RankablePlayer, "userId" | "zawodnik">): RankablePlayer {
  return {
    first_name: "A",
    last_name: String(partial.userId),
    profile_photo_path: null,
    goals: 0,
    assists: 0,
    distance: 0,
    saves: 0,
    mecze: 0,
    punkty: 0,
    ...partial,
  };
}

describe("perMatchRate", () => {
  it("dzieli sumę przez liczbę meczów", () => {
    expect(perMatchRate(8, 2)).toBe(4);
    expect(perMatchRate(8, 8)).toBe(1);
  });

  it("przy 0 meczach daje 0", () => {
    expect(perMatchRate(10, 0)).toBe(0);
  });
});

describe("rankPlayers — sprawiedliwość 2 vs 8 meczów", () => {
  it("gracz z 2 meczami i wyższą średnią jest przed graczem z 8 meczami i większą sumą", () => {
    const few = player({
      userId: 1,
      zawodnik: "dwa",
      first_name: "Marek",
      last_name: "Dwa",
      mecze: 2,
      goals: 4,
      punkty: 20,
    });
    const many = player({
      userId: 2,
      zawodnik: "osiem",
      first_name: "Adam",
      last_name: "Osiem",
      mecze: 8,
      goals: 8,
      punkty: 40,
    });

    const byGoals = rankPlayers([many, few], "goals");
    expect(byGoals.map((p) => p.userId)).toEqual([1, 2]);
    expect(rankingRate(few, "goals")).toBe(2);
    expect(rankingRate(many, "goals")).toBe(1);

    const byPoints = rankPlayers([many, few], "punkty");
    expect(byPoints.map((p) => p.userId)).toEqual([1, 2]);
    expect(rankingRate(few, "punkty")).toBe(10);
    expect(rankingRate(many, "punkty")).toBe(5);
  });

  it("ta sama średnia daje tę samą pozycję niezależnie od liczby meczów", () => {
    const few = player({
      userId: 1,
      zawodnik: "dwa",
      first_name: "Bartek",
      last_name: "Dwa",
      mecze: 2,
      goals: 2,
      punkty: 10,
    });
    const many = player({
      userId: 2,
      zawodnik: "osiem",
      first_name: "Adam",
      last_name: "Osiem",
      mecze: 8,
      goals: 8,
      punkty: 40,
    });

    const ranked = rankPlayers([few, many], "goals");
    expect(ranked[0].rank).toBe(1);
    expect(ranked[1].rank).toBe(1);
  });

  it("nie wlicza zawodników bez meczów", () => {
    const ranked = rankPlayers(
      [
        player({ userId: 1, zawodnik: "gra", mecze: 1, goals: 1, punkty: 5 }),
        player({ userId: 2, zawodnik: "brak", mecze: 0, goals: 0, punkty: 0 }),
      ],
      "punkty"
    );
    expect(ranked.map((p) => p.userId)).toEqual([1]);
  });
});

describe("formatMatchCountPl", () => {
  it("odmienia mecz / mecze / meczów", () => {
    expect(formatMatchCountPl(1)).toBe("1 mecz");
    expect(formatMatchCountPl(2)).toBe("2 mecze");
    expect(formatMatchCountPl(5)).toBe("5 meczów");
  });
});
