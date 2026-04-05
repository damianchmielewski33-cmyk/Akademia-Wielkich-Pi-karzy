/** Punkty jak w stats.py */
export const PT_GOAL = 5;
export const PT_ASSIST = 2;
export const PT_KM = 0.5;
export const PT_SAVE = 2;

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

export function rankPlayers(
  players: RankablePlayer[],
  key: keyof Pick<RankablePlayer, "goals" | "assists" | "distance" | "saves" | "punkty">,
  reverse = true
): RankedPlayer[] {
  const sortedP = [...players].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (av !== bv) return reverse ? (bv as number) - (av as number) : (av as number) - (bv as number);
    const nameA = `${a.first_name} ${a.last_name}`.trim();
    const nameB = `${b.first_name} ${b.last_name}`.trim();
    const byName = nameA.localeCompare(nameB, "pl");
    if (byName !== 0) return byName;
    return a.zawodnik.localeCompare(b.zawodnik, "pl");
  });
  const out: RankedPlayer[] = [];
  let i = 0;
  while (i < sortedP.length) {
    const val = sortedP[i][key];
    let j = i;
    while (j < sortedP.length && sortedP[j][key] === val) j++;
    const rank = i + 1;
    for (let k = i; k < j; k++) {
      out.push({ ...sortedP[k], rank });
    }
    i = j;
  }
  return out;
}
