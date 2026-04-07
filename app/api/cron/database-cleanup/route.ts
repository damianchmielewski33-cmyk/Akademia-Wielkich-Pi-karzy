import { NextResponse } from "next/server";
import { runDatabaseCleanup } from "@/lib/db-cleanup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Czyszczenie może trwać dłużej przy dużej tabeli page_views. */
export const maxDuration = 60;

function verifyCronAuth(req: Request): { ok: true } | { ok: false; status: number; message: string } {
  if (process.env.NODE_ENV === "production") {
    const secret = process.env.CRON_SECRET?.trim();
    if (!secret) return { ok: false, status: 500, message: "Brak CRON_SECRET w konfiguracji" };
    if (req.headers.get("authorization") !== `Bearer ${secret}`) {
      return { ok: false, status: 401, message: "Brak autoryzacji" };
    }
    return { ok: true };
  }
  const secret = process.env.CRON_SECRET?.trim();
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return { ok: false, status: 401, message: "Brak autoryzacji" };
  }
  return { ok: true };
}

/**
 * Cron (np. Vercel): usuwa stare rekordy z bazy i osierocone pliki zdjęć profilowych.
 * Ustaw `CRON_SECRET` i nagłówek `Authorization: Bearer <CRON_SECRET>`.
 */
export async function GET(req: Request) {
  const auth = verifyCronAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const result = await runDatabaseCleanup();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("[cron/database-cleanup]", e);
    return NextResponse.json({ error: "Czyszczenie nie powiodło się" }, { status: 500 });
  }
}
