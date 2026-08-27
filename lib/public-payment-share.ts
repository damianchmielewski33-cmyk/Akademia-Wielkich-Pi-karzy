import { getDb } from "@/lib/db";
import { getAppSettings } from "@/lib/app-settings";
import { MATCH_PREPAYMENT_PLN, perPersonMatchFeePln } from "@/lib/match-fee";

export type PublicShareLinkRow = {
  token: string;
  kind: "last_match_wallets" | "all_wallets" | "match_wallets" | "player_wallets" | "match_signup_fees";
  created_at: string;
  expires_at: string | null;
  revoked_at: string | null;
  match_id: number | null;
  user_id: number | null;
};

export type PublicWalletPlayerRow = {
  id: number;
  first_name: string;
  last_name: string;
  zawodnik: string;
  profile_photo_path: string | null;
  balance_pln: number;
  match_charge_pln?: number | null;
  /** Status opłacenia wpisowego na meczu (match_signups.paid); 1 = opłacony. */
  match_paid?: number | null;
};

export async function loadPublicShareLink(token: string): Promise<PublicShareLinkRow | null> {
  const db = await getDb();
  const link = (await db
    .prepare(
      `SELECT token, kind, created_at, expires_at, revoked_at, match_id, user_id
       FROM public_share_links WHERE token = ?`
    )
    .get(String(token))) as PublicShareLinkRow | undefined;

  if (!link) return null;

  let notExpired = true;
  if (link.expires_at) {
    const r = (await db.prepare("SELECT datetime('now') <= datetime(?) AS ok").get(link.expires_at)) as
      | { ok: number }
      | undefined;
    notExpired = Number(r?.ok ?? 0) === 1;
  }

  if (link.revoked_at || !notExpired) return null;
  return link;
}

export type PublicWalletView = {
  title: string;
  subtitle: string;
  /** Link opłat składki za aktualne zapisy (BLIK na telefon / operator). */
  mode?: "wallets" | "signup_fees";
  contribution_pln?: number | null;
  blik_phone?: string | null;
  match: { id: number; match_date: string; match_time: string; location: string; fee_pln?: number | null } | null;
  rows: PublicWalletPlayerRow[];
  playerMatches?: Array<{
    id: number;
    match_date: string;
    match_time: string;
    location: string;
    fee_pln?: number | null;
    match_charge_pln: number | null;
  }>;
};

async function loadMatchWalletParticipantRows(matchId: number): Promise<PublicWalletPlayerRow[]> {
  const db = await getDb();
  return (await db
    .prepare(
      `SELECT u.id, u.first_name, u.last_name, u.player_alias AS zawodnik, u.profile_photo_path,
              COALESCE(ROUND(SUM(t.amount_pln), 2), 0) AS balance_pln,
              c.amount_pln AS match_charge_pln,
              COALESCE(ms.paid, 0) AS match_paid
       FROM (
         SELECT user_id FROM match_signups WHERE match_id = ? AND COALESCE(commitment, 1) = 1
         UNION
         SELECT user_id FROM match_wallet_charges WHERE match_id = ?
         UNION
         SELECT id AS user_id FROM users WHERE temporary_guest_match_id = ? AND COALESCE(is_temporary, 0) = 1
       ) participants
       JOIN users u ON u.id = participants.user_id
       LEFT JOIN wallet_transactions t ON t.user_id = u.id
       LEFT JOIN match_wallet_charges c ON c.match_id = ? AND c.user_id = u.id
       LEFT JOIN match_signups ms ON ms.match_id = ? AND ms.user_id = u.id
       GROUP BY u.id
       ORDER BY COALESCE(u.is_temporary, 0) DESC, u.first_name, u.last_name`
    )
    .all(matchId, matchId, matchId, matchId, matchId)) as PublicWalletPlayerRow[];
}

