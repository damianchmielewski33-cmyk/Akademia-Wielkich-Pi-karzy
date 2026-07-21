import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/api-helpers";

export const runtime = "nodejs";

const bodySchema = z.object({
  consent: z.boolean(),
});

/** Włączenie / wyłączenie zgody na push (osobno od e-mail). */
export async function POST(req: Request) {
  const gate = await requireUser();
  if (!gate.ok) return gate.response;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Nieprawidłowe JSON" }, { status: 400 });
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
  const consent = parsed.data.consent ? 1 : 0;

  await db.prepare("UPDATE users SET push_notifications_consent = ? WHERE id = ?").run(consent, uid);

  if (!parsed.data.consent) {
    await db.prepare("DELETE FROM user_devices WHERE user_id = ?").run(uid);
  }

  return NextResponse.json({ ok: true, push_notifications_consent: consent });
}
