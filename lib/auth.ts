import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { cache } from "react";
import { SESSION_COOKIE } from "@/lib/constants";
import { getAuthSecretKey } from "@/lib/auth-secret";
import { getDb } from "@/lib/db";

export type AppSession = {
  userId: number;
  isAdmin: boolean;
  firstName: string;
  lastName: string;
  zawodnik: string;
  /** Wersja z tabeli users — musi się zgadzać z JWT, inaczej sesja jest nieważna (np. reset PIN). */
  authVersion: number;
  /**
   * true: użytkownik zaznaczył „Nie wylogowuj mnie” przy logowaniu (lub starszy token bez pola rm).
   * false: po ~30 min bezczynności klient wyloguje użytkownika.
   */
  rememberMe: boolean;
  /** Brak pin_hash w bazie — wymagane ustawienie PIN-u (np. konto sprzed wdrożenia PIN). */
  needsPinSetup: boolean;
  /** Zgłoszona zmiana PIN-u czeka na akceptację admina — bez pełnego dostępu do konta. */
  pinChangePending: boolean;
};

type JwtSessionFields = Omit<AppSession, "needsPinSetup" | "pinChangePending">;

function sessionMaxAgeSec(rememberMe: boolean): number {
  // Jeśli użytkownik nie zaznaczył „Nie wylogowuj mnie”, token powinien wygasać szybciej niż 30 dni.
  // Użytkownik wciąż może być wylogowywany po bezczynności po stronie klienta, ale to nie zastępuje TTL po stronie serwera.
  return rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 8;
}

export async function createSessionToken(session: JwtSessionFields): Promise<string> {
  const maxAgeSec = sessionMaxAgeSec(session.rememberMe);
  return new SignJWT({
    adm: session.isAdmin ? 1 : 0,
    fn: session.firstName,
    ln: session.lastName,
    zaw: session.zawodnik,
    ver: session.authVersion,
    /** 1 = „Nie wylogowuj mnie” — brak wymuszania wylogowania po bezczynności po stronie klienta. */
    rm: session.rememberMe ? 1 : 0,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(session.userId))
    .setIssuedAt()
    .setExpirationTime(`${maxAgeSec}s`)
    .sign(getAuthSecretKey());
}

export async function verifySessionToken(token: string): Promise<JwtSessionFields> {
  const { payload } = await jwtVerify(token, getAuthSecretKey());
  const rm = payload.rm;
  const rememberMe = rm === undefined ? true : rm === 1;
  return {
    userId: Number(payload.sub),
    isAdmin: payload.adm === 1,
    firstName: String(payload.fn ?? ""),
    lastName: String(payload.ln ?? ""),
    zawodnik: String(payload.zaw ?? ""),
    authVersion: Number(payload.ver ?? 0),
    rememberMe,
  };
}

export const getServerSession = cache(async (): Promise<AppSession | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const session = await verifySessionToken(token);
    const db = await getDb();
    const row = (await db
      .prepare("SELECT auth_version, pin_hash, pin_hash_pending FROM users WHERE id = ?")
      .get(session.userId)) as
      | { auth_version: number; pin_hash: string | null; pin_hash_pending: string | null }
      | undefined;
    if (!row || row.auth_version !== session.authVersion) return null;
    const needsPinSetup = !row.pin_hash;
    const pinChangePending = Boolean(row.pin_hash_pending);
    return { ...session, needsPinSetup, pinChangePending };
  } catch {
    return null;
  }
});

export async function setSessionCookie(token: string, opts?: { rememberMe?: boolean }) {
  const jar = await cookies();
  const rememberMe = opts?.rememberMe ?? true;
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: sessionMaxAgeSec(rememberMe),
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  // cookies().delete(name) bywa niewystarczające, jeśli cookie ma ustawione atrybuty (path/sameSite/secure).
  // Wygaszamy je jawnie z tym samym zestawem atrybutów co przy ustawianiu.
  jar.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    secure: process.env.NODE_ENV === "production",
  });
}