export async function loadPublicWalletRows(link: PublicShareLinkRow): Promise<PublicWalletView> {
  const db = await getDb();

  if (link.kind === "all_wallets") {
    const rows = (await db
      .prepare(
        `SELECT u.id, u.first_name, u.last_name, u.player_alias AS zawodnik, u.profile_photo_path,
                COALESCE(ROUND(SUM(t.amount_pln), 2), 0) AS balance_pln
         FROM users u
         LEFT JOIN wallet_transactions t ON t.user_id = u.id
         WHERE COALESCE(u.is_admin, 0) = 0
         GROUP BY u.id
         ORDER BY u.first_name, u.last_name`
      )
      .all()) as PublicWalletPlayerRow[];

    return {
      title: "Zbiorcze salda portfeli",
      subtitle: "Aktualne salda wszystkich zawodników",
      match: null,
      rows,
    };
  }

  if (link.kind === "match_signup_fees" && link.match_id) {
    return loadMatchSignupFeesView(link.match_id);
  }

  if (link.kind === "match_wallets" && link.match_id) {
    const match = (await db.prepare("SELECT * FROM matches WHERE id = ?").get(link.match_id)) as
      | { id: number; match_date: string; match_time: string; location: string; fee_pln?: number | null }
      | undefined;
    if (!match) return { title: "Mecz nie znaleziony", subtitle: "", match: null, rows: [] };

    const rows = await loadMatchWalletParticipantRows(link.match_id);

    return {
      title: "Podsumowanie płatności — mecz",
      subtitle: `${match.match_date} · ${match.match_time} · ${match.location}`,
      match,
      rows,
    };
  }

  if (link.kind === "player_wallets" && link.user_id) {
    const user = (await db
      .prepare("SELECT id, first_name, last_name, player_alias AS zawodnik, profile_photo_path FROM users WHERE id = ?")
      .get(link.user_id)) as
      | { id: number; first_name: string; last_name: string; zawodnik: string; profile_photo_path: string | null }
      | undefined;
    if (!user) return { title: "Zawodnik nie znaleziony", subtitle: "", match: null, rows: [] };

    const balanceRow = (await db
      .prepare("SELECT COALESCE(ROUND(SUM(amount_pln), 2), 0) AS balance_pln FROM wallet_transactions WHERE user_id = ?")
      .get(link.user_id)) as { balance_pln: number };

    const matchRows = (await db
      .prepare(
        `SELECT m.id, m.match_date, m.match_time, m.location, m.fee_pln, c.amount_pln AS match_charge_pln
         FROM match_signups ms
         JOIN matches m ON m.id = ms.match_id
         LEFT JOIN match_wallet_charges c ON c.match_id = m.id AND c.user_id = ms.user_id
         WHERE ms.user_id = ? AND COALESCE(ms.commitment, 1) = 1 AND m.played = 1
         ORDER BY m.match_date DESC, m.match_time DESC`
      )
      .all(link.user_id)) as Array<{
      id: number;
      match_date: string;
      match_time: string;
      location: string;
      fee_pln?: number | null;
      match_charge_pln: number | null;
    }>;

    return {
      title: `Portfel — ${user.first_name} ${user.last_name}`,
      subtitle: `Aktualne saldo portfela i historia rozegranych meczów`,
      match: null,
      rows: [
        {
          ...user,
          balance_pln: Number(balanceRow.balance_pln ?? 0),
        },
      ],
      playerMatches: matchRows,
    };
  }

  const lastMatch = (await db
    .prepare(
      `SELECT * FROM matches
       WHERE datetime(match_date || ' ' || match_time) <= datetime('now', 'localtime')
       ORDER BY match_date DESC, match_time DESC LIMIT 1`
    )
    .get()) as
    | { id: number; match_date: string; match_time: string; location: string; fee_pln?: number | null }
    | undefined;

  if (!lastMatch) {
    return { title: "Brak rozegranego meczu", subtitle: "", match: null, rows: [] };
  }

  const rows = await loadMatchWalletParticipantRows(lastMatch.id);

  return {
    title: "Portfele po ostatnim meczu",
    subtitle: `${lastMatch.match_date} · ${lastMatch.match_time} · ${lastMatch.location}`,
    match: lastMatch,
    rows,
  };
}

export function matchSignupContributionPln(feePln: number | null | undefined, signedUp: number): number {
  return perPersonMatchFeePln(feePln, signedUp) ?? MATCH_PREPAYMENT_PLN;
}

async function loadMatchSignupFeesView(matchId: number): Promise<PublicWalletView> {
  const db = await getDb();
  const match = (await db.prepare("SELECT * FROM matches WHERE id = ?").get(matchId)) as
    | { id: number; match_date: string; match_time: string; location: string; fee_pln?: number | null; signed_up: number }
    | undefined;
  if (!match) return { title: "Mecz nie znaleziony", subtitle: "", match: null, rows: [], mode: "signup_fees" };

  const settings = await getAppSettings(db);
  const contribution = matchSignupContributionPln(match.fee_pln, Number(match.signed_up) || 0);
  const rows = (await db
    .prepare(
      `SELECT u.id, u.first_name, u.last_name, u.player_alias AS zawodnik, u.profile_photo_path,
              0 AS balance_pln,
              COALESCE(ms.paid, 0) AS match_paid
       FROM match_signups ms
       JOIN users u ON u.id = ms.user_id
       WHERE ms.match_id = ? AND COALESCE(ms.commitment, 1) = 1
       ORDER BY COALESCE(u.is_temporary, 0) DESC, u.first_name, u.last_name`
    )
    .all(matchId)) as PublicWalletPlayerRow[];

  return {
    title: "Opłata składki za mecz",
    subtitle: `${match.match_date} · ${match.match_time} · ${match.location}`,
    mode: "signup_fees",
    contribution_pln: contribution,
    blik_phone: settings.blik_phone,
    match,
    rows,
  };
}

export async function createOrGetMatchSignupFeesLink(args: {
  matchId: number;
  adminId: number;
}): Promise<{ token: string; created: boolean }> {
  const db = await getDb();
  const existing = (await db
    .prepare(
      `SELECT token FROM public_share_links
       WHERE kind = 'match_signup_fees' AND match_id = ?
         AND revoked_at IS NULL
         AND (expires_at IS NULL OR datetime('now') <= datetime(expires_at))
       ORDER BY created_at DESC
       LIMIT 1`
    )
    .get(args.matchId)) as { token: string } | undefined;
  if (existing?.token) return { token: existing.token, created: false };

  const crypto = await import("crypto");
  const token = crypto.randomBytes(16).toString("hex");
  await db
    .prepare(
      `INSERT INTO public_share_links (token, kind, created_by_admin_id, expires_at, match_id, user_id)
       VALUES (?, 'match_signup_fees', ?, datetime('now', '+30 days'), ?, NULL)`
    )
    .run(token, args.adminId, args.matchId);
  return { token, created: true };
}

/**
 * Kwota zaległości (PLN > 0) gracza widocznego na publicznym linku, albo null gdy brak należności / poza listą.
 */
export async function getPublicLinkDebtAmountPln(
  link: PublicShareLinkRow,
  userId: number
): Promise<number | null> {
  const view = await loadPublicWalletRows(link);
  const row = view.rows.find((r) => Number(r.id) === Number(userId));
  if (!row) return null;
  const bal = Number(row.balance_pln ?? 0);
  if (!(bal < 0)) return null;
  return Math.round(Math.abs(bal) * 100) / 100;
}
