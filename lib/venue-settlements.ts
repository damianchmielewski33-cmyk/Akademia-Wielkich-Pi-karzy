import type { AppDb } from "@/lib/db";

export const DEFAULT_VENUE_COMMISSION_PCT = 15;

export type VenuePayoutStatus = "pending" | "paid";

export type VenuePayoutRow = {
  id: number;
  venue_id: number;
  venue_name?: string;
  gross_pln: number;
  platform_fee_pln: number;
  owner_payout_pln: number;
  booking_count: number;
  status: VenuePayoutStatus;
  note: string | null;
  created_by_admin_id: number;
  created_at: string;
  paid_at: string | null;
  paid_by_admin_id: number | null;
};

export type SettlementLine = {
  booking_id: number;
  booking_date: string;
  start_time: string;
  end_time: string;
  pitch_name: string;
  venue_id: number;
  venue_name: string;
  amount_pln: number;
  platform_fee_pln: number;
  owner_payout_pln: number;
  commission_pct: number;
};

type CandidateRow = {
  id: number;
  booking_date: string;
  start_time: string;
  end_time: string;
  amount_pln: number;
  platform_fee_pln: number | null;
  owner_payout_pln: number | null;
  pitch_name: string;
  venue_id: number;
  venue_name: string;
  commission_pct: number;
  paid_ok: number;
};

export const VENUE_PAYOUTS_SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS venue_payouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    venue_id INTEGER NOT NULL,
    gross_pln REAL NOT NULL,
    platform_fee_pln REAL NOT NULL,
    owner_payout_pln REAL NOT NULL,
    booking_count INTEGER NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending','paid')) DEFAULT 'pending',
    note TEXT,
    created_by_admin_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    paid_at TEXT,
    paid_by_admin_id INTEGER,
    FOREIGN KEY (venue_id) REFERENCES venues(id),
    FOREIGN KEY (created_by_admin_id) REFERENCES users(id),
    FOREIGN KEY (paid_by_admin_id) REFERENCES users(id)
  );
  CREATE INDEX IF NOT EXISTS idx_venue_payouts_venue_created ON venue_payouts(venue_id, created_at);
