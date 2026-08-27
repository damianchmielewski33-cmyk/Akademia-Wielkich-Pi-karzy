import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { requireBookingMarketplace } from "@/lib/booking-marketplace";
import { getDb } from "@/lib/db";
import { userHasPzuCupAccess } from "@/lib/pzu-cup-access";
import { matchBelongsToRealm } from "@/lib/realm-db";
import { getApiRealm } from "@/lib/request-realm";
import type { Realm } from "@/lib/realm";

export async function requireUser() {
  const session = await getServerSession();
  if (!session) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "Zaloguj się, aby kontynuować." },
        { status: 401 }
      ),
    };
  }
  if (session.needsPinSetup) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          error:
            "Najpierw ustaw PIN jak numer na koszulce — wejdź w ustawianie PIN-u albo wyloguj się i wejdź od nowa.",
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
            "Twój nowy PIN czeka na gwizdek sztabu. Do decyzji grasz jak kibic bez karnetu.",
          code: "PIN_CHANGE_PENDING" as const,
        },
        { status: 403 }
      ),
    };
  }
  if (session.needsEmailAuthSetup) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          error:
            "Uzupełnij adres e-mail, hasło i kod z wiadomości — bez tego nie wejdziesz dalej.",
          code: "NEEDS_EMAIL_AUTH" as const,
        },
        { status: 403 }
      ),
    };
  }
  return { ok: true as const, session };
}

export async function requireAdmin(requiredSection?: import("@/lib/admin-permissions").AdminSectionId) {
  const r = await requireUser();
  if (!r.ok) return r;
  if (!r.session.isAdmin) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Tej części boiska pilnuje sztab — tylko dla admina." }, { status: 403 }),
    };
  }

  const { adminSectionForApiPath, hasAdminSection } = await import("@/lib/admin-permissions");
  const { headers } = await import("next/headers");
  const pathname = (await headers()).get("x-pathname") ?? "";
  const section = requiredSection ?? (pathname ? adminSectionForApiPath(pathname) : null);
  if (section && !hasAdminSection(r.session.adminSections, section)) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "Tej części szatni strzeże sztab — nie masz wejścia na tę sekcję." },
        { status: 403 }
      ),
    };
  }

  return { ok: true as const, session: r.session };
}

export async function requireVenuePartner() {
  const marketplace = await requireBookingMarketplace();
  if (!marketplace.ok) return marketplace;
  const r = await requireUser();
  if (!r.ok) return r;
  const db = await getDb();
  const { isVenuePartner } = await import("@/lib/venue-partners");
  if (!(await isVenuePartner(db, r.session.userId))) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "Ten panel jest dla partnerów obiektu. Zgłoś halę na /dla-obiektow albo wejdź z konta partnera." },
        { status: 403 }
      ),
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
      response: NextResponse.json({ error: "Brak karnetu na PZU Cup — poproś sztab o dostęp." }, { status: 403 }),
    };
  }
  return { ok: true as const, session: r.session };
}

export async function requireMatchInApiRealm(req: Request, matchId: number) {
  const realm = getApiRealm(req);
  const db = await getDb();
  if (!(await matchBelongsToRealm(db, matchId, realm))) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Tego meczu nie ma na tej połowie boiska." }, { status: 404 }),
    };
  }
  return { ok: true as const, realm: realm as Realm };
}
