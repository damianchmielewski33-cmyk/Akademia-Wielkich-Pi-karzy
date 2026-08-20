import { createHash, randomBytes, randomInt } from "node:crypto";
import type { AppDb } from "@/lib/db";
import { hashPin, isWeakPin } from "@/lib/pin";

export const MARKETPLACE_GUEST_ALIAS_PREFIX = "rezerwacja";
export const PARTNER_ALIAS_PREFIX = "partner";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function splitPersonName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "Gracz", lastName: "Rezerwacja" };
  if (parts.length === 1) return { firstName: parts[0]!, lastName: "Rezerwacja" };
  return { firstName: parts[0]!, lastName: parts.slice(1).join(" ") };
}

function aliasFromEmail(email: string, prefix: string): string {
  const hash = createHash("sha256").update(email).digest("hex").slice(0, 10);
  return `${prefix}-${hash}`;
}

export function randomNonWeakPin(): string {
  for (let i = 0; i < 40; i++) {
    const pin = String(randomInt(100000, 1000000));
    if (!isWeakPin(pin)) return pin;
  }
  return `48${randomInt(10, 100)}${randomInt(10, 100)}`;
}

async function uniqueAlias(db: AppDb, base: string): Promise<string> {
  const root = base.slice(0, 100);
  for (let i = 0; i < 50; i++) {
    const alias = i === 0 ? root : `${root.slice(0, 90)}-${i + 1}`;
    const exists = await db.prepare("SELECT id FROM users WHERE player_alias = ?").get(alias);
    if (!exists) return alias;
  }
  return `${root.slice(0, 80)}-${randomBytes(3).toString("hex")}`;
}

export async function findUserIdByEmail(db: AppDb, email: string): Promise<number | null> {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  const row = await db
    .prepare("SELECT id FROM users WHERE email IS NOT NULL AND LOWER(TRIM(email)) = ? LIMIT 1")
    .get<{ id: number }>(normalized);
  return row?.id ?? null;
}

export async function findMarketplaceGuestIdByEmail(db: AppDb, email: string): Promise<number | null> {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  const row = await db
    .prepare(
      `SELECT id FROM users
       WHERE email IS NOT NULL AND LOWER(TRIM(email)) = ?
         AND player_alias LIKE ?
         AND COALESCE(is_admin, 0) = 0
       LIMIT 1`
    )
    .get<{ id: number }>(normalized, `${MARKETPLACE_GUEST_ALIAS_PREFIX}-%`);
  return row?.id ?? null;
}

/**
 * Konto pod rezerwację marketplace: bez logowania PIN-em akademii.
 * Nigdy nie wiąże gościa z istniejącym kontem akademii/partnera po samym e-mailu.
 */
export async function ensureMarketplaceCustomer(
  db: AppDb,
  args: { name: string; email: string; phone?: string | null }
): Promise<{ userId: number; created: boolean }> {
  const email = normalizeEmail(args.email);
  if (!email) throw new Error("EMAIL_REQUIRED");
  const existingGuestId = await findMarketplaceGuestIdByEmail(db, email);
  if (existingGuestId) {
    const { firstName, lastName } = splitPersonName(args.name);
    await db
      .prepare(
        `UPDATE users
         SET first_name = CASE WHEN TRIM(first_name) = '' THEN ? ELSE first_name END,
             last_name = CASE WHEN TRIM(last_name) = '' THEN ? ELSE last_name END
         WHERE id = ?`
      )
      .run(firstName, lastName, existingGuestId);
    return { userId: existingGuestId, created: false };
  }

  const { firstName, lastName } = splitPersonName(args.name);
  const alias = await uniqueAlias(db, aliasFromEmail(email, MARKETPLACE_GUEST_ALIAS_PREFIX));
  const pinHash = await hashPin(randomNonWeakPin());
  const inserted = await db
    .prepare(
      `INSERT INTO users (first_name, last_name, player_alias, is_admin, email, pin_hash)
       VALUES (?, ?, ?, 0, ?, ?)`
    )
    .run(firstName, lastName, alias, email, pinHash);
  return { userId: Number(inserted.lastInsertRowid), created: true };
}

export async function ensurePartnerUser(
  db: AppDb,
  args: { name: string; email: string }
): Promise<{ userId: number; created: boolean; alias: string; needsPinSetup: boolean }> {
  const email = normalizeEmail(args.email);
  const existingId = await findUserIdByEmail(db, email);
  if (existingId) {
    const row = await db
      .prepare("SELECT player_alias, pin_hash FROM users WHERE id = ?")
      .get<{ player_alias: string; pin_hash: string | null }>(existingId);
    return {
      userId: existingId,
      created: false,
      alias: row?.player_alias ?? "",
      needsPinSetup: !row?.pin_hash,
    };
  }

  const { firstName, lastName } = splitPersonName(args.name);
  const alias = await uniqueAlias(db, aliasFromEmail(email, PARTNER_ALIAS_PREFIX));
  const inserted = await db
    .prepare(
      `INSERT INTO users (first_name, last_name, player_alias, is_admin, email, pin_hash)
       VALUES (?, ?, ?, 0, ?, NULL)`
    )
    .run(firstName, lastName, alias, email);
  return { userId: Number(inserted.lastInsertRowid), created: true, alias, needsPinSetup: true };
}

export { splitPersonName, normalizeEmail };
