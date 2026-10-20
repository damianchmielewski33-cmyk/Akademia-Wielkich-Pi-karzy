import { NextResponse } from "next/server";
import { z } from "zod";
import { getProdDb } from "@/lib/db";
import {
  runEmergencyPinReset,
  type EmergencyPinResetScope,
} from "@/lib/emergency-pin-reset";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Jednorazowy awaryjny reset PIN-ów (utrata PIN_PEPPER).
 *
 * Wymaga na Renderze:
 *   ENABLE_EMERGENCY_PIN_RESET=1
 *   EMERGENCY_PIN_RESET_SECRET=<długi sekret>
 * oraz BRAK starego nieznanego PIN_PEPPER (usuń albo ustaw nowy znany).
 *
 * POST /api/cron/emergency-pin-reset
 * Authorization: Bearer <EMERGENCY_PIN_RESET_SECRET>
 * Body: { "temp_pin": "482917", "scope": "admins" | "all" }
 *
 * Po udanym logowaniu usuń ENABLE_EMERGENCY_PIN_RESET i EMERGENCY_PIN_RESET_SECRET, redeploy.
 */
const bodySchema = z.object({
  temp_pin: z.string().trim().min(4).max(6),
  scope: z.enum(["admins", "all"]).default("admins"),
});

function authorize(req: Request): { ok: true } | { ok: false; status: number; message: string } {
  if (process.env.ENABLE_EMERGENCY_PIN_RESET?.trim() !== "1") {
    return { ok: false, status: 404, message: "Not found" };
  }
  const secret = process.env.EMERGENCY_PIN_RESET_SECRET?.trim();
  if (!secret || secret.length < 24) {
    return { ok: false, status: 500, message: "Brak EMERGENCY_PIN_RESET_SECRET (≥24 znaki)" };
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return { ok: false, status: 401, message: "Brak autoryzacji" };
  }
  return { ok: true };
}

export async function POST(req: Request) {
  const auth = authorize(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Nieprawidłowe JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Podaj temp_pin (4–6 cyfr) oraz opcjonalnie scope: admins|all" },
      { status: 400 }
    );
  }

  try {
    const db = await getProdDb();
    const result = await runEmergencyPinReset(db, {
      tempPin: parsed.data.temp_pin,
      scope: parsed.data.scope as EmergencyPinResetScope,
    });
    console.warn("[emergency-pin-reset]", {
      scope: result.scope,
      updatedUsers: result.updatedUsers,
      emailPasswordAuthDisabled: result.emailPasswordAuthDisabled,
    });
    return NextResponse.json({
      ok: true,
      ...result,
      hint: "Zaloguj się imieniem, nazwiskiem i tymczasowym PIN-em. Potem usuń ENABLE_EMERGENCY_PIN_RESET i EMERGENCY_PIN_RESET_SECRET z Rendera.",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Reset nie powiódł się";
    console.error("[emergency-pin-reset]", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
