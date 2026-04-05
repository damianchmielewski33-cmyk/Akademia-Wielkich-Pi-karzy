import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/api-helpers";

export const runtime = "nodejs";

const bodySchema = z.union([
  z.object({ action: z.literal("dismiss") }),
  z
    .object({
      action: z.literal("subscribe"),
      email: z.string().trim().email("Podaj prawidłowy adres e-mail").max(320),
      consent: z.boolean(),
    })
    .refine((d) => d.consent === true, {
      message: "Musisz zaznaczyć zgodę na powiadomienia",
      path: ["consent"],
    }),
]);

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

  const db = getDb();
  const uid = gate.session.userId;

  if (parsed.data.action === "dismiss") {
    db.prepare("UPDATE users SET notification_prompt_completed = 1 WHERE id = ?").run(uid);
    return NextResponse.json({ ok: true });
  }

  db.prepare(
    `UPDATE users SET email = ?, match_notifications_consent = 1, notification_prompt_completed = 1 WHERE id = ?`
  ).run(parsed.data.email, uid);

  return NextResponse.json({ ok: true });
}
