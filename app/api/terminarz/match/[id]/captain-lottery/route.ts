import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireMatchInApiRealm } from "@/lib/api-helpers";
import {
  buildCaptainLotteryEntry,
  loadLotteryHistoryRows,
  serializeCaptainLotteryEntry,
} from "@/lib/captain-lottery";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

async function loadSignupPool(db: Awaited<ReturnType<typeof getDb>>, matchId: number) {
  const signups = (await db
    .prepare(
      `SELECT ms.user_id, COALESCE(ms.commitment, 1) AS commitment, ms.paid,
              u.first_name, u.last_name, u.player_alias AS zawodnik, u.profile_photo_path
       FROM match_signups ms
       JOIN users u ON u.id = ms.user_id
       WHERE ms.match_id = ? AND COALESCE(ms.commitment, 1) = 1`
    )
    .all(matchId)) as {
    user_id: number;
    paid: number;
    first_name: string;
    last_name: string;
    zawodnik: string;
    profile_photo_path: string | null;
  }[];

  return signups.map((p) => {
    const fn = (p.first_name || "").trim();
    const ln = (p.last_name || "").trim();
    let initials = "";
    if (fn) initials += fn[0];
    if (ln) initials += ln[0];
    return {
      userId: p.user_id,
      firstName: fn,
      lastName: ln,
      name: `${fn} ${ln}`.trim(),
      zawodnik: p.zawodnik || "",
      initials,
      paid: p.paid,
      profilePhotoPath: p.profile_photo_path ?? null,
      commitment: "confirmed" as const,
    };
  });
}

export async function GET(req: Request, context: RouteContext) {
  const { id } = await context.params;
  const mid = Number(id);
  if (!Number.isFinite(mid)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const realmGate = await requireMatchInApiRealm(req, mid);
  if (!realmGate.ok) return realmGate.response;

  const db = await getDb();
  const pool = await loadSignupPool(db, mid);
  const rows = await loadLotteryHistoryRows(db, mid);
  if (rows.length === 0) {
    return NextResponse.json({ lottery: null, history: [] });
  }

  const history = rows.map((row) => buildCaptainLotteryEntry(row, pool));
  const lottery = history[0];

  return NextResponse.json({
    lottery: serializeCaptainLotteryEntry(lottery),
    history: history.map(serializeCaptainLotteryEntry),
  });
}
