/** Punkty jak w stats.py — wagi akcji; pozycja w tabeli to średnia na mecz. */
export const PT_GOAL = 5;
export const PT_ASSIST = 2;
export const PT_KM = 0.5;
export const PT_SAVE = 2;

export type RankingStatKey = "goals" | "assists" | "distance" | "saves" | "punkty";

export type RankablePlayer = {
  userId: number;
  first_name: string;
  last_name: string;
  zawodnik: string;
  profile_photo_path: string | null;
  goals: number;
  assists: number;
  distance: number;
  saves: number;
  mecze: number;
  punkty: number;
};

export type RankedPlayer = RankablePlayer & { rank: number };

const RATE_DECIMALS = 4;

/** Średnia na mecz — liczba meczów nie wchodzi do porównania, tylko jakość na spotkanie. */
export function perMatchRate(total: number, mecze: number): number {
  if (!Number.isFinite(total) || !Number.isFinite(mecze) || mecze <= 0) return 0;
  const scale = 10 ** RATE_DECIMALS;
  return Math.round((total / mecze) * scale) / scale;
}

export function rankingRate(player: RankablePlayer, key: RankingStatKey): number {
  return perMatchRate(Number(player[key]) || 0, player.mecze);
}

export function formatMatchCountPl(n: number): string {
  const v = Math.max(0, Math.floor(Number(n) || 0));
  if (v === 1) return "1 mecz";
  const mod10 = v % 10;
  const mod100 = v % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${v} mecze`;
  return `${v} meczów`;
}

/**
 * Klasyfikacja według średniej na mecz (gole/mecz, pkt/mecz itd.).
 * Zawodnicy bez rozegranych meczów nie wchodzą do tabeli.
 * Przy tej samej średniej pozycja jest wspólna — liczba meczów nie rozstrzyga.
 */
export function rankPlayers(
  players: RankablePlayer[],
  key: RankingStatKey,
  reverse = true
): RankedPlayer[] {
  const sortedP = players
    .filter((p) => p.mecze > 0)
    .sort((a, b) => {
      const av = rankingRate(a, key);
      const bv = rankingRate(b, key);
      if (av !== bv) return reverse ? bv - av : av - bv;
      const nameA = `${a.first_name} ${a.last_name}`.trim();
      const nameB = `${b.first_name} ${b.last_name}`.trim();
      const byName = nameA.localeCompare(nameB, "pl");
      if (byName !== 0) return byName;
      return a.zawodnik.localeCompare(b.zawodnik, "pl");
    });

  const out: RankedPlayer[] = [];
  let i = 0;
  while (i < sortedP.length) {
    const val = rankingRate(sortedP[i], key);
    let j = i;
    while (j < sortedP.length && rankingRate(sortedP[j], key) === val) j++;
    const rank = i + 1;
    for (let k = i; k < j; k++) {
      out.push({ ...sortedP[k], rank });
    }
    i = j;
  }
  return out;
}
