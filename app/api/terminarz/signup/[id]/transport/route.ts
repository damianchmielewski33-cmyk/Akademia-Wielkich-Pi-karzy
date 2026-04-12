import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/api-helpers";
import { normalizeTransportFromBody, validateTransportBody } from "@/lib/transport";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const gate = await requireUser();
  if (!gate.ok) return gate.response;
  const { id } = await ctx.params;
  const mid = Number(id);
  if (!Number.isFinite(mid)) {
    return NextResponse.json({ error: "Invalid match" }, { status: 400 });
  }

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Niepoprawny JSON" }, { status: 400 });
  }
  const o = rawBody as Record<string, unknown>;
  if (typeof o.drivesCar !== "boolean") {
    return NextResponse.json({ error: "Pole drivesCar jest wymagane." }, { status: 400 });
  }
  const err = validateTransportBody({
    drivesCar: o.drivesCar,
    canTakePassengers: typeof o.canTakePassengers === "boolean" ? o.canTakePassengers : undefined,
    needsTransport: typeof o.needsTransport === "boolean" ? o.needsTransport : undefined,
  });
  if (err) return NextResponse.json({ error: err }, { status: 400 });
  const transport = normalizeTransportFromBody({
    drivesCar: o.drivesCar,
    canTakePassengers: typeof o.canTakePassengers === "boolean" ? o.canTakePassengers : undefined,
    needsTransport: typeof o.needsTransport === "boolean" ? o.needsTransport : undefined,
  });

  const db = await getDb();
  const signup = await db
    .prepare(
      "SELECT id, COALESCE(commitment, 1) AS commitment FROM match_signups WHERE user_id = ? AND match_id = ?"
    )
    .get(gate.session.userId, mid) as { id: number; commitment: number } | undefined;
  if (!signup) {
    return NextResponse.json({ error: "Nie jesteś zapisany na ten mecz." }, { status: 400 });
  }
  if (signup.commitment === 0) {
    return NextResponse.json(
      { error: "Potwierdź najpierw udział w terminarzu (status «jeszcze nie wiem»)." },
      { status: 400 }
    );
  }
  if (signup.commitment === 2) {
    return NextResponse.json(
      { error: "Masz zaznaczone «nie biorę udziału» — zmień status w terminarzu, aby ustawić transport." },
      { status: 400 }
    );
  }
  const match = await db.prepare("SELECT played FROM matches WHERE id = ?").get(mid) as { played: number } | undefined;
  if (!match || match.played === 1) {
    return NextResponse.json({ error: "Nie można zmienić transportu dla tego meczu." }, { status: 400 });
  }

  await db.prepare(
    `UPDATE match_signups SET drives_car = ?, can_take_passengers = ?, needs_transport = ? WHERE user_id = ? AND match_id = ?`
  ).run(
    transport.drives_car,
    transport.can_take_passengers,
    transport.needs_transport,
    gate.session.userId,
    mid
  );

  return NextResponse.json({ ok: true });
}
