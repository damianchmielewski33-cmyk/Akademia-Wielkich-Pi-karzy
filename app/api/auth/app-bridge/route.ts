import { connection, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "@/lib/auth";
import { createAppBridgeTicket, sanitizeAppBridgeNext } from "@/lib/app-bridge";
import { checkRateLimitDistributed } from "@/lib/rate-limit-db";
import { rateLimitKey, rateLimitedResponse, RATE } from "@/lib/rate-limit";

export const runtime = "nodejs";

const bodySchema = z.object({
  next: z.string().min(1).max(512),
});

/**
 * Mobile app: wymienia Bearer JWT na krótkotrwały ticket do WebView.
 * WebView otwiera /api/auth/app-bridge/go?ticket=… — ustawia cookie sesji i przekierowuje na stronę.
 */
export async function POST(req: Request) {
  await connection();
  const rl = await checkRateLimitDistributed(
    rateLimitKey("appBridge", req),
    RATE.appBridge.limit,
    RATE.appBridge.windowMs
  );
  if (!rl.ok) return rateLimitedResponse(rl.retryAfterSec);

  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Nieprawidłowe JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Walidacja nie powiodła się" }, { status: 400 });
  }
  const nextPath = sanitizeAppBridgeNext(parsed.data.next);
  if (!nextPath) {
    return NextResponse.json({ error: "Nieprawidłowa ścieżka" }, { status: 400 });
  }

  const ticket = await createAppBridgeTicket(session.userId, nextPath);
  const goPath = `/api/auth/app-bridge/go?ticket=${encodeURIComponent(ticket)}`;
  return NextResponse.json({ ok: true, path: goPath });
}
