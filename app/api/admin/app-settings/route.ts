import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-helpers";
import { getDb } from "@/lib/db";
import { parseYoutubeVideoIdFromUserInput } from "@/lib/site";

export const runtime = "nodejs";

const MAX_YT_URL_LEN = 2048;

export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const db = await getDb();
  const row = (await db
    .prepare(
      "SELECT match_notification_prompt_enabled, home_youtube_url FROM app_settings WHERE id = 1"
    )
    .get()) as { match_notification_prompt_enabled: number; home_youtube_url: string | null } | undefined;
  return NextResponse.json({
    match_notification_prompt_enabled: (row?.match_notification_prompt_enabled ?? 0) === 1,
    home_youtube_url: row?.home_youtube_url ?? null,
  });
}

export async function PUT(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const body = (await req.json().catch(() => ({}))) as {
    match_notification_prompt_enabled?: boolean;
    home_youtube_url?: string;
  };

  const hasNotif = typeof body.match_notification_prompt_enabled === "boolean";
  const hasYoutube = typeof body.home_youtube_url === "string";

  if (!hasNotif && !hasYoutube) {
    return NextResponse.json({ error: "Brak pól do zapisu" }, { status: 400 });
  }

  const db = await getDb();
  const row = (await db
    .prepare(
      "SELECT match_notification_prompt_enabled, home_youtube_url FROM app_settings WHERE id = 1"
    )
    .get()) as
    | { match_notification_prompt_enabled: number; home_youtube_url: string | null }
    | undefined;

  let matchNotificationPromptEnabled = (row?.match_notification_prompt_enabled ?? 0) === 1;
  if (hasNotif) {
    matchNotificationPromptEnabled = body.match_notification_prompt_enabled!;
  }

  let homeYoutubeUrl: string | null = row?.home_youtube_url ?? null;
  if (hasYoutube) {
    const raw = body.home_youtube_url!.trim();
    if (raw.length > MAX_YT_URL_LEN) {
      return NextResponse.json({ error: "Link jest zbyt długi" }, { status: 400 });
    }
    if (raw.length === 0) {
      homeYoutubeUrl = null;
    } else {
      const id = parseYoutubeVideoIdFromUserInput(raw);
      if (!id) {
        return NextResponse.json(
          { error: "Nie rozpoznano prawidłowego linku YouTube ani ID filmu (11 znaków)" },
          { status: 400 }
        );
      }
      homeYoutubeUrl = raw;
    }
  }

  await db
    .prepare(
      "UPDATE app_settings SET match_notification_prompt_enabled = ?, home_youtube_url = ? WHERE id = 1"
    )
    .run(matchNotificationPromptEnabled ? 1 : 0, homeYoutubeUrl);

  return NextResponse.json({
    match_notification_prompt_enabled: matchNotificationPromptEnabled,
    home_youtube_url: homeYoutubeUrl,
  });
}
