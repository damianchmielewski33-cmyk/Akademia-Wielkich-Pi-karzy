import type { MatchRow } from "@/lib/db";

/** 1 = potwierdzony zapis (wpadam), 0 = wstępne zainteresowanie (jeszcze nie wiem). */
export type SignupRow = {
  match_id: number;
  paid: number;
  commitment: number;
  user_id: number;
  first_name: string;
  last_name: string;
  zawodnik: string;
  profile_photo_path: string | null;
};

export type PlayerEntry = {
  userId: number;
  firstName: string;
  lastName: string;
  name: string;
  zawodnik: string;
  initials: string;
  paid: number;
  profilePhotoPath: string | null;
  commitment: "tentative" | "confirmed";
};

export type PlayersDataEntry = {
  date: string;
  time: string;
  location: string;
  max: number;
  /** Potwierdzeni — liczą się do limitu miejsc w składzie. */
  players: PlayerEntry[];
  /** Wstępnie zainteresowani (bez zajmowania miejsca). */
  tentativePlayers: PlayerEntry[];
};

/** Liczba zapisów «jeszcze nie wiem» dla meczu (wg zbudowanego `playersData`). */
export function tentativeSignupCount(
  playersData: Record<number, PlayersDataEntry>,
  matchId: number
): number {
  return playersData[matchId]?.tentativePlayers.length ?? 0;
}

/** Np. „3 osoby się zastanawiają”. Pusty string przy n ≤ 0. */
export function formatPonderingPlayersPolish(n: number): string {
  if (n <= 0) return "";
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (n === 1 || (mod10 === 1 && mod100 !== 11)) {
    return `${n} osoba się zastanawia`;
  }
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return `${n} osoby się zastanawiają`;
  }
  return `${n} osób się zastanawia`;
}

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
    const tentative: PlayerEntry[] = [];
    for (const p of playersByMatch[mid] ?? []) {
      const fn = (p.first_name || "").trim();
      const ln = (p.last_name || "").trim();
      let initials = "";
      if (fn) initials += fn[0];
      if (ln) initials += ln[0];
      const commitment = p.commitment === 0 ? ("tentative" as const) : ("confirmed" as const);
      const entry: PlayerEntry = {
        userId: p.user_id,
        firstName: fn,
        lastName: ln,
        name: `${fn} ${ln}`.trim(),
        zawodnik: p.zawodnik || "",
        initials,
        paid: p.paid,
        profilePhotoPath: p.profile_photo_path ?? null,
        commitment,
      };
      if (commitment === "tentative") tentative.push(entry);
      else plist.push(entry);
    }
    playersData[mid] = {
      date: m.match_date,
      time: m.match_time,
      location: m.location,
      max: m.max_slots,
      players: plist,
      tentativePlayers: tentative,
    };
  }
  return playersData;
}

export function categorizeMatches(matches: MatchRow[]) {
  const upcoming: MatchRow[] = [];
  const playedConfirmed: MatchRow[] = [];
  for (const m of matches) {
    if (m.played === 1) {
      playedConfirmed.push(m);
    } else {
      upcoming.push(m);
    }
  }
  const byDateTime = (a: MatchRow, b: MatchRow) => {
    const da = `${a.match_date} ${a.match_time}`;
    const db = `${b.match_date} ${b.match_time}`;
    return da.localeCompare(db);
  };
  upcoming.sort(byDateTime);
  playedConfirmed.sort((a, b) => -byDateTime(a, b));
  return { upcoming, playedConfirmed };
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

/** Rodzaj zapisu zalogowanego użytkownika na mecz (wg `player_alias`). */
export function userSignupKindMap(
  signups: SignupRow[],
  sessionZawodnik: string | undefined
): Record<number, "tentative" | "confirmed"> {
  const map: Record<number, "tentative" | "confirmed"> = {};
  if (!sessionZawodnik) return map;
  for (const s of signups) {
    if (s.zawodnik === sessionZawodnik) {
      map[s.match_id] = s.commitment === 0 ? "tentative" : "confirmed";
    }
  }
  return map;
}
