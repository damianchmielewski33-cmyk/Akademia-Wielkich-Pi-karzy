import { NextResponse } from "next/server";
import { getDb, logActivity } from "@/lib/db";
import { requireAdmin } from "@/lib/api-helpers";
import {
  buildCaptainLotteryEntry,
  createLotteryRound,
  loadLotteryRowById,
  loadOpenLotteryRow,
  serializeCaptainLotteryEntry,
} from "@/lib/captain-lottery";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

async function loadSignupPool(db: Awaited<ReturnType<typeof getDb>>, matchId: number) {
  const signups = (await db
    .prepare(
      `SELECT ms.user_id, u.first_name, u.last_name, u.player_alias AS zawodnik, u.profile_photo_path
       FROM match_signups ms
       JOIN users u ON u.id = ms.user_id
       WHERE ms.match_id = ? AND COALESCE(ms.commitment, 1) = 1`
    )
    .all(matchId)) as {
    user_id: number;
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
      paid: 0,
      profilePhotoPath: p.profile_photo_path ?? null,
      commitment: "confirmed" as const,
    };
  });
}

export async function POST(_req: Request, context: RouteContext) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const { id } = await context.params;
  const mid = Number(id);
  if (!Number.isFinite(mid)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const db = await getDb();
  const match = (await db
    .prepare("SELECT match_date, match_time, location, cancelled FROM matches WHERE id = ?")
    .get(mid)) as { match_date: string; match_time: string; location: string; cancelled: number } | undefined;
  if (!match) return NextResponse.json({ error: "Nie znaleziono meczu" }, { status: 404 });
  if (Number(match.cancelled) === 1) {
    return NextResponse.json({ error: "Mecz został anulowany" }, { status: 400 });
  }

  const open = await loadOpenLotteryRow(db, mid);
  if (open) {
    return NextResponse.json(
      { error: "Aktywne losowanie już istnieje — gracze mogą zakręcić koło, zanim dodasz kolejne." },
      { status: 409 }
    );
  }

  const pool = await loadSignupPool(db, mid);
  if (pool.length === 0) {
    return NextResponse.json({ error: "Brak graczy biorących udział w meczu" }, { status: 400 });
  }

  const newId = await createLotteryRound(db, mid, gate.session.userId);
  const row = await loadLotteryRowById(db, newId);
  if (!row) {
    return NextResponse.json({ error: "Nie udało się utworzyć losowania" }, { status: 500 });
  }

  const entry = buildCaptainLotteryEntry(row, pool);
  logActivity(
    gate.session.userId,
    `Dodał losowanie kapitanów (runda ${entry.roundNumber}) — mecz ${match.match_date} ${match.match_time} (${match.location})`
  );

  return NextResponse.json({ lottery: serializeCaptainLotteryEntry(entry) });
}
