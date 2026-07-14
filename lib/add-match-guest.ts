import { getDb, logActivity } from "@/lib/db";
import { normalizePlayerAlias } from "@/lib/player-alias";

export type AddMatchGuestInput = {
  matchId: number;
  firstName: string;
  lastName: string;
  playerAlias: string;
  actorUserId: number | null;
  /** Tekst do `logActivity` — domyślnie opis dodania gościa. */
  activityMessage?: string;
};

export type AddMatchGuestResult =
  | { ok: true; userId: number }
  | { ok: false; error: string; status: number };

export async function addMatchGuest(input: AddMatchGuestInput): Promise<AddMatchGuestResult> {
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const playerAlias = normalizePlayerAlias(input.playerAlias);

  if (!firstName || firstName.length > 100) {
    return { ok: false, error: "Imię jest wymagane", status: 400 };
  }
  if (!lastName || lastName.length > 100) {
    return { ok: false, error: "Nazwisko jest wymagane", status: 400 };
  }
  if (!playerAlias) {
    return { ok: false, error: "Nieprawidłowy pseudonim", status: 400 };
  }

  const db = await getDb();
  const match = (await db
    .prepare(
      "SELECT id, match_date, match_time, location, max_slots, signed_up FROM matches WHERE id = ?"
    )
    .get(input.matchId)) as
    | {
        id: number;
        match_date: string;
        match_time: string;
        location: string;
        max_slots: number;
        signed_up: number;
      }
    | undefined;

  if (!match) {
    return { ok: false, error: "Mecz nie został znaleziony", status: 404 };
  }

  if (match.signed_up >= match.max_slots) {
    return { ok: false, error: "Brak wolnych miejsc na ten mecz", status: 400 };
  }

  const existingAlias = await db.prepare("SELECT id FROM users WHERE player_alias = ?").get(playerAlias);
  if (existingAlias) {
    return { ok: false, error: "Pseudonim już istnieje w systemie", status: 400 };
  }

  const createUser = db.prepare(
    `INSERT INTO users (first_name, last_name, player_alias, is_admin, is_temporary, temporary_guest_match_id)
     VALUES (?, ?, ?, 0, 1, ?)`
  );
  const userResult = await createUser.run(firstName, lastName, playerAlias, input.matchId);
  const userId = Number(userResult.lastInsertRowid);

  await db
    .prepare(
      `INSERT INTO match_signups (user_id, match_id, paid, commitment)
       VALUES (?, ?, 0, 1)`
    )
    .run(userId, input.matchId);

  await db.prepare("UPDATE matches SET signed_up = signed_up + 1 WHERE id = ?").run(input.matchId);

  const activityMessage =
    input.activityMessage ??
    `Dodał gościnnego piłkarza ${firstName} ${lastName} (${playerAlias}) na mecz id ${input.matchId} (${match.match_date} ${match.match_time}, ${match.location})`;
  await logActivity(input.actorUserId, activityMessage);

  return { ok: true, userId };
}
