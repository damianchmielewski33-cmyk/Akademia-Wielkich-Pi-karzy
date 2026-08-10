import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api-helpers";
import { getProdDb } from "@/lib/db";
import {
  applyTestModeCookie,
  isAdminTestModeActive,
  isTestModeConfigured,
  setAdminTestModeEnabled,
} from "@/lib/test-mode";

export const runtime = "nodejs";

const postSchema = z.object({
  enabled: z.boolean(),
});

export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const enabled = await isAdminTestModeActive();
  const res = NextResponse.json({
    enabled,
    configured: isTestModeConfigured(),
  });
  if (enabled) applyTestModeCookie(res, true);
  return res;
}

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Nieprawidłowe JSON" }, { status: 400 });
  }
  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Podaj enabled: true|false" }, { status: 400 });
  }

  const { enabled } = parsed.data;
  const adminId = gate.session.userId;

  try {
    if (enabled) {
      await setAdminTestModeEnabled(adminId, true);
      // Log na PROD (getDb w trybie testowym wskazałby TEST — logujemy jawnie).
      const prod = await getProdDb();
      await prod
        .prepare("INSERT INTO activity_log (user_id, action) VALUES (?, ?)")
        .run(adminId, "Sandbox WŁĄCZONY — mecze i płatności bez wpływu na graczy");
      const res = NextResponse.json({
        enabled: true,
        configured: isTestModeConfigured(),
      });
      applyTestModeCookie(res, true);
      return res;
    }

    const result = await setAdminTestModeEnabled(adminId, false);
    const prod = await getProdDb();
    await prod
      .prepare("INSERT INTO activity_log (user_id, action) VALUES (?, ?)")
      .run(
        adminId,
        `Sandbox WYŁĄCZONY — skasowano dane testowe (tabele≈${result.wipedTables ?? 0}, wiersze≈${result.wipedRows ?? 0})`
      );
    const res = NextResponse.json({
      enabled: false,
      configured: isTestModeConfigured(),
      wiped: result,
    });
    applyTestModeCookie(res, false);
    return res;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Nie udało się przełączyć trybu testowego";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
