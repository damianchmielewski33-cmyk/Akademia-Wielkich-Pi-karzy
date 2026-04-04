import type { MatchRow } from "@/lib/db";

export type SignupRow = {
  match_id: number;
  paid: number;
  first_name: string;
  last_name: string;
  zawodnik: string;
};

export type PlayerEntry = {
  name: string;
  zawodnik: string;
  initials: string;
  paid: number;
};

export type PlayersDataEntry = {
  date: string;
  time: string;
  location: string;
  max: number;
  players: PlayerEntry[];
};

export function buildPlayersData(
  matches: MatchRow[],
  signups: SignupRow[]
): Record<number, PlayersDataEntry> {
  const playersByMatch: Record<number, SignupRow[]> = {};
  for (const s of signups) {
    if (!playersByMatch[s.match_id]) playersByMatch[s.match_id] = [];
    playersByMatch[s.match_id].push(s);
  }

  const playersData: Record<number, PlayersDataEntry> = {};
  for (const m of matches) {
    const mid = m.id;
    const plist: PlayerEntry[] = [];
    for (const p of playersByMatch[mid] ?? []) {
      const fn = (p.first_name || "").trim();
      const ln = (p.last_name || "").trim();
      let initials = "";
      if (fn) initials += fn[0];
      if (ln) initials += ln[0];
      plist.push({
        name: `${fn} ${ln}`.trim(),
        zawodnik: p.zawodnik || "",
        initials,
        paid: p.paid,
      });
    }
    playersData[mid] = {
      date: m.match_date,
      time: m.match_time,
      location: m.location,
      max: m.max_slots,
      players: plist,
    };
  }
  return playersData;
}

export function categorizeMatches(matches: MatchRow[]) {
  const today = new Date().toISOString().slice(0, 10);
  const upcoming: MatchRow[] = [];
  const afterDate: MatchRow[] = [];
  const playedConfirmed: MatchRow[] = [];
  for (const m of matches) {
    if (m.played === 1) {
      playedConfirmed.push(m);
    } else if (m.match_date >= today) {
      upcoming.push(m);
    } else {
      afterDate.push(m);
    }
  }
  return { upcoming, afterDate, playedConfirmed };
}

export function userSignedMap(
  signups: SignupRow[],
  sessionZawodnik: string | undefined
): Record<number, boolean> {
  const map: Record<number, boolean> = {};
  if (!sessionZawodnik) return map;
  for (const s of signups) {
    if (s.zawodnik === sessionZawodnik) {
      map[s.match_id] = true;
    }
  }
  return map;
}
