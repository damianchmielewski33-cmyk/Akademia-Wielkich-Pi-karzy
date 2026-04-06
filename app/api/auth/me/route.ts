import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET() {
  const s = await getServerSession();
  if (!s) return NextResponse.json({ user: null });
  const db = await getDb();
  const row = (await db
    .prepare(
      `SELECT profile_photo_path, email, match_notifications_consent, notification_prompt_completed
       FROM users WHERE id = ?`
    )
    .get(s.userId)) as
    | {
        profile_photo_path: string | null;
        email: string | null;
        match_notifications_consent: number;
        notification_prompt_completed: number;
      }
    | undefined;
  return NextResponse.json({
    user: {
      id: s.userId,
      first_name: s.firstName,
      last_name: s.lastName,
      zawodnik: s.zawodnik,
      is_admin: s.isAdmin ? 1 : 0,
      needs_pin_setup: s.needsPinSetup ? 1 : 0,
      pin_change_pending: s.pinChangePending ? 1 : 0,
      profile_photo_path: row?.profile_photo_path ?? null,
      email: row?.email ?? null,
      match_notifications_consent: row?.match_notifications_consent ?? 0,
      notification_prompt_completed: row?.notification_prompt_completed ?? 0,
    },
  });
}
