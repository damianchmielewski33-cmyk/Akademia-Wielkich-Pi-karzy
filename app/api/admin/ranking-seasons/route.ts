import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api-helpers";
import { getDb, logActivity } from "@/lib/db";
import { getActiveRankingSeason, listRankingSeasons, startRankingSeason } from "@/lib/ranking-seasons";

export const runtime = "nodejs";

export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const db = await getDb();
  const seasons = await listRankingSeasons(db);
  const active = await getActiveRankingSeason(db);
  return NextResponse.json({ seasons, active_season_id: active?.id ?? null });
}

const postSchema = z.object({
  action: z.enum(["start"]),
  name: z.string().trim().min(1).max(120).optional(),
});

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Nieprawidłowe JSON" }, { status: 400 });
  }

  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Nieprawidłowe żądanie." }, { status: 400 });
  }

  const db = await getDb();
  try {
    const season = await startRankingSeason(db, gate.session.userId, parsed.data.name);
    await logActivity(
      gate.session.userId,
      `Rozpoczął nowy sezon rankingu: «${season.name}» (id ${season.id})`
    );
    return NextResponse.json({ ok: true, season });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Nie udało się rozpocząć sezonu.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
