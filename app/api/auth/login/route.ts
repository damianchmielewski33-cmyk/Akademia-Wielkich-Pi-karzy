import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { createSessionToken, setSessionCookie } from "@/lib/auth";

export const runtime = "nodejs";

const bodySchema = z.object({
  first_name: z.string().min(1).trim(),
  last_name: z.string().min(1).trim(),
  zawodnik: z.string().min(1).trim(),
});

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Nieprawidłowe JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Walidacja nie powiodła się", details: parsed.error.flatten() }, { status: 400 });
  }
  const { first_name, last_name, zawodnik } = parsed.data;
  const db = getDb();
  const user = db
    .prepare(
      "SELECT * FROM users WHERE first_name = ? AND last_name = ? AND player_alias = ?"
    )
    .get(first_name, last_name, zawodnik) as
    | { id: number; first_name: string; last_name: string; player_alias: string; is_admin: number }
    | undefined;

  if (!user) {
    return NextResponse.json({ error: "Nieprawidłowe dane logowania mordo" }, { status: 401 });
  }

  const token = await createSessionToken({
    userId: user.id,
    isAdmin: user.is_admin === 1,
    firstName: user.first_name,
    lastName: user.last_name,
    zawodnik: user.player_alias,
  });
  await setSessionCookie(token);

  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      zawodnik: user.player_alias,
      is_admin: user.is_admin,
    },
  });
}
