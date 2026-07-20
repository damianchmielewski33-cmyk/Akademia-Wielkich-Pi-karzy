import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAppSettings } from "@/lib/app-settings";
import { getDb } from "@/lib/db";
import { getServerSession } from "@/lib/auth";
import { PREVIEW_BLOCKED_COOKIE } from "@/lib/constants";
import { isPreviewBlockedCookieValue } from "@/lib/screen-block-preview";
import {
  getScreenKeyFromApiPath,
  isScreenDisabledForUser,
  screenBlockMessage,
} from "@/lib/screen-blocks";

/** Zwraca odpowiedź 403 gdy ekran powiązany z API jest zaślepiony dla gracza. */
export async function screenBlockApiResponse(req: Request): Promise<NextResponse | null> {
  const url = new URL(req.url);
  const key = getScreenKeyFromApiPath(url.pathname);
  if (!key) return null;

  const session = await getServerSession();
  const cookieStore = await cookies();
  const previewAsPlayer = isPreviewBlockedCookieValue(cookieStore.get(PREVIEW_BLOCKED_COOKIE)?.value);
  const isAdmin = Boolean(session?.isAdmin && !session.pinChangePending && !session.needsPinSetup);
  if (isAdmin && !previewAsPlayer) return null;

  const db = await getDb();
  const settings = await getAppSettings(db);
  if (!isScreenDisabledForUser(settings.screen_blocks, key, false)) return null;

  return NextResponse.json(
    { error: screenBlockMessage(settings.screen_blocks, key), code: "SCREEN_BLOCKED" as const },
    { status: 403 }
  );
}
