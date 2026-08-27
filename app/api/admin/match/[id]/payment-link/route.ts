import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-helpers";
import { getDb, logActivity } from "@/lib/db";
import { createOrGetMatchSignupFeesLink } from "@/lib/public-payment-share";
import { appendShareSessionQuery } from "@/lib/share-link";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  const matchId = Number(id);
  if (!Number.isFinite(matchId) || matchId <= 0) {
    return NextResponse.json({ error: "Nieprawidłowy mecz" }, { status: 400 });
  }

  const db = await getDb();
  const match = (await db
    .prepare("SELECT id, cancelled FROM matches WHERE id = ?")
    .get(matchId)) as { id: number; cancelled: number } | undefined;
  if (!match) return NextResponse.json({ error: "Mecz nie znaleziony" }, { status: 404 });
  if (Number(match.cancelled) === 1) {
    return NextResponse.json({ error: "Nie można wygenerować linku opłat do odwołanego meczu" }, { status: 400 });
  }

  const { token, created } = await createOrGetMatchSignupFeesLink({
    matchId,
    adminId: gate.session.userId,
  });
  if (created) {
    await logActivity(gate.session.userId, `Wygenerował link opłat składki — mecz #${matchId}`);
  }

  const path = appendShareSessionQuery(`/platnosci-public/${token}`);
  return NextResponse.json({ ok: true, token, path, created });
}
