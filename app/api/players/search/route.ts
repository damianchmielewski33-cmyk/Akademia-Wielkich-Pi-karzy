import { connection, NextResponse } from "next/server";
import { searchPlayersRemote } from "@/lib/search-players";
import { checkRateLimit, rateLimitKey, rateLimitedResponse, RATE } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function GET(req: Request) {
  await connection();
  const rl = checkRateLimit(rateLimitKey("players_search", req), RATE.playersSearch.limit, RATE.playersSearch.windowMs);
  if (!rl.ok) return rateLimitedResponse(rl.retryAfterSec);

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    return NextResponse.json({ players: [] as { id: string; name: string }[] });
  }
  if (q.length > 80) {
    return NextResponse.json({ error: "Zapytanie jest zbyt długie." }, { status: 400 });
  }

  const players = await searchPlayersRemote(q);
  return NextResponse.json({ players });
}
