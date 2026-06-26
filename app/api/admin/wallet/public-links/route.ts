import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { getDb, logActivity } from "@/lib/db";
import { requireAdmin } from "@/lib/api-helpers";

export const runtime = "nodejs";

const postSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("last_match_wallets"),
    expires_in_days: z.coerce.number().int().min(1).max(365).optional(),
  }),
  z.object({
    kind: z.literal("match_wallets"),
    match_id: z.coerce.number().int().positive(),
    expires_in_days: z.coerce.number().int().min(1).max(365).optional(),
  }),
  z.object({
    kind: z.literal("player_wallets"),
    user_id: z.coerce.number().int().positive(),
    expires_in_days: z.coerce.number().int().min(1).max(365).optional(),
  }),
]);

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Nieprawidłowe JSON" }, { status: 400 });
  }
  const parsed = postSchema.safeParse(json ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const db = await getDb();

  if (parsed.data.kind === "match_wallets") {
    const exists = await db.prepare("SELECT id FROM matches WHERE id = ?").get(parsed.data.match_id);
    if (!exists) return NextResponse.json({ error: "Mecz nie znaleziony" }, { status: 404 });
  }
  if (parsed.data.kind === "player_wallets") {
    const exists = await db.prepare("SELECT id FROM users WHERE id = ?").get(parsed.data.user_id);
    if (!exists) return NextResponse.json({ error: "Zawodnik nie znaleziony" }, { status: 404 });
  }

  const token = crypto.randomBytes(16).toString("hex");
  const expiresAt = parsed.data.expires_in_days
    ? `datetime('now', '+${parsed.data.expires_in_days} days')`
    : null;

  const matchId = parsed.data.kind === "match_wallets" ? parsed.data.match_id : null;
  const userId = parsed.data.kind === "player_wallets" ? parsed.data.user_id : null;

  if (expiresAt) {
    await db
      .prepare(
        `INSERT INTO public_share_links (token, kind, created_by_admin_id, expires_at, match_id, user_id)
         VALUES (?, ?, ?, ${expiresAt}, ?, ?)`
      )
      .run(token, parsed.data.kind, gate.session.userId, matchId, userId);
  } else {
    await db
      .prepare(
        `INSERT INTO public_share_links (token, kind, created_by_admin_id, expires_at, match_id, user_id)
         VALUES (?, ?, ?, NULL, ?, ?)`
      )
      .run(token, parsed.data.kind, gate.session.userId, matchId, userId);
  }

  await logActivity(
    gate.session.userId,
    `Wygenerował publiczny link (${parsed.data.kind}) token ${token}${matchId ? ` mecz ${matchId}` : ""}${userId ? ` user ${userId}` : ""}`
  );

  return NextResponse.json({
    ok: true,
    token,
    path: `/platnosci-public/${token}`,
  });
}
