import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { getServerSession } from "@/lib/auth";

export const runtime = "nodejs";

const bodySchema = z.object({
  match_id: z.coerce.number().int().positive(),
  goals: z.coerce.number().int().min(0).default(0),
  assists: z.coerce.number().int().min(0).default(0),
  distance: z.coerce.number().min(0).default(0),
  saves: z.coerce.number().int().min(0).default(0),
});

async function parseBody(req: Request) {
  const ct = req.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    return req.json();
  }
  const fd = await req.formData();
  return {
    match_id: fd.get("match_id"),
    goals: fd.get("goals"),
    assists: fd.get("assists"),
    distance: fd.get("distance"),
    saves: fd.get("saves"),
  };
}

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session) {
    return new NextResponse("NOT_LOGGED", { status: 401 });
  }
  let raw: unknown;
  try {
    raw = await parseBody(req);
  } catch {
    return NextResponse.json({ error: "Bad body" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { match_id, goals, assists, distance, saves } = parsed.data;
  const db = getDb();
  db.prepare(
    "INSERT INTO match_stats (user_id, match_id, goals, assists, distance, saves) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(session.userId, match_id, goals, assists, distance, saves);
  return new NextResponse("OK", { status: 200 });
}
