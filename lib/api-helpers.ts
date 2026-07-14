import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { userHasPzuCupAccess } from "@/lib/pzu-cup-access";

export async function requireUser() {
  const session = await getServerSession();
  if (!session) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Wymagane logowanie" }, { status: 401 }),
    };
  }
  if (session.needsPinSetup) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          error: "Musisz ustawić PIN — otwórz stronę ustawiania PIN-u lub wyloguj się i zaloguj ponownie.",
          code: "NEEDS_PIN_SETUP" as const,
        },
        { status: 403 }
      ),
    };
  }
  if (session.pinChangePending) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          error:
            "Zmiana PIN-u oczekuje na zatwierdzenie przez administratora. Do tego czasu korzystasz z witryny jak niezalogowany.",
          code: "PIN_CHANGE_PENDING" as const,
        },
        { status: 403 }
      ),
    };
  }
  return { ok: true as const, session };
}

/**
 * Sesja do ankiety udziału (mecz spoza terminarza): wymaga zalogowania, ale pozwala przy `needsPinSetup`
 * (np. pierwsze wejście na /ustaw-pin), bo `requireUser()` zwracałby 403 i pop-up nigdy by się nie pokazał.
 */
export async function requireSessionForParticipationSurvey() {
  const session = await getServerSession();
  if (!session) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Wymagane logowanie" }, { status: 401 }),
    };
  }
  if (session.pinChangePending) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          error:
            "Zmiana PIN-u oczekuje na zatwierdzenie przez administratora. Do tego czasu korzystasz z witryny jak niezalogowany.",
          code: "PIN_CHANGE_PENDING" as const,
        },
        { status: 403 }
      ),
    };
  }
  return { ok: true as const, session };
}

export async function requireAdmin() {
  const r = await requireUser();
  if (!r.ok) return r;
  if (!r.session.isAdmin) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Brak uprawnień administratora" }, { status: 403 }),
    };
  }
  return { ok: true as const, session: r.session };
}

export async function requirePzuCupAccess() {
  const r = await requireUser();
  if (!r.ok) return r;
  const db = await getDb();
  const allowed = await userHasPzuCupAccess(db, r.session.userId, r.session.isAdmin);
  if (!allowed) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Brak dostępu do sekcji PZU Cup" }, { status: 403 }),
    };
  }
  return { ok: true as const, session: r.session };
}
