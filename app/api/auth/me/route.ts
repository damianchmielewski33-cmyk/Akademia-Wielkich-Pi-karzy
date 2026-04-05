import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET() {
  const s = await getServerSession();
  if (!s) return NextResponse.json({ user: null });
  const row = getDb()
    .prepare("SELECT profile_photo_path FROM users WHERE id = ?")
    .get(s.userId) as { profile_photo_path: string | null } | undefined;
  return NextResponse.json({
    user: {
      id: s.userId,
      first_name: s.firstName,
      last_name: s.lastName,
      zawodnik: s.zawodnik,
      is_admin: s.isAdmin ? 1 : 0,
      profile_photo_path: row?.profile_photo_path ?? null,
    },
  });
}
