import { createHmac, randomBytes, randomInt, timingSafeEqual } from "crypto";
import bcrypt from "bcryptjs";
import { isMailConfigured, sendMail } from "@/lib/mail";
import { hashPin } from "@/lib/pin";
import { getAppSettings } from "@/lib/app-settings";
import { parseRealm, REALMS, type Realm } from "@/lib/realm";

const BCRYPT_ROUNDS = 10;
const CODE_TTL_MS = 15 * 60 * 1000;
const CODE_DIGITS = 6;

export const PASSWORD_MIN_LEN = 8;
export const WEAK_PASSWORD_MESSAGE = "Hasło musi mieć co najmniej 8 znaków.";

/** Testowy kod z maila — poza produkcją dla wszystkich; na produkcji tylko dla admina. */
export const MOCK_EMAIL_AUTH_CODE = "123456";

export function isEmailAuthMockCodeAllowed(isAdmin = false): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  return isAdmin === true;
}

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidPassword(password: string): boolean {
  return password.length >= PASSWORD_MIN_LEN && password.length <= 200;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, passwordHash: string | null | undefined): Promise<boolean> {
  if (!passwordHash) return false;
  try {
    return await bcrypt.compare(password, passwordHash);
  } catch {
    return false;
  }
}

export async function hashPlaceholderPin(): Promise<string> {
  return hashPin(randomBytes(24).toString("hex"));
}

function codeHmacSecret(): string {
  return process.env.AUTH_SECRET?.trim() || "email-auth-code";
}

/** Kod jest zawsze związany z adresem e-mail — nie da się go użyć przy innym mailu. */
export function hashEmailAuthCode(code: string, email: string): string {
  const payload = `${code.trim()}:${normalizeEmail(email)}`;
  return createHmac("sha256", codeHmacSecret()).update(payload).digest("hex");
}

export function emailAuthCodesMatch(
  code: string,
  email: string,
  storedHash: string | null | undefined
): boolean {
  if (!storedHash) return false;
  const a = Buffer.from(hashEmailAuthCode(code, email), "hex");
  const b = Buffer.from(storedHash, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Walidacja kodu z maila — uwzględnia mock `123456` (dev / admin na produkcji). */
export function isEmailAuthCodeValid(
  code: string,
  email: string,
  storedHash: string | null | undefined,
  expiresAt: number | null | undefined,
  opts?: { isAdmin?: boolean }
): boolean {
  if (isEmailAuthMockCodeAllowed(opts?.isAdmin === true) && code.trim() === MOCK_EMAIL_AUTH_CODE) {
    return true;
  }
  if (isEmailAuthCodeExpired(expiresAt)) return false;
  return emailAuthCodesMatch(code, email, storedHash);
}

export function generateEmailAuthCode(): string {
  return String(randomInt(0, 10 ** CODE_DIGITS)).padStart(CODE_DIGITS, "0");
}

export function emailAuthCodeExpiresAt(now = Date.now()): number {
  return now + CODE_TTL_MS;
}

export function isEmailAuthCodeExpired(expiresAt: number | null | undefined, now = Date.now()): boolean {
  if (expiresAt == null || !Number.isFinite(expiresAt)) return true;
  return now > expiresAt;
}

export type EmailAuthUserFields = {
  password_hash?: string | null;
  email_verified?: number | null;
  email?: string | null;
  is_admin?: number | null;
};

export function userNeedsEmailAuthSetup(user: EmailAuthUserFields, featureEnabled: boolean): boolean {
  if (!featureEnabled) return false;
  if (user.is_admin === 1) return false;
  const verified = user.email_verified === 1;
  const hasPassword = Boolean(user.password_hash);
  const hasEmail = Boolean(user.email?.trim());
  return !verified || !hasPassword || !hasEmail;
}

/** PIN tylko dla kont, które jeszcze nie mają zweryfikowanego e-maila i hasła (oraz dla admina). */
export function userCanLoginWithPin(user: EmailAuthUserFields, featureEnabled: boolean): boolean {
  if (!featureEnabled) return true;
  if (user.is_admin === 1) return true;
  return userNeedsEmailAuthSetup(user, true);
}

export async function isEmailPasswordAuthEnabled(
  db: Parameters<typeof getAppSettings>[0],
  realm: Realm = REALMS.ACADEMY
): Promise<boolean> {
  const settings = await getAppSettings(db, parseRealm(realm, REALMS.ACADEMY));
  return settings.email_password_auth_enabled === true;
}

type DbCodeWrite = {
  prepare: (sql: string) => { run: (...args: unknown[]) => Promise<unknown> | unknown };
};

export async function storeEmailAuthCode(
  db: DbCodeWrite,
  userId: number,
  code: string,
  email: string
): Promise<void> {
  const hash = hashEmailAuthCode(code, email);
  const expires = emailAuthCodeExpiresAt();
  await db
    .prepare("UPDATE users SET email_auth_code_hash = ?, email_auth_code_expires = ? WHERE id = ?")
    .run(hash, expires, userId);
}

export async function clearEmailAuthCode(db: DbCodeWrite, userId: number): Promise<void> {
  await db
    .prepare("UPDATE users SET email_auth_code_hash = NULL, email_auth_code_expires = NULL WHERE id = ?")
    .run(userId);
}

export async function sendEmailAuthCodeMail(
  to: string,
  code: string,
  purpose: "verify" | "reset" = "verify"
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isMailConfigured()) {
    return {
      ok: false,
      error:
        "Wysyłka e-mail nie jest skonfigurowana na serwerze. Administrator musi ustawić SMTP, zanim włączysz logowanie mailem.",
    };
  }
  const isReset = purpose === "reset";
  const subject = isReset
    ? "Reset hasła — Akademia Wielkich Piłkarzy"
    : "Kod uwierzytelniający — Akademia Wielkich Piłkarzy";
  const action = isReset
    ? "zresetować hasło"
    : "dokończyć rejestrację lub potwierdzić adres e-mail";
  try {
    await sendMail({
      to,
      subject,
      text: `Twój kod: ${code}\n\nWpisz go w aplikacji, aby ${action}.\nKod jest ważny 15 minut.\n\nJeśli nie prosiłeś o tę wiadomość, zignoruj ją.`,
      html: `<p>Twój kod:</p><p style="font-size:28px;letter-spacing:0.2em;font-weight:700">${code}</p><p>Wpisz go w aplikacji, aby ${action}. Kod jest ważny 15 minut.</p><p>Jeśli nie prosiłeś o tę wiadomość, zignoruj ją.</p>`,
    });
    return { ok: true };
  } catch (e) {
    console.error("[email-auth] sendMail failed", e);
    return { ok: false, error: "Nie udało się wysłać kodu na e-mail. Spróbuj ponownie za chwilę." };
  }
}

export async function issueEmailAuthCode(
  db: DbCodeWrite,
  userId: number,
  email: string,
  purpose: "verify" | "reset" = "verify",
  opts?: { isAdmin?: boolean }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const mockAllowed = isEmailAuthMockCodeAllowed(opts?.isAdmin === true);
  const code = mockAllowed ? MOCK_EMAIL_AUTH_CODE : generateEmailAuthCode();
  const sent = await sendEmailAuthCodeMail(email, code, purpose);
  if (!sent.ok) {
    // Bez SMTP (albo mock admina na produkcji) i tak zapisujemy mockowy kod.
    if (mockAllowed) {
      await storeEmailAuthCode(db, userId, MOCK_EMAIL_AUTH_CODE, email);
      return { ok: true };
    }
    return sent;
  }
  await storeEmailAuthCode(db, userId, code, email);
  return { ok: true };
}
