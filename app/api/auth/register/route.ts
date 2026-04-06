import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, logActivity } from "@/lib/db";
import { ALL_PLAYERS } from "@/lib/constants";
import { resolveCanonicalPlayerAlias } from "@/lib/player-alias";
import Database from "better-sqlite3";
import { createSessionToken, setSessionCookie } from "@/lib/auth";
import { checkRateLimit, rateLimitKey, rateLimitedResponse, RATE } from "@/lib/rate-limit";

export const runtime = "nodejs";

const bodySchema = z.object({
  first_name: z.string().min(1).trim(),
  last_name: z.string().min(1).trim(),
  zawodnik: z.string().min(1).trim(),
  auto_login: z.boolean().optional(),
});

export async function POST(req: Request) {
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
  const { first_name, last_name, zawodnik, auto_login } = parsed.data;

  const canonical = resolveCanonicalPlayerAlias(zawodnik);
  if (!canonical) {
    return NextResponse.json(
      { error: "Ten piłkarz jest już zajęty lub nieprawidłowy." },
      { status: 400 }
    );
  }

  const db = getDb();
  const count = (db.prepare("SELECT COUNT(*) AS c FROM users").get() as { c: number }).c;
  const isAdmin = count === 0 ? 1 : 0;

  const taken = new Set(
    (db.prepare("SELECT player_alias FROM users").all() as { player_alias: string }[]).map((r) => r.player_alias)
  );
  const available = ALL_PLAYERS.filter((p) => !taken.has(p));
  if (!available.includes(canonical)) {
    return NextResponse.json(
      { error: "Ten piłkarz jest już zajęty lub nieprawidłowy." },
      { status: 400 }
    );
  }

  let userId: number;
  try {
    const r = db
      .prepare(
        "INSERT INTO users (first_name, last_name, player_alias, is_admin) VALUES (?, ?, ?, ?)"
      )
      .run(first_name, last_name, canonical, isAdmin);
    userId = Number(r.lastInsertRowid);
  } catch (e) {
    if (e instanceof Database.SqliteError && e.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return NextResponse.json({ error: "Ten piłkarz jest już zajęty." }, { status: 409 });
    }
    console.error("[register] INSERT failed", e);
    return NextResponse.json(
      { error: "Nie udało się utworzyć konta. Spróbuj ponownie później." },
      { status: 500 }
    );
  }

  logActivity(
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
      });
      await setSessionCookie(token);
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
