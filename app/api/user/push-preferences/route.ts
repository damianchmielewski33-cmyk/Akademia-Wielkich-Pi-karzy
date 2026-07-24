import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/api-helpers";

export const runtime = "nodejs";

const bodySchema = z.object({
  consent: z.boolean().optional().default(true),
});

/**
 * Push o nowych meczach jest zawsze włączony — brak przełącznika w aplikacji.
 * Endpoint zostaje dla kompatybilności (rejestracja po logowaniu); wyłączenie jest ignorowane.
 */
export async function POST(req: Request) {
  const gate = await requireUser();
  if (!gate.ok) return gate.response;

  let json: unknown = {};
  try {
    json = await req.json();
  } catch {
    json = {};
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Walidacja nie powiodła się", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const db = await getDb();
  const uid = gate.session.userId;

  await db.prepare("UPDATE users SET push_notifications_consent = 1 WHERE id = ?").run(uid);

  return NextResponse.json({ ok: true, push_notifications_consent: 1 });
}
