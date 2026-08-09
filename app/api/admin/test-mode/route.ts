import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api-helpers";
import { logActivity } from "@/lib/db";
import {
  applyTestModeCookie,
  isAdminTestModeActive,
  isTestModeConfigured,
  setAdminTestModeEnabled,
  wipeTestModeData,
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
  // Przywróć cookie gdy flaga w DB żyje, a ciasteczko zginęło (np. po HotPay).
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
      await logActivity(adminId, "Tryb testowy WŁĄCZONY (ta sama baza, nowe dane z flagą is_test)");
      return NextResponse.json({ enabled: true, configured: true });
    }

    const wiped = await wipeTestModeData();
    await setAdminTestModeEnabled(adminId, false);
    await logActivity(
      adminId,
      `Tryb testowy WYŁĄCZONY — usunięto testowe: mecze=${wiped.matches}, gracze=${wiped.users}, portfel=${wiped.wallet_tx}, hotpay=${wiped.hotpay}`
    );
    return NextResponse.json({
      enabled: false,
      configured: true,
      wiped,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Nie udało się przełączyć trybu testowego";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