`;

export const BOOKINGS_PAYOUT_INDEX_SQL =
  "CREATE INDEX IF NOT EXISTS idx_bookings_payout ON bookings(payout_id)";

export const SETTLEMENT_COLUMN_ALTERS: Array<{ table: "venues" | "bookings"; column: string; ddl: string }> = [
  {
    table: "venues",
    column: "commission_pct",
    ddl: "ALTER TABLE venues ADD COLUMN commission_pct REAL NOT NULL DEFAULT 15",
  },
  {
    table: "bookings",
    column: "platform_fee_pln",
    ddl: "ALTER TABLE bookings ADD COLUMN platform_fee_pln REAL",
  },
  {
    table: "bookings",
    column: "owner_payout_pln",
    ddl: "ALTER TABLE bookings ADD COLUMN owner_payout_pln REAL",
  },
  {
    table: "bookings",
    column: "payout_id",
    ddl: "ALTER TABLE bookings ADD COLUMN payout_id INTEGER",
  },
];

function roundPln(n: number): number {
  return Math.round(n * 100) / 100;
}

export function clampVenueCommissionPct(raw: number): number {
  if (!Number.isFinite(raw)) return DEFAULT_VENUE_COMMISSION_PCT;
  return Math.round(Math.max(0, Math.min(50, raw)) * 1000) / 1000;
}

export function splitBookingAmount(amountPln: number, commissionPct = DEFAULT_VENUE_COMMISSION_PCT) {
  const amount = roundPln(Math.max(0, amountPln));
  const pct = clampVenueCommissionPct(commissionPct);
  const platform_fee_pln = roundPln((amount * pct) / 100);
  const owner_payout_pln = roundPln(amount - platform_fee_pln);
  return { amount_pln: amount, platform_fee_pln, owner_payout_pln, commission_pct: pct };
}

function slotStartMs(date: string, startTime: string): number {
  const d = new Date(`${date}T${startTime.length === 5 ? startTime : startTime.slice(0, 5)}:00`);
  return d.getTime();
}

export async function ensureSettlementSchema(db: AppDb): Promise<void> {
  await db.exec(VENUE_PAYOUTS_SCHEMA_SQL);
  for (const alter of SETTLEMENT_COLUMN_ALTERS) {
    const cols = await db.prepare(`PRAGMA table_info(${alter.table})`).all<{ name: string }>();
    if (cols.length > 0 && !cols.some((c) => c.name === alter.column)) {
      await db.exec(alter.ddl);
    }
  }
  await db.exec(BOOKINGS_PAYOUT_INDEX_SQL);
}

function resolvedFees(row: Pick<CandidateRow, "amount_pln" | "platform_fee_pln" | "owner_payout_pln" | "commission_pct">) {
  if (row.platform_fee_pln != null && row.owner_payout_pln != null) {
    return {
      platform_fee_pln: roundPln(Number(row.platform_fee_pln)),
      owner_payout_pln: roundPln(Number(row.owner_payout_pln)),
      commission_pct: clampVenueCommissionPct(Number(row.commission_pct)),
    };
  }
  return splitBookingAmount(Number(row.amount_pln), Number(row.commission_pct));
}

async function listCandidates(
  db: AppDb,
  filters?: { venueId?: number; ownerUserId?: number }
): Promise<CandidateRow[]> {
  const where = ["b.status = 'confirmed'", "b.payout_id IS NULL"];
  const params: unknown[] = [];
  if (filters?.venueId != null) {
    where.push("v.id = ?");
    params.push(filters.venueId);
  }
  if (filters?.ownerUserId != null) {
    where.push("v.owner_user_id = ?");
    params.push(filters.ownerUserId);
  }
  return db
    .prepare(
      `SELECT b.id, b.booking_date, b.start_time, b.end_time, b.amount_pln,
              b.platform_fee_pln, b.owner_payout_pln,
              p.name AS pitch_name, v.id AS venue_id, v.name AS venue_name,
              COALESCE(v.commission_pct, ${DEFAULT_VENUE_COMMISSION_PCT}) AS commission_pct,
              CASE
                WHEN EXISTS (
                  SELECT 1 FROM booking_payments bp
                  WHERE bp.booking_id = b.id AND bp.status = 'success'
                ) THEN 1
                WHEN NOT EXISTS (SELECT 1 FROM booking_payments bp WHERE bp.booking_id = b.id) THEN 1
                ELSE 0
              END AS paid_ok
       FROM bookings b
       JOIN pitches p ON p.id = b.pitch_id
       JOIN venues v ON v.id = p.venue_id
       WHERE ${where.join(" AND ")}
       ORDER BY b.booking_date, b.start_time, b.id`
    )
    .all<CandidateRow>(...params);
}

export function isBookingEligibleForPayout(
  row: Pick<CandidateRow, "booking_date" | "start_time" | "paid_ok" | "amount_pln" | "platform_fee_pln" | "owner_payout_pln" | "commission_pct">,
  now = new Date()
): boolean {
  if (!row.paid_ok) return false;
  const start = slotStartMs(row.booking_date, row.start_time);
  if (Number.isNaN(start) || start > now.getTime()) return false;
  return resolvedFees(row).owner_payout_pln > 0;
}

async function eligibleLines(
  db: AppDb,
  filters?: { venueId?: number; ownerUserId?: number },
  now = new Date()
): Promise<SettlementLine[]> {
  const rows = await listCandidates(db, filters);
  return rows
    .filter((row) => isBookingEligibleForPayout(row, now))
    .map((row) => {
      const fees = resolvedFees(row);
      return {
        booking_id: row.id,
        booking_date: row.booking_date,
        start_time: row.start_time,
        end_time: row.end_time,
        pitch_name: row.pitch_name,
        venue_id: row.venue_id,
        venue_name: row.venue_name,
        amount_pln: roundPln(Number(row.amount_pln)),
        platform_fee_pln: fees.platform_fee_pln,
        owner_payout_pln: fees.owner_payout_pln,
        commission_pct: fees.commission_pct,
      };
    });
}

export async function listPayouts(
  db: AppDb,
  filters?: { venueId?: number; ownerUserId?: number }
): Promise<VenuePayoutRow[]> {
  const where: string[] = [];
  const params: unknown[] = [];
  if (filters?.venueId != null) {
    where.push("p.venue_id = ?");
    params.push(filters.venueId);
  }
  if (filters?.ownerUserId != null) {
    where.push("v.owner_user_id = ?");
    params.push(filters.ownerUserId);
  }
  const sqlWhere = where.length ? `WHERE ${where.join(" AND ")}` : "";
  return db
    .prepare(
      `SELECT p.*, v.name AS venue_name
       FROM venue_payouts p
       JOIN venues v ON v.id = p.venue_id
       ${sqlWhere}
       ORDER BY p.created_at DESC, p.id DESC`
    )
    .all<VenuePayoutRow>(...params);
}

export async function getPartnerSettlement(db: AppDb, ownerUserId: number, now = new Date()) {
  const pending = await eligibleLines(db, { ownerUserId }, now);
  const payouts = await listPayouts(db, { ownerUserId });
  return {
    pending: {
      booking_count: pending.length,
      gross_pln: roundPln(pending.reduce((sum, line) => sum + line.amount_pln, 0)),
      platform_fee_pln: roundPln(pending.reduce((sum, line) => sum + line.platform_fee_pln, 0)),
      owner_payout_pln: roundPln(pending.reduce((sum, line) => sum + line.owner_payout_pln, 0)),
      lines: pending,
    },
    payouts,
  };
}

export async function getAdminSettlementOverview(db: AppDb, now = new Date()) {
  const pending = await eligibleLines(db, undefined, now);
  const byVenue = new Map<
    number,
    {
      venue_id: number;
      venue_name: string;
      pending_count: number;
      pending_gross_pln: number;
      pending_fee_pln: number;
      pending_owner_pln: number;
    }
  >();
  for (const line of pending) {
    const current = byVenue.get(line.venue_id) ?? {
      venue_id: line.venue_id,
      venue_name: line.venue_name,
      pending_count: 0,
      pending_gross_pln: 0,
      pending_fee_pln: 0,
      pending_owner_pln: 0,
    };
    current.pending_count += 1;
    current.pending_gross_pln = roundPln(current.pending_gross_pln + line.amount_pln);
    current.pending_fee_pln = roundPln(current.pending_fee_pln + line.platform_fee_pln);
    current.pending_owner_pln = roundPln(current.pending_owner_pln + line.owner_payout_pln);
    byVenue.set(line.venue_id, current);
  }
  const venues = await db
    .prepare(
      `SELECT id, name, COALESCE(commission_pct, ${DEFAULT_VENUE_COMMISSION_PCT}) AS commission_pct, owner_user_id
       FROM venues
       ORDER BY name`
    )
    .all<{ id: number; name: string; commission_pct: number; owner_user_id: number | null }>();
  return {
    venues: venues.map((venue) => {
      const pendingRow = byVenue.get(venue.id);
      return {
        venue_id: venue.id,
        venue_name: venue.name,
        commission_pct: clampVenueCommissionPct(Number(venue.commission_pct)),
        owner_user_id: venue.owner_user_id,
        pending_count: pendingRow?.pending_count ?? 0,
        pending_gross_pln: pendingRow?.pending_gross_pln ?? 0,
        pending_fee_pln: pendingRow?.pending_fee_pln ?? 0,
        pending_owner_pln: pendingRow?.pending_owner_pln ?? 0,
      };
    }),
    payouts: await listPayouts(db),
  };
}

export async function createVenuePayout(
  db: AppDb,
  args: { venueId: number; adminUserId: number; note?: string | null; now?: Date }
): Promise<{ ok: true; payout: VenuePayoutRow } | { ok: false; error: string }> {
  const lines = await eligibleLines(db, { venueId: args.venueId }, args.now ?? new Date());
  if (lines.length === 0) {
    return { ok: false, error: "Brak rozegranych, opłaconych rezerwacji do wypłaty." };
  }
  const gross = roundPln(lines.reduce((sum, line) => sum + line.amount_pln, 0));
  const fee = roundPln(lines.reduce((sum, line) => sum + line.platform_fee_pln, 0));
  const owner = roundPln(lines.reduce((sum, line) => sum + line.owner_payout_pln, 0));

  const run = async (tx: AppDb) => {
    const inserted = await tx
      .prepare(
        `INSERT INTO venue_payouts
          (venue_id, gross_pln, platform_fee_pln, owner_payout_pln, booking_count, status, note, created_by_admin_id)
         VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`
      )
      .run(args.venueId, gross, fee, owner, lines.length, args.note?.trim() || null, args.adminUserId);
    const payoutId = Number(inserted.lastInsertRowid);
    for (const line of lines) {
      await tx
        .prepare(
          `UPDATE bookings
           SET platform_fee_pln = ?, owner_payout_pln = ?, payout_id = ?, updated_at = datetime('now')
           WHERE id = ? AND payout_id IS NULL AND status = 'confirmed'`
        )
        .run(line.platform_fee_pln, line.owner_payout_pln, payoutId, line.booking_id);
    }
    const payout = await tx
      .prepare(
        `SELECT p.*, v.name AS venue_name
         FROM venue_payouts p
         JOIN venues v ON v.id = p.venue_id
         WHERE p.id = ?`
      )
      .get<VenuePayoutRow>(payoutId);
    if (!payout) throw new Error("PAYOUT_INSERT_FAILED");
    return payout;
  };

  const payout = db.transaction ? await db.transaction(run) : await run(db);
  return { ok: true, payout };
}

export async function markVenuePayoutPaid(
  db: AppDb,
  args: { payoutId: number; adminUserId: number }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const payout = await db
    .prepare("SELECT id, status FROM venue_payouts WHERE id = ?")
    .get<{ id: number; status: string }>(args.payoutId);
  if (!payout) return { ok: false, error: "Nie znaleziono wypłaty." };
  if (payout.status === "paid") return { ok: true };
  const result = await db
    .prepare(
      `UPDATE venue_payouts
       SET status = 'paid', paid_at = datetime('now'), paid_by_admin_id = ?
       WHERE id = ? AND status = 'pending'`
    )
    .run(args.adminUserId, args.payoutId);
  if (result.changes === 0) return { ok: false, error: "Tej wypłaty nie da się oznaczyć." };
  return { ok: true };
}

export async function bookingIsInPayout(db: AppDb, bookingId: number): Promise<boolean> {
  const row = await db
    .prepare("SELECT payout_id FROM bookings WHERE id = ?")
    .get<{ payout_id: number | null }>(bookingId);
  return row?.payout_id != null;
}
