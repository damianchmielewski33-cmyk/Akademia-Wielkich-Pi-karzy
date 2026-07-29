import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, logActivity } from "@/lib/db";
import { requireUser, requireMatchInApiRealm } from "@/lib/api-helpers";
import {
  buildCaptainLotteryEntry,
  createLotteryRound,
  loadLotteryRowById,
  loadOpenLotteryRow,
  pickCaptainUserIds,
  serializeCaptainLotteryEntry,
} from "@/lib/captain-lottery";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

const postSchema = z.object({
  captain_count: z.coerce.number().int().min(1).max(5),
});

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

export async function POST(req: Request, context: RouteContext) {
  const gate = await requireUser();
  if (!gate.ok) return gate.response;
  const { id } = await context.params;
  const mid = Number(id);
  if (!Number.isFinite(mid)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const realmGate = await requireMatchInApiRealm(req, mid);
  if (!realmGate.ok) return realmGate.response;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }
  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const db = await getDb();
  const match = (await db
    .prepare("SELECT match_date, match_time, location, cancelled FROM matches WHERE id = ?")
    .get(mid)) as { match_date: string; match_time: string; location: string; cancelled: number } | undefined;
  if (!match) return NextResponse.json({ error: "Nie znaleziono meczu" }, { status: 404 });
  if (Number(match.cancelled) === 1) {
    return NextResponse.json({ error: "Mecz został anulowany" }, { status: 400 });
  }

  const pool = await loadSignupPool(db, mid);
  if (pool.length === 0) {
    return NextResponse.json({ error: "Brak graczy biorących udział w meczu" }, { status: 400 });
  }

  let openRow = await loadOpenLotteryRow(db, mid);
  if (!openRow) {
    const countRow = (await db
      .prepare("SELECT COUNT(*) AS c FROM match_captain_lottery WHERE match_id = ?")
      .get(mid)) as { c: number };
    if (Number(countRow.c) === 0) {
      const newId = await createLotteryRound(db, mid, null);
      openRow = await loadLotteryRowById(db, newId);
    }
  }

  if (!openRow) {
    return NextResponse.json(
      {
        error:
          "Brak aktywnego losowania. Administrator musi dodać kolejne losowanie na terminarzu.",
      },
      { status: 409 }
    );
  }

  if (openRow.drawn_at && Number(openRow.locked) === 1) {
    return NextResponse.json(
      { error: "To losowanie jest już zakończone. Administrator może dodać kolejne losowanie." },
      { status: 409 }
    );
  }

  const captainCount = Math.min(parsed.data.captain_count, pool.length, 5);
  const captainUserIds = pickCaptainUserIds(pool, captainCount);
  const idsJson = JSON.stringify(captainUserIds);

  await db
    .prepare(
      `UPDATE match_captain_lottery
       SET drawn_by_user_id = ?, captain_count = ?, captain_user_ids = ?, drawn_at = datetime('now'), locked = 1
       WHERE id = ?`
    )
    .run(gate.session.userId, captainCount, idsJson, openRow.id);

  const row = await loadLotteryRowById(db, openRow.id);
  if (!row) {
    return NextResponse.json({ error: "Nie udało się zapisać losowania" }, { status: 500 });
  }

  const entry = buildCaptainLotteryEntry(row, pool);
  const captainNames = entry.captains.map((c) => c.name || c.zawodnik).join(", ");
  logActivity(
    gate.session.userId,
    `Losowanie kapitanów (runda ${entry.roundNumber}) meczu ${match.match_date} ${match.match_time} (${match.location}) — ${captainNames}`
  );

  return NextResponse.json({ lottery: serializeCaptainLotteryEntry(entry) });
}
