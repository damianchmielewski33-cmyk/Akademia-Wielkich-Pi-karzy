import { connection, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, logActivity } from "@/lib/db";
import { normalizePlayerAlias } from "@/lib/player-alias";
import { isUniqueConstraintError } from "@/lib/sql-errors";
import { createSessionToken, setSessionCookie } from "@/lib/auth";
import { checkRateLimit, rateLimitKey, rateLimitedResponse, RATE } from "@/lib/rate-limit";
import { hashPin, isValidPinFormat, isWeakPin, WEAK_PIN_MESSAGE } from "@/lib/pin";

export const runtime = "nodejs";

const bodySchema = z.object({
  first_name: z.string().min(1).trim(),
  last_name: z.string().min(1).trim(),
  zawodnik: z.string().min(1).trim(),
  pin: z.string().min(1).trim(),
  pin_confirm: z.string().min(1).trim(),
  auto_login: z.boolean().optional(),
});

export async function POST(req: Request) {
  await connection();
  const rl = checkRateLimit(rateLimitKey("register", req), RATE.register.limit, RATE.register.windowMs);
  if (!rl.ok) return rateLimitedResponse(rl.retryAfterSec);

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Nieprawidłowe JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Wszystkie pola są wymagane." }, { status: 400 });
  }
  const { first_name, last_name, zawodnik, pin, pin_confirm, auto_login } = parsed.data;

  if (pin !== pin_confirm) {
    return NextResponse.json({ error: "PIN-y muszą być takie same." }, { status: 400 });
  }
  if (!isValidPinFormat(pin)) {
    return NextResponse.json({ error: "PIN musi mieć 4–6 cyfr." }, { status: 400 });
  }
  if (isWeakPin(pin)) {
    return NextResponse.json({ error: WEAK_PIN_MESSAGE }, { status: 400 });
  }

  const canonical = normalizePlayerAlias(zawodnik);
  if (!canonical) {
    return NextResponse.json(
      { error: "Nieprawidłowy pseudonim piłkarza (2–120 znaków)." },
      { status: 400 }
    );
  }

  const db = await getDb();
  const count = (
    (await db.prepare("SELECT COUNT(*) AS c FROM users").get()) as { c: number } | undefined
  )?.c ?? 0;
  const isAdmin = count === 0 ? 1 : 0;

  const taken = new Set(
    ((await db.prepare("SELECT player_alias FROM users").all()) as { player_alias: string }[]).map(
      (r) => r.player_alias
    )
  );
  if (taken.has(canonical)) {
    return NextResponse.json({ error: "Ten pseudonim piłkarza jest już zajęty." }, { status: 409 });
  }

  const pinHash = await hashPin(pin);
  let userId: number;
  try {
    const r = await db
      .prepare(
        `INSERT INTO users (first_name, last_name, player_alias, is_admin, pin_hash, auth_version)
         VALUES (?, ?, ?, ?, ?, 0)`
      )
      .run(first_name, last_name, canonical, isAdmin, pinHash);
    userId = Number(r.lastInsertRowid);
  } catch (e) {
    if (isUniqueConstraintError(e)) {
      return NextResponse.json({ error: "Ten pseudonim piłkarza jest już zajęty." }, { status: 409 });
    }
    console.error("[register] INSERT failed", e);
    return NextResponse.json(
      { error: "Nie udało się utworzyć konta. Spróbuj ponownie później." },
      { status: 500 }
    );
  }

  await logActivity(
    userId,
    auto_login ? "Zarejestrował konto i zalogował się" : "Zarejestrował konto"
  );

  if (auto_login) {
    try {
      const token = await createSessionToken({
        userId,
        isAdmin: isAdmin === 1,
        firstName: first_name,
        lastName: last_name,
        zawodnik: canonical,
        authVersion: 0,
        rememberMe: true,
      });
      await setSessionCookie(token, { rememberMe: true });
      return NextResponse.json(
        {
          ok: true,
          logged_in: true,
          user: {
            id: userId,
            first_name,
            last_name,
            zawodnik: canonical,
            is_admin: isAdmin,
          },
        },
        { status: 201 }
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("AUTH_SECRET")) {
        console.error("[register] sesja po utworzeniu konta — AUTH_SECRET:", msg);
        return NextResponse.json(
          {
            error:
              "Konto zostało utworzone, ale logowanie nie powiodło się (konfiguracja AUTH_SECRET na serwerze). Odśwież stronę i zaloguj się ręcznie lub skontaktuj się z administratorem.",
          },
          { status: 503 }
        );
      }
      console.error("[register] createSessionToken failed", e);
      return NextResponse.json(
        { error: "Nie udało się dokończyć logowania. Spróbuj zalogować się ręcznie." },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ ok: true, logged_in: false }, { status: 201 });
}
