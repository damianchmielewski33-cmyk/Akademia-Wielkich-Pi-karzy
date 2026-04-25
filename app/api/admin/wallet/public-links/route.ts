import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { getDb, logActivity } from "@/lib/db";
import { requireAdmin } from "@/lib/api-helpers";

export const runtime = "nodejs";

const postSchema = z.object({
  kind: z.literal("last_match_wallets").default("last_match_wallets"),
  expires_in_days: z.coerce.number().int().min(1).max(365).optional(),
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
  const parsed = postSchema.safeParse(json ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const token = crypto.randomBytes(16).toString("hex");
  const expiresAt = parsed.data.expires_in_days
    ? `datetime('now', '+${parsed.data.expires_in_days} days')`
    : null;

  const db = await getDb();
  if (expiresAt) {
    await db
      .prepare(
        `INSERT INTO public_share_links (token, kind, created_by_admin_id, expires_at)
         VALUES (?, ?, ?, ${expiresAt})`
      )
      .run(token, parsed.data.kind, gate.session.userId);
  } else {
    await db
      .prepare(
        `INSERT INTO public_share_links (token, kind, created_by_admin_id, expires_at)
         VALUES (?, ?, ?, NULL)`
      )
      .run(token, parsed.data.kind, gate.session.userId);
  }

  await logActivity(gate.session.userId, `Wygenerował publiczny link (${parsed.data.kind}) token ${token}`);

  return NextResponse.json({
    ok: true,
    token,
    path: `/platnosci-public/${token}`,
  });
}

