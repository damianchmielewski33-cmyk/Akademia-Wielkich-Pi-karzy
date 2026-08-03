import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getAuthSecretKey } from "@/lib/auth-secret";
import { CONTACT_ADMIN_GUEST_COOKIE } from "@/lib/constants";

const GUEST_TYP = "awp_contact_guest";
const GUEST_MAX_AGE_SEC = 60 * 60 * 24 * 30;

export async function createContactAdminGuestToken(conversationKey: string): Promise<string> {
  return new SignJWT({ typ: GUEST_TYP, ck: conversationKey })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${GUEST_MAX_AGE_SEC}s`)
    .sign(getAuthSecretKey());
}

export async function verifyContactAdminGuestToken(
  token: string
): Promise<{ conversationKey: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getAuthSecretKey());
    if (payload.typ !== GUEST_TYP) return null;
    const ck = typeof payload.ck === "string" ? payload.ck.trim() : "";
    if (!ck || ck.length > 200) return null;
    return { conversationKey: ck };
  } catch {
    return null;
  }
}

export async function readContactAdminGuestAccess(): Promise<{ conversationKey: string } | null> {
  const jar = await cookies();
  const token = jar.get(CONTACT_ADMIN_GUEST_COOKIE)?.value;
  if (!token) return null;
  return verifyContactAdminGuestToken(token);
}

export async function setContactAdminGuestCookie(conversationKey: string): Promise<void> {
  const jar = await cookies();
  const token = await createContactAdminGuestToken(conversationKey);
  jar.set(CONTACT_ADMIN_GUEST_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: GUEST_MAX_AGE_SEC,
    secure: process.env.NODE_ENV === "production",
  });
}

export function guestHasConversationAccess(
  access: { conversationKey: string } | null,
  conversationKey: string
): boolean {
  return Boolean(access && access.conversationKey === conversationKey);
}
