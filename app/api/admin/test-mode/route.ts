import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api-helpers";
import { logActivity } from "@/lib/db";
import {
  isAdminTestModeActive,
  isTestModeConfigured,
  setTestModeCookie,
  syncAdminsProdToTest,
  wipeAndReseedTestDb,
} from "@/lib/test-mode";

export const runtime = "nodejs";

const postSchema = z.object({
  enabled: z.boolean(),
});

export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const configured = isTestModeConfigured();
  const enabled = configured ? await isAdminTestModeActive() : false;

  return NextResponse.json({
    enabled,
    configured,
  });
}

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  if (!isTestModeConfigured()) {
    return NextResponse.json(
      {
        error:
          "Baza testowa nie jest skonfigurowana. Ustaw TURSO_TEST_DATABASE_URL i TURSO_TEST_AUTH_TOKEN (lokalnie: plik data/database-test.db).",
      },
      { status: 503 }
    );
  }

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
      const { admins } = await syncAdminsProdToTest();
      await setTestModeCookie(true);
      await logActivity(adminId, `Tryb testowy WŁĄCZONY (zsynchronizowano ${admins} adminów)`);
      return NextResponse.json({
        enabled: true,
        configured: true,
        synced_admins: admins,
      });
    }

    const { admins } = await wipeAndReseedTestDb();
    await setTestModeCookie(false);
    await logActivity(
      adminId,
      `Tryb testowy WYŁĄCZONY — wipe bazy testowej, ponownie wgrano ${admins} adminów`
    );
    return NextResponse.json({
      enabled: false,
      configured: true,
      synced_admins: admins,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Nie udało się przełączyć trybu testowego";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
