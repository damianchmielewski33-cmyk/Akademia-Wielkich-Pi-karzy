import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { cache } from "react";
import { SESSION_COOKIE } from "@/lib/constants";
import { getAuthSecretKey } from "@/lib/auth-secret";

export type AppSession = {
  userId: number;
  isAdmin: boolean;
  firstName: string;
  lastName: string;
  zawodnik: string;
};

export async function createSessionToken(session: AppSession): Promise<string> {
  return new SignJWT({
    adm: session.isAdmin ? 1 : 0,
    fn: session.firstName,
    ln: session.lastName,
    zaw: session.zawodnik,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(session.userId))
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getAuthSecretKey());
}

export async function verifySessionToken(token: string): Promise<AppSession> {
  const { payload } = await jwtVerify(token, getAuthSecretKey());
  return {
    userId: Number(payload.sub),
    isAdmin: payload.adm === 1,
    firstName: String(payload.fn ?? ""),
    lastName: String(payload.ln ?? ""),
    zawodnik: String(payload.zaw ?? ""),
  };
}

export const getServerSession = cache(async (): Promise<AppSession | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    return await verifySessionToken(token);
  } catch {
    return null;
  }
});

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}
