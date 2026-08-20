import { randomBytes } from "node:crypto";
import type { AppDb } from "@/lib/db";

export type PartnerInvite = {
  id: number;
  token: string;
  label: string | null;
  created_by_admin_id: number;
  claimed_user_id: number | null;
  created_at: string;
  expires_at: string | null;
  revoked_at: string | null;
  claimed_at: string | null;
  claimed_name?: string | null;
};

const TOKEN_BYTES = 24;

export async function isVenuePartner(db: AppDb, userId: number): Promise<boolean> {
  try {
    const row = await db
      .prepare("SELECT user_id FROM venue_partners WHERE user_id = ? AND revoked_at IS NULL")
      .get<{ user_id: number }>(userId);
    return Boolean(row);
  } catch {
    return false;
  }
}

export async function userOwnsVenue(db: AppDb, userId: number, venueId: number): Promise<boolean> {
  const row = await db
    .prepare("SELECT id FROM venues WHERE id = ? AND owner_user_id = ?")
    .get<{ id: number }>(venueId, userId);
  return Boolean(row);
}

export async function userOwnsPitch(db: AppDb, userId: number, pitchId: number): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT p.id FROM pitches p
       JOIN venues v ON v.id = p.venue_id
       WHERE p.id = ? AND v.owner_user_id = ?`
    )
    .get<{ id: number }>(pitchId, userId);
  return Boolean(row);
}

export async function userOwnsBooking(db: AppDb, userId: number, bookingId: number): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT b.id FROM bookings b
       JOIN pitches p ON p.id = b.pitch_id
       JOIN venues v ON v.id = p.venue_id
       WHERE b.id = ? AND v.owner_user_id = ?`
    )
    .get<{ id: number }>(bookingId, userId);
  return Boolean(row);
}

export function inviteStatus(invite: Pick<PartnerInvite, "revoked_at" | "expires_at" | "claimed_user_id">) {
  if (invite.revoked_at) return "revoked" as const;
  if (invite.expires_at && new Date(invite.expires_at).getTime() <= Date.now()) return "expired" as const;
  if (invite.claimed_user_id) return "claimed" as const;
  return "open" as const;
}

export async function createPartnerInvite(
  db: AppDb,
  args: { adminUserId: number; label?: string | null; daysValid?: number }
): Promise<PartnerInvite> {
  const token = randomBytes(TOKEN_BYTES).toString("hex");
  const days = args.daysValid && args.daysValid > 0 ? args.daysValid : 30;
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  const result = await db
    .prepare(
      `INSERT INTO venue_partner_invites (token, label, created_by_admin_id, expires_at)
       VALUES (?, ?, ?, ?)`
    )
    .run(token, args.label?.trim() || null, args.adminUserId, expires);
  const invite = await db
    .prepare("SELECT * FROM venue_partner_invites WHERE id = ?")
    .get<PartnerInvite>(Number(result.lastInsertRowid));
  if (!invite) throw new Error("INVITE_INSERT_FAILED");
  return invite;
}

export async function listPartnerInvites(db: AppDb): Promise<PartnerInvite[]> {
  return db
    .prepare(
      `SELECT i.*, TRIM(u.first_name || ' ' || u.last_name) AS claimed_name
       FROM venue_partner_invites i
       LEFT JOIN users u ON u.id = i.claimed_user_id
       ORDER BY i.created_at DESC, i.id DESC`
    )
    .all<PartnerInvite>();
}

export async function getPartnerInviteByToken(db: AppDb, token: string): Promise<PartnerInvite | null> {
  const invite = await db
    .prepare("SELECT * FROM venue_partner_invites WHERE token = ?")
    .get<PartnerInvite>(token.trim());
  return invite ?? null;
}

export async function revokePartnerInvite(db: AppDb, inviteId: number): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE venue_partner_invites
       SET revoked_at = datetime('now')
       WHERE id = ? AND revoked_at IS NULL`
    )
    .run(inviteId);
  const invite = await db
    .prepare("SELECT claimed_user_id FROM venue_partner_invites WHERE id = ?")
    .get<{ claimed_user_id: number | null }>(inviteId);
  if (invite?.claimed_user_id) {
    await db
      .prepare("UPDATE venue_partners SET revoked_at = datetime('now') WHERE user_id = ? AND revoked_at IS NULL")
      .run(invite.claimed_user_id);
  }
  return result.changes > 0;
}

export async function claimPartnerInvite(
  db: AppDb,
  args: { token: string; userId: number }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const invite = await getPartnerInviteByToken(db, args.token);
  if (!invite) return { ok: false, error: "Nie znaleziono zaproszenia." };
  const status = inviteStatus(invite);
  if (status === "revoked") return { ok: false, error: "To zaproszenie zostało unieważnione." };
  if (status === "expired") return { ok: false, error: "To zaproszenie wygasło. Poproś akademię o nowy link." };
  if (status === "claimed" && invite.claimed_user_id !== args.userId) {
    return { ok: false, error: "To zaproszenie zostało już wykorzystane." };
  }

  if (status === "open") {
    await db
      .prepare(
        `UPDATE venue_partner_invites
         SET claimed_user_id = ?, claimed_at = datetime('now')
         WHERE id = ? AND claimed_user_id IS NULL`
      )
      .run(args.userId, invite.id);
  }

  await grantVenuePartner(db, args.userId, invite.id);

  return { ok: true };
}

export async function grantVenuePartner(
  db: AppDb,
  userId: number,
  inviteId: number | null = null
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO venue_partners (user_id, invite_id, revoked_at)
       VALUES (?, ?, NULL)
       ON CONFLICT(user_id) DO UPDATE SET
         invite_id = COALESCE(excluded.invite_id, venue_partners.invite_id),
         revoked_at = NULL`
    )
    .run(userId, inviteId);
}
