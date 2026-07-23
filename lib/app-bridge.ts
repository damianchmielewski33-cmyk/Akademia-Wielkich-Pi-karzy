import { SignJWT, jwtVerify } from "jose";
import { getAuthSecretKey } from "@/lib/auth-secret";

const BRIDGE_TYP = "awp_app_bridge";

/** Dozwolone ścieżki względne w aplikacji (bez open redirect). */
export function sanitizeAppBridgeNext(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/")) return null;
  if (trimmed.startsWith("//")) return null;
  if (trimmed.includes("://")) return null;
  if (trimmed.includes("\\")) return null;
  if (trimmed.length > 512) return null;
  return trimmed;
}

export async function createAppBridgeTicket(userId: number, nextPath: string): Promise<string> {
  return new SignJWT({ typ: BRIDGE_TYP, next: nextPath })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(userId))
    .setIssuedAt()
    .setExpirationTime("2m")
    .sign(getAuthSecretKey());
}

export async function verifyAppBridgeTicket(
  ticket: string
): Promise<{ userId: number; nextPath: string } | null> {
  try {
    const { payload } = await jwtVerify(ticket, getAuthSecretKey());
    if (payload.typ !== BRIDGE_TYP) return null;
    const userId = Number(payload.sub);
    if (!Number.isFinite(userId) || userId <= 0) return null;
    const nextPath = sanitizeAppBridgeNext(payload.next);
    if (!nextPath) return null;
    return { userId, nextPath };
  } catch {
    return null;
  }
}
