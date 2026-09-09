import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getMatchLineupViewData } from "@/lib/match-lineup-data";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const matchId = Number(id);
  if (!Number.isFinite(matchId)) {
    return NextResponse.json({ error: "Nieprawidłowe id meczu." }, { status: 400 });
  }

  const db = await getDb();
  const session = await getServerSession();
  const requirePublic = !session?.isAdmin;
  const data = await getMatchLineupViewData(db, matchId, { requirePublic });
  if (!data) {
    return NextResponse.json({ error: "Składy nie są jeszcze dostępne dla tego meczu." }, { status: 404 });
  }

  return NextResponse.json(data);
}
