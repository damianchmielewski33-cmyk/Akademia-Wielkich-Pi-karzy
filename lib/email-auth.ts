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

export function hashEmailAuthCode(code: string): string {
  return createHmac("sha256", codeHmacSecret()).update(code.trim()).digest("hex");
}

export function emailAuthCodesMatch(code: string, storedHash: string | null | undefined): boolean {
  if (!storedHash) return false;
  const a = Buffer.from(hashEmailAuthCode(code), "hex");
  const b = Buffer.from(storedHash, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
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

export async function storeEmailAuthCode(db: DbCodeWrite, userId: number, code: string): Promise<void> {
  const hash = hashEmailAuthCode(code);
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

export async function sendEmailAuthCodeMail(to: string, code: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isMailConfigured()) {
    return {
      ok: false,
      error:
        "Wysyłka e-mail nie jest skonfigurowana na serwerze. Administrator musi ustawić SMTP, zanim włączysz logowanie mailem.",
    };
  }
  try {
    await sendMail({
      to,
      subject: "Kod uwierzytelniający — Akademia Wielkich Piłkarzy",
      text: `Twój kod uwierzytelniający: ${code}\n\nWpisz go w aplikacji, aby dokończyć rejestrację lub potwierdzić adres e-mail.\nKod jest ważny 15 minut.\n\nJeśli nie zakładałeś konta, zignoruj tę wiadomość.`,
      html: `<p>Twój kod uwierzytelniający:</p><p style="font-size:28px;letter-spacing:0.2em;font-weight:700">${code}</p><p>Wpisz go w aplikacji, aby dokończyć rejestrację lub potwierdzić adres e-mail. Kod jest ważny 15 minut.</p><p>Jeśli nie zakładałeś konta, zignoruj tę wiadomość.</p>`,
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
  email: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const code = generateEmailAuthCode();
  const sent = await sendEmailAuthCodeMail(email, code);
  if (!sent.ok) return sent;
  await storeEmailAuthCode(db, userId, code);
  return { ok: true };
}
