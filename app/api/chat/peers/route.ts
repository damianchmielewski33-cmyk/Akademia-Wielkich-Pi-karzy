import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-helpers";
import { displayNameFromParts } from "@/lib/admin-messages";
import { getDb } from "@/lib/db";
import { REALMS } from "@/lib/realm";

export const runtime = "nodejs";

/** Lista lokalnych graczy do rozpoczęcia rozmowy (admin lub gracz). */
export async function GET(req: Request) {
  const gate = await requireUser();
  if (!gate.ok) return gate.response;

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  const db = await getDb();

  const rows = (await db
    .prepare(
      `SELECT id, first_name, last_name, player_alias, profile_photo_path
       FROM users
       WHERE COALESCE(realm, ?) = ?
         AND COALESCE(is_temporary, 0) = 0
         AND id != ?
       ORDER BY last_name ASC, first_name ASC
       LIMIT 200`
    )
    .all(REALMS.ACADEMY, REALMS.ACADEMY, gate.session.userId)) as {
    id: number;
    first_name: string;
    last_name: string;
    player_alias: string;
    profile_photo_path: string | null;
  }[];

  const needle = q.toLowerCase();
  const players = rows
    .map((u) => ({
      id: u.id,
      first_name: u.first_name,
      last_name: u.last_name,
      player_alias: u.player_alias,
      display_name: displayNameFromParts(u.first_name, u.last_name) || u.player_alias,
      profile_photo_path: u.profile_photo_path,
    }))
    .filter((u) => {
      if (!needle) return true;
      const hay = `${u.display_name} ${u.player_alias}`.toLowerCase();
      return hay.includes(needle);
    })
    .slice(0, 40);

  return NextResponse.json({ players });
}
