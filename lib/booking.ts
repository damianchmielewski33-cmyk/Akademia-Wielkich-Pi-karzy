import { randomBytes } from "node:crypto";
import type { AppDb } from "@/lib/db";
import { ensureSettlementSchema, splitBookingAmount, clampVenueCommissionPct } from "@/lib/venue-settlements";
import {
  BOOKING_FREE_CANCEL_HOURS,
  addMinutes,
  bookingCancelDeadline,
  normalizeTime,
  type AdminPitchRow,
  type AvailabilitySlot,
  type BookingRow,
  type PitchBlockPublic,
  type PitchOpeningHour,
  type PitchPriceRule,
  type PitchPublic,
  type PitchRow,
  type VenueCard,
  type VenueRow,
} from "@/lib/booking-shared";
import {
  BOOKING_GUEST_COLUMN_ALTERS,
  BOOKING_SCHEMA_SQL,
  BOOKINGS_ACCESS_TOKEN_INDEX_SQL,
  VENUES_OWNER_INDEX_SQL,
} from "@/lib/booking-schema";

export {
  BOOKING_FREE_CANCEL_HOURS,
  BOOKING_STATUSES,
  WEEKDAY_LABELS_PL,
  addMinutes,
  bookingCancelDeadline,
  bookingStartDate,
  formatPlDateTime,
  normalizeTime,
} from "@/lib/booking-shared";
export type {
  AdminPitchRow,
  AvailabilitySlot,
  BookingRow,
  BookingStatus,
  PitchBlockPublic,
  PitchOpeningHour,
  PitchPriceRule,
  PitchPublic,
  PitchRow,
  VenueCard,
  VenueRow,
} from "@/lib/booking-shared";
export {
  BOOKING_GUEST_COLUMN_ALTERS,
  BOOKING_SCHEMA_SQL,
  BOOKINGS_ACCESS_TOKEN_INDEX_SQL,
  VENUES_OWNER_INDEX_SQL,
} from "@/lib/booking-schema";

export function slugifyVenueName(name: string): string {
  return (
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 72) || "obiekt"
  );
}

export function weekdayForDate(ymd: string): number {
  const d = new Date(`${ymd}T12:00:00`);
  if (Number.isNaN(d.getTime())) throw new Error("INVALID_DATE");
  return d.getDay();
}

function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && aEnd > bStart;
}

export async function ensureBookingSchema(db: AppDb): Promise<void> {
  await db.exec(BOOKING_SCHEMA_SQL);
  const cols = await db.prepare("PRAGMA table_info(venues)").all<{ name: string }>();
  if (cols.length > 0 && !cols.some((c) => c.name === "owner_user_id")) {
    await db.exec("ALTER TABLE venues ADD COLUMN owner_user_id INTEGER");
  }
  await db.exec(VENUES_OWNER_INDEX_SQL);
  const bookingCols = await db.prepare("PRAGMA table_info(bookings)").all<{ name: string }>();
  for (const alter of BOOKING_GUEST_COLUMN_ALTERS) {
    if (bookingCols.length > 0 && !bookingCols.some((c) => c.name === alter.column)) {
      await db.exec(alter.ddl);
    }
  }
  await db.exec(BOOKINGS_ACCESS_TOKEN_INDEX_SQL);
  const { ensureVenueApplicationsSchema } = await import("@/lib/venue-applications");
  await ensureVenueApplicationsSchema(db);
  await ensureSettlementSchema(db);
}

export async function expireStaleBookings(db: AppDb): Promise<void> {
  await db
    .prepare(
      `UPDATE bookings
       SET status = 'expired', updated_at = datetime('now')
       WHERE status = 'pending' AND expires_at IS NOT NULL AND datetime(expires_at) <= datetime('now')`
    )
    .run();
}

export type VenueListFilters = {
  city?: string | null;
  query?: string | null;
  includeUnpublished?: boolean;
  surface?: string | null;
  indoor?: boolean | null;
  maxPrice?: number | null;
  date?: string | null;
  time?: string | null;
  ownerUserId?: number | null;
  limit?: number | null;
};

export async function listVenueCards(db: AppDb, filters?: VenueListFilters): Promise<VenueCard[]> {
  if (filters?.ownerUserId == null) {
    const { seedBookingCatalogIfEmpty } = await import("@/lib/booking-seed");
    await seedBookingCatalogIfEmpty(db);
  }
  const includeUnpublished = filters?.includeUnpublished === true;
  const city = filters?.city?.trim();
  const query = filters?.query?.trim();
  const surface = filters?.surface?.trim();
  const indoor = filters?.indoor;
  const maxPrice = filters?.maxPrice;
  const ownerUserId = filters?.ownerUserId;
  const limit =
    typeof filters?.limit === "number" && Number.isFinite(filters.limit) && filters.limit > 0
      ? Math.min(Math.floor(filters.limit), 200)
      : null;
  const date = filters?.date?.trim();
  const timeRaw = filters?.time?.trim();
  let time: string | null = null;
  if (timeRaw) {
    try {
      time = normalizeTime(timeRaw);
    } catch {
      time = null;
    }
  }
  const dateForSlots = date && /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? date
    : time
      ? `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`
      : null;
  const where = [includeUnpublished ? "1 = 1" : "v.published = 1"];
  const whereParams: unknown[] = [];
  const joinParams: unknown[] = [];
  if (city) {
    where.push("LOWER(v.city) LIKE LOWER(?)");
    whereParams.push(`%${city}%`);
  }
  if (query) {
    where.push("(LOWER(v.name) LIKE LOWER(?) OR LOWER(v.address) LIKE LOWER(?))");
    whereParams.push(`%${query}%`, `%${query}%`);
  }
  if (ownerUserId != null) {
    where.push("v.owner_user_id = ?");
    whereParams.push(ownerUserId);
  }
  const pitchWhere = ["p.venue_id = v.id"];
  if (!includeUnpublished) pitchWhere.push("p.active = 1");
  if (surface) {
    pitchWhere.push("LOWER(p.surface) LIKE LOWER(?)");
    joinParams.push(`%${surface}%`);
  }
  if (indoor != null) {
    pitchWhere.push("p.indoor = ?");
    joinParams.push(indoor ? 1 : 0);
  }
  if (maxPrice != null && Number.isFinite(maxPrice)) {
    pitchWhere.push("p.base_price_pln <= ?");
    joinParams.push(maxPrice);
  }
  const requireMatchingPitch = Boolean(surface || indoor != null || maxPrice != null);
  const sql = `SELECT v.*,
              COUNT(p.id) AS pitch_count,
              MIN(CASE WHEN p.active = 1 THEN p.base_price_pln END) AS min_price_pln,
              GROUP_CONCAT(DISTINCT p.surface) AS surfaces,
              MAX(CASE WHEN p.indoor = 1 THEN 1 ELSE 0 END) AS has_indoor,
              MAX(CASE WHEN p.indoor = 0 THEN 1 ELSE 0 END) AS has_outdoor,
              MAX(CASE WHEN p.lighting = 1 THEN 1 ELSE 0 END) AS has_lighting
       FROM venues v
       LEFT JOIN pitches p ON ${pitchWhere.join(" AND ")}
       WHERE ${where.join(" AND ")}
       GROUP BY v.id
       HAVING COUNT(p.id) > 0 OR ? = 1
       ORDER BY v.published DESC, v.city, v.name${limit != null && !dateForSlots ? " LIMIT ?" : ""}`;
  const queryParams: unknown[] = [...joinParams, ...whereParams, requireMatchingPitch ? 0 : 1];
  if (limit != null && !dateForSlots) queryParams.push(limit);
  const venues = await db.prepare(sql).all<VenueCard>(...queryParams);

  if (!dateForSlots) return attachVenuePhotos(db, venues);

  await expireStaleBookings(db);
  const withSlots: VenueCard[] = [];
  if (venues.length === 0) return attachVenuePhotos(db, withSlots);

  const pitchRows = await db
    .prepare(
      `SELECT id, venue_id FROM pitches
       WHERE venue_id IN (${venues.map(() => "?").join(",")}) AND active = 1`
    )
    .all<{ id: number; venue_id: number }>(...venues.map((v) => v.id));
  const pitchesByVenue = new Map<number, number[]>();
  for (const row of pitchRows) {
    const list = pitchesByVenue.get(row.venue_id) ?? [];
    list.push(row.id);
    pitchesByVenue.set(row.venue_id, list);
  }

  for (const venue of venues) {
    const pitchIds = pitchesByVenue.get(venue.id) ?? [];
    let any = false;
    for (const pitchId of pitchIds) {
      const availability = await getAvailabilitySlots(db, pitchId, dateForSlots, { skipExpire: true });
      if (
        availability?.slots.some((s) => {
          if (!s.available) return false;
          if (!time) return true;
          return s.start_time === time || s.start_time.startsWith(`${time.slice(0, 2)}:`);
        })
      ) {
        any = true;
        break;
      }
    }
    if (any) {
      withSlots.push(venue);
      if (limit != null && withSlots.length >= limit) break;
    }
  }
  return attachVenuePhotos(db, withSlots);
}

async function attachVenuePhotos(db: AppDb, venues: VenueCard[]): Promise<VenueCard[]> {
  if (venues.length === 0) return venues;
  const photos = await db
    .prepare(
      `SELECT venue_id, url FROM venue_photos
       WHERE venue_id IN (${venues.map(() => "?").join(",")})
       ORDER BY sort_order, id`
    )
    .all<{ venue_id: number; url: string }>(...venues.map((v) => v.id));
  const byVenue = new Map<number, string[]>();
  for (const photo of photos) {
    const list = byVenue.get(photo.venue_id) ?? [];
    list.push(photo.url);
    byVenue.set(photo.venue_id, list);
  }
  return venues.map((venue) => {
    const photo_urls = byVenue.get(venue.id) ?? (venue.photo_url ? [venue.photo_url] : []);
    return { ...venue, photo_urls, photo_url: venue.photo_url || photo_urls[0] || null };
  });
}

export async function replaceVenuePhotos(db: AppDb, venueId: number, urls: string[]): Promise<void> {
  const clean = urls.map((u) => u.trim()).filter(Boolean).slice(0, 3);
  await db.prepare("DELETE FROM venue_photos WHERE venue_id = ?").run(venueId);
  for (const [index, url] of clean.entries()) {
    await db.prepare("INSERT INTO venue_photos (venue_id, url, sort_order) VALUES (?, ?, ?)").run(venueId, url, index);
  }
  await db
    .prepare("UPDATE venues SET photo_url = ?, updated_at = datetime('now') WHERE id = ?")
    .run(clean[0] ?? null, venueId);
}

export function describeUserCancel(booking: Pick<BookingRow, "status" | "booking_date" | "start_time">, now = new Date()) {
  const deadline = bookingCancelDeadline(booking.booking_date, booking.start_time);
  const cancelUntil = Number.isNaN(deadline.getTime()) ? null : deadline.toISOString();
  if (booking.status === "cancelled" || booking.status === "expired") {
    return { can_cancel: false, cancel_until: cancelUntil };
  }
  if (booking.status === "pending") {
    return { can_cancel: true, cancel_until: cancelUntil };
  }
  if (booking.status === "confirmed") {
    return { can_cancel: now.getTime() <= deadline.getTime(), cancel_until: cancelUntil };
  }
  return { can_cancel: false, cancel_until: cancelUntil };
}

export async function cancelUserBooking(
  db: AppDb,
  args: { bookingId: number; userId: number }
): Promise<{ ok: true } | { ok: false; error: string }> {
  await expireStaleBookings(db);
  const booking = await getBookingById(db, args.bookingId, args.userId);
  if (!booking) return { ok: false, error: "Nie znaleziono rezerwacji." };
  if (booking.payout_id) {
    return { ok: false, error: "Ta rezerwacja jest już w rozliczeniu z obiektem i nie da się jej anulować." };
  }
  const meta = describeUserCancel(booking);
  if (!meta.can_cancel) {
    return {
      ok: false,
      error: `Rezerwację można anulować najpóźniej ${BOOKING_FREE_CANCEL_HOURS} godz. przed rozpoczęciem slotu.`,
    };
  }
  await db
    .prepare(
      `UPDATE bookings
       SET status = 'cancelled', expires_at = NULL, updated_at = datetime('now')
       WHERE id = ? AND user_id = ? AND status IN ('pending', 'confirmed')`
    )
    .run(args.bookingId, args.userId);
  return { ok: true };
}

export async function listAdminPitches(
  db: AppDb,
  venueId?: number,
  ownerUserId?: number
): Promise<AdminPitchRow[]> {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (venueId != null) {
    clauses.push("p.venue_id = ?");
    params.push(venueId);
  }
  if (ownerUserId != null) {
    clauses.push("v.owner_user_id = ?");
    params.push(ownerUserId);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return db
    .prepare(
      `SELECT p.*, v.name AS venue_name, v.city AS venue_city,
              (SELECT opens_at FROM pitch_opening_hours h WHERE h.pitch_id = p.id AND h.weekday = 1 LIMIT 1) AS opens_at,
              (SELECT closes_at FROM pitch_opening_hours h WHERE h.pitch_id = p.id AND h.weekday = 1 LIMIT 1) AS closes_at
       FROM pitches p
       JOIN venues v ON v.id = p.venue_id
       ${where}
       ORDER BY v.name, p.name`
    )
    .all<AdminPitchRow>(...params);
}

export async function createVenue(
  db: AppDb,
  args: {
    name: string;
    city: string;
    address: string;
    description?: string | null;
    phone?: string | null;
    email?: string | null;
    photoUrl?: string | null;
    published?: boolean;
    ownerUserId?: number | null;
    commissionPct?: number | null;
  }
): Promise<{ id: number; slug: string }> {
  const baseSlug = slugifyVenueName(args.name);
  let slug = baseSlug;
  for (let i = 2; ; i++) {
    const exists = await db.prepare("SELECT id FROM venues WHERE slug = ?").get(slug);
    if (!exists) break;
    slug = `${baseSlug}-${i}`;
  }
  const result = await db
    .prepare(
      `INSERT INTO venues (name, slug, city, address, description, phone, email, photo_url, published, owner_user_id, commission_pct)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      args.name,
      slug,
      args.city,
      args.address,
      args.description || null,
      args.phone || null,
      args.email || null,
      args.photoUrl || null,
      args.published === false ? 0 : 1,
      args.ownerUserId ?? null,
      clampVenueCommissionPct(args.commissionPct ?? 15)
    );
  return { id: Number(result.lastInsertRowid), slug };
}

export async function createPitchWithSchedule(
  db: AppDb,
  args: {
    venueId: number;
    name: string;
    surface: string;
    players: number;
    indoor?: boolean;
    lighting?: boolean;
    amenities?: string | null;
    basePricePln: number;
    slotMinutes: number;
    opensAt: string;
    closesAt: string;
    weekendPricePln?: number;
    peakPricePln?: number;
    peakStart?: string;
    peakEnd?: string;
    active?: boolean;
  }
): Promise<{ id: number }> {
  const run = async (tx: AppDb) => {
    const inserted = await tx
      .prepare(
        `INSERT INTO pitches
          (venue_id, name, surface, players, indoor, lighting, amenities, base_price_pln, slot_minutes, active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        args.venueId,
        args.name,
        args.surface,
        args.players,
        args.indoor ? 1 : 0,
        args.lighting === false ? 0 : 1,
        args.amenities || null,
        args.basePricePln,
        args.slotMinutes,
        args.active === false ? 0 : 1
      );
    const pitchId = Number(inserted.lastInsertRowid);
    for (let weekday = 0; weekday <= 6; weekday++) {
      await tx
        .prepare(
          `INSERT INTO pitch_opening_hours (pitch_id, weekday, opens_at, closes_at)
           VALUES (?, ?, ?, ?)`
        )
        .run(pitchId, weekday, args.opensAt, args.closesAt);
    }
    if (args.weekendPricePln) {
      await addPitchPriceRule(tx, { pitchId, weekday: 0, pricePln: args.weekendPricePln, label: "Weekend" });
      await addPitchPriceRule(tx, { pitchId, weekday: 6, pricePln: args.weekendPricePln, label: "Weekend" });
    }
    if (args.peakPricePln && args.peakStart && args.peakEnd) {
      await addPitchPriceRule(tx, {
        pitchId,
        startTime: args.peakStart,
        endTime: args.peakEnd,
        pricePln: args.peakPricePln,
        label: "Szczyt",
      });
    }
    return { id: pitchId };
  };
  if (db.transaction) return db.transaction(run);
  return run(db);
}

export async function listBookingsForOwner(db: AppDb, ownerUserId: number): Promise<BookingRow[]> {
  await expireStaleBookings(db);
  return db
    .prepare(
      `SELECT b.*, p.name AS pitch_name, v.name AS venue_name, v.city AS venue_city, v.address AS venue_address,
              TRIM(u.first_name || ' ' || u.last_name) AS user_name
       FROM bookings b
       JOIN pitches p ON p.id = b.pitch_id
       JOIN venues v ON v.id = p.venue_id
       JOIN users u ON u.id = b.user_id
       WHERE v.owner_user_id = ?
       ORDER BY b.booking_date DESC, b.start_time DESC, b.id DESC`
    )
    .all<BookingRow>(ownerUserId);
}

export async function addPitchPriceRule(
  db: AppDb,
  args: {
    pitchId: number;
    weekday?: number | null;
    startTime?: string | null;
    endTime?: string | null;
    pricePln: number;
    label?: string | null;
  }
): Promise<number> {
  const result = await db
    .prepare(
      `INSERT INTO pitch_price_rules (pitch_id, weekday, start_time, end_time, price_pln, label)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      args.pitchId,
      args.weekday ?? null,
      args.startTime ? normalizeTime(args.startTime) : null,
      args.endTime ? normalizeTime(args.endTime) : null,
      args.pricePln,
      args.label?.trim() || null
    );
  return Number(result.lastInsertRowid);
}

export async function addPitchBlock(
  db: AppDb,
  args: {
    pitchId: number;
    date: string;
    startTime: string;
    endTime: string;
    reason?: string | null;
  }
): Promise<number> {
  const result = await db
    .prepare(
      `INSERT INTO pitch_blocks (pitch_id, block_date, start_time, end_time, reason)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(
      args.pitchId,
      args.date,
      normalizeTime(args.startTime),
      normalizeTime(args.endTime),
      args.reason?.trim() || null
    );
  return Number(result.lastInsertRowid);
}

export async function createConfirmedBooking(
  db: AppDb,
  args: {
    userId: number;
    pitchId: number;
    date: string;
    startTime: string;
    contactName: string;
    contactPhone: string;
    note?: string | null;
  }
): Promise<{ ok: true; booking: BookingRow } | { ok: false; error: string }> {
  const hold = await createBookingHold(db, args);
  if (!hold.ok) return hold;
  await db
    .prepare(
      `UPDATE bookings
       SET status = 'confirmed', expires_at = NULL, updated_at = datetime('now')
       WHERE id = ?`
    )
    .run(hold.booking.id);
  const booking = await getBookingById(db, hold.booking.id);
  if (!booking) return { ok: false, error: "Nie udało się potwierdzić rezerwacji." };
  return { ok: true, booking };
}

export async function getVenueWithPitches(
  db: AppDb,
  idOrSlug: string | number,
  includeUnpublished = false
): Promise<{
  venue: VenueRow & { photo_urls: string[] };
  pitches: PitchPublic[];
  upcoming_blocks: PitchBlockPublic[];
} | null> {
  const { seedBookingCatalogIfEmpty } = await import("@/lib/booking-seed");
  await seedBookingCatalogIfEmpty(db);
  const isId = typeof idOrSlug === "number" || /^\d+$/.test(String(idOrSlug));
  const venue = (await db
    .prepare(
      `SELECT * FROM venues
       WHERE ${isId ? "id = ?" : "slug = ?"} ${includeUnpublished ? "" : "AND published = 1"}
       LIMIT 1`
    )
    .get(isId ? Number(idOrSlug) : String(idOrSlug))) as VenueRow | undefined;
  if (!venue) return null;
  const [photoRows, pitchRows, upcoming_blocks] = await Promise.all([
    db
      .prepare(`SELECT url FROM venue_photos WHERE venue_id = ? ORDER BY sort_order, id`)
      .all<{ url: string }>(venue.id),
    db
      .prepare(
        `SELECT * FROM pitches
         WHERE venue_id = ? ${includeUnpublished ? "" : "AND active = 1"}
         ORDER BY active DESC, name`
      )
      .all<PitchRow>(venue.id),
    db
      .prepare(
        `SELECT b.pitch_id, p.name AS pitch_name, b.block_date, b.start_time, b.end_time, b.reason
         FROM pitch_blocks b
         JOIN pitches p ON p.id = b.pitch_id
         WHERE p.venue_id = ? AND b.block_date >= date('now')
         ORDER BY b.block_date, b.start_time
         LIMIT 12`
      )
      .all<PitchBlockPublic>(venue.id),
  ]);
  const photo_urls = photoRows.map((p) => p.url);
  if (photo_urls.length === 0 && venue.photo_url) photo_urls.push(venue.photo_url);
  const pitchIds = pitchRows.map((p) => p.id);
  const hoursByPitch = new Map<number, PitchOpeningHour[]>();
  const rulesByPitch = new Map<number, PitchPriceRule[]>();
  if (pitchIds.length > 0) {
    const placeholders = pitchIds.map(() => "?").join(",");
    const [hourRows, ruleRows] = await Promise.all([
      db
        .prepare(
          `SELECT pitch_id, weekday, opens_at, closes_at FROM pitch_opening_hours
           WHERE pitch_id IN (${placeholders}) ORDER BY weekday`
        )
        .all<PitchOpeningHour & { pitch_id: number }>(...pitchIds),
      db
        .prepare(
          `SELECT pitch_id, weekday, start_time, end_time, price_pln, label FROM pitch_price_rules
           WHERE pitch_id IN (${placeholders})
           ORDER BY CASE WHEN weekday IS NULL THEN 1 ELSE 0 END, weekday, start_time`
        )
        .all<PitchPriceRule & { pitch_id: number }>(...pitchIds),
    ]);
    for (const row of hourRows) {
      const list = hoursByPitch.get(row.pitch_id) ?? [];
      list.push({ weekday: row.weekday, opens_at: row.opens_at, closes_at: row.closes_at });
      hoursByPitch.set(row.pitch_id, list);
    }
    for (const row of ruleRows) {
      const list = rulesByPitch.get(row.pitch_id) ?? [];
      list.push({
        weekday: row.weekday,
        start_time: row.start_time,
        end_time: row.end_time,
        price_pln: row.price_pln,
        label: row.label,
      });
      rulesByPitch.set(row.pitch_id, list);
    }
  }
  const pitches: PitchPublic[] = pitchRows.map((pitch) => ({
    ...pitch,
    opening_hours: hoursByPitch.get(pitch.id) ?? [],
    price_rules: rulesByPitch.get(pitch.id) ?? [],
  }));
  return {
    venue: { ...venue, photo_urls, photo_url: venue.photo_url || photo_urls[0] || null },
    pitches,
    upcoming_blocks,
  };
}

async function getPitchWithVenue(db: AppDb, pitchId: number): Promise<(PitchRow & { venue_published: number }) | null> {
  const row = await db
    .prepare(
      `SELECT p.*, v.published AS venue_published
       FROM pitches p
       JOIN venues v ON v.id = p.venue_id
       WHERE p.id = ?`
    )
    .get<PitchRow & { venue_published: number }>(pitchId);
  return row ?? null;
}

export async function getAvailabilitySlots(
  db: AppDb,
  pitchId: number,
  date: string,
  options?: { allowUnpublished?: boolean; skipExpire?: boolean }
): Promise<{ pitch: PitchRow; slots: AvailabilitySlot[] } | null> {
  if (!options?.skipExpire) {
    await expireStaleBookings(db);
  }
  const pitch = await getPitchWithVenue(db, pitchId);
  if (!pitch || pitch.active !== 1) return null;
  if (!options?.allowUnpublished && pitch.venue_published !== 1) return null;
  const weekday = weekdayForDate(date);
  const opening = await db
    .prepare(
      `SELECT opens_at, closes_at FROM pitch_opening_hours
       WHERE pitch_id = ? AND weekday = ? LIMIT 1`
    )
    .get<{ opens_at: string; closes_at: string }>(pitchId, weekday);
  if (!opening) return { pitch, slots: [] };

  const rules = await db
    .prepare(
      `SELECT weekday, start_time, end_time, price_pln
       FROM pitch_price_rules
       WHERE pitch_id = ? AND (weekday IS NULL OR weekday = ?)
       ORDER BY weekday DESC, start_time`
    )
    .all<{ weekday: number | null; start_time: string | null; end_time: string | null; price_pln: number }>(
      pitchId,
      weekday
    );

  const blocked = await db
    .prepare(
      `SELECT start_time, end_time FROM pitch_blocks
       WHERE pitch_id = ? AND block_date = ?`
    )
    .all<{ start_time: string; end_time: string }>(pitchId, date);

  const bookings = await db
    .prepare(
      `SELECT start_time, end_time FROM bookings
       WHERE pitch_id = ? AND booking_date = ?
         AND status IN ('confirmed', 'pending')
         AND (status = 'confirmed' OR expires_at IS NULL OR datetime(expires_at) > datetime('now'))`
    )
    .all<{ start_time: string; end_time: string }>(pitchId, date);

  const slots: AvailabilitySlot[] = [];
  let cursor = normalizeTime(opening.opens_at);
  const closes = normalizeTime(opening.closes_at);
  while (addMinutes(cursor, pitch.slot_minutes) <= closes) {
    const end = addMinutes(cursor, pitch.slot_minutes);
    const rule = rules.find((r) => {
      const startOk = !r.start_time || cursor >= normalizeTime(r.start_time);
      const endOk = !r.end_time || end <= normalizeTime(r.end_time);
      return startOk && endOk;
    });
    const unavailable =
      blocked.some((b) => overlaps(cursor, end, normalizeTime(b.start_time), normalizeTime(b.end_time))) ||
      bookings.some((b) => overlaps(cursor, end, normalizeTime(b.start_time), normalizeTime(b.end_time)));
    slots.push({
      date,
      start_time: cursor,
      end_time: end,
      amount_pln: Math.round(Number(rule?.price_pln ?? pitch.base_price_pln) * 100) / 100,
      available: !unavailable,
    });
    cursor = end;
  }
  return { pitch, slots };
}

export async function createBookingHold(
  db: AppDb,
  args: {
    userId: number;
    pitchId: number;
    date: string;
    startTime: string;
    contactName: string;
    contactPhone: string;
    contactEmail?: string | null;
    note?: string | null;
  }
): Promise<{ ok: true; booking: BookingRow } | { ok: false; error: string }> {
  const start = normalizeTime(args.startTime);
  const accessToken = randomBytes(24).toString("hex");
  const contactEmail = args.contactEmail?.trim().toLowerCase() || null;
  const executor = db.transaction ? db.transaction.bind(db) : async <T>(fn: (tx: AppDb) => Promise<T>) => fn(db);
  return executor(async (tx) => {
    await expireStaleBookings(tx);
    const availability = await getAvailabilitySlots(tx, args.pitchId, args.date, { skipExpire: true });
    if (!availability) return { ok: false as const, error: "Boisko jest niedostępne." };
    const slot = availability.slots.find((s) => s.start_time === start);
    if (!slot || !slot.available) return { ok: false as const, error: "Ten termin jest już zajęty." };
    const venue = await tx
      .prepare(
        `SELECT COALESCE(v.commission_pct, 15) AS commission_pct
         FROM pitches p JOIN venues v ON v.id = p.venue_id WHERE p.id = ?`
      )
      .get<{ commission_pct: number }>(args.pitchId);
    const split = splitBookingAmount(slot.amount_pln, venue?.commission_pct);

    const result = await tx
      .prepare(
        `INSERT INTO bookings
          (user_id, pitch_id, booking_date, start_time, end_time, amount_pln, platform_fee_pln, owner_payout_pln, status,
           contact_name, contact_phone, contact_email, access_token, note, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, datetime('now', '+15 minutes'))`
      )
      .run(
        args.userId,
        args.pitchId,
        args.date,
        slot.start_time,
        slot.end_time,
        split.amount_pln,
        split.platform_fee_pln,
        split.owner_payout_pln,
        args.contactName.trim(),
        args.contactPhone.trim(),
        contactEmail,
        accessToken,
        args.note?.trim() || null
      );
    const booking = await getBookingById(tx, Number(result.lastInsertRowid), args.userId);
    if (!booking) return { ok: false as const, error: "Nie udało się utworzyć rezerwacji." };
    return { ok: true as const, booking: { ...booking, access_token: accessToken, contact_email: contactEmail } };
  });
}

export function publicBookingView<T extends { access_token?: string | null }>(booking: T): Omit<T, "access_token"> {
  const rest = { ...booking };
  delete rest.access_token;
  return rest;
}

export async function getBookingByAccessToken(db: AppDb, token: string): Promise<BookingRow | null> {
  const trimmed = token.trim();
  if (!trimmed) return null;
  const row = await db
    .prepare(
      `SELECT b.*, p.name AS pitch_name, v.name AS venue_name, v.city AS venue_city, v.address AS venue_address,
              TRIM(u.first_name || ' ' || u.last_name) AS user_name
       FROM bookings b
       JOIN pitches p ON p.id = b.pitch_id
       JOIN venues v ON v.id = p.venue_id
       JOIN users u ON u.id = b.user_id
       WHERE b.access_token = ?
       LIMIT 1`
    )
    .get<BookingRow>(trimmed);
  return row ?? null;
}

export async function listBookingsForAccessToken(db: AppDb, token: string): Promise<BookingRow[]> {
  const booking = await getBookingByAccessToken(db, token);
  if (!booking) return [];
  return [publicBookingView({ ...booking, ...describeUserCancel(booking) }) as BookingRow];
}

export async function authorizeBookingAccess(
  db: AppDb,
  args: { bookingId: number; sessionUserId?: number | null; token?: string | null }
): Promise<{ userId: number } | null> {
  if (args.sessionUserId) {
    const owned = await getBookingById(db, args.bookingId, args.sessionUserId);
    return owned ? { userId: args.sessionUserId } : null;
  }
  const token = args.token?.trim();
  if (!token) return null;
  const booking = await getBookingByAccessToken(db, token);
  if (!booking || booking.id !== args.bookingId) return null;
  return { userId: booking.user_id };
}

export async function getBookingById(db: AppDb, bookingId: number, userId?: number): Promise<BookingRow | null> {
  const params: unknown[] = [bookingId];
  const ownerSql = userId == null ? "" : "AND b.user_id = ?";
  if (userId != null) params.push(userId);
  const row = await db
    .prepare(
      `SELECT b.*, p.name AS pitch_name, v.name AS venue_name, v.city AS venue_city, v.address AS venue_address,
              TRIM(u.first_name || ' ' || u.last_name) AS user_name
       FROM bookings b
       JOIN pitches p ON p.id = b.pitch_id
       JOIN venues v ON v.id = p.venue_id
       JOIN users u ON u.id = b.user_id
       WHERE b.id = ? ${ownerSql}
       LIMIT 1`
    )
    .get<BookingRow>(...params);
  return row ?? null;
}

export async function listBookingsForUser(db: AppDb, userId: number): Promise<BookingRow[]> {
  await expireStaleBookings(db);
  const rows = await db
    .prepare(
      `SELECT b.*, p.name AS pitch_name, v.name AS venue_name, v.city AS venue_city, v.address AS venue_address
       FROM bookings b
       JOIN pitches p ON p.id = b.pitch_id
       JOIN venues v ON v.id = p.venue_id
       WHERE b.user_id = ?
       ORDER BY b.booking_date DESC, b.start_time DESC`
    )
    .all<BookingRow>(userId);
  return rows.map((booking) => publicBookingView({ ...booking, ...describeUserCancel(booking) }) as BookingRow);
}

export async function listAdminBookings(db: AppDb): Promise<BookingRow[]> {
  await expireStaleBookings(db);
  return db
    .prepare(
      `SELECT b.*, p.name AS pitch_name, v.name AS venue_name, v.city AS venue_city, v.address AS venue_address,
              TRIM(u.first_name || ' ' || u.last_name) AS user_name
       FROM bookings b
       JOIN pitches p ON p.id = b.pitch_id
       JOIN venues v ON v.id = p.venue_id
       JOIN users u ON u.id = b.user_id
       ORDER BY b.booking_date DESC, b.start_time DESC, b.id DESC`
    )
    .all<BookingRow>();
}

export async function confirmBookingPayment(
  db: AppDb,
  args: { bookingId: number; sessionId: string }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const booking = await getBookingById(db, args.bookingId);
  if (!booking) return { ok: false, error: "BOOKING_NOT_FOUND" };
  if (booking.status === "cancelled" || booking.status === "expired") {
    return { ok: false, error: "BOOKING_NOT_PAYABLE" };
  }
  await db
    .prepare(
      `UPDATE bookings
       SET status = 'confirmed', hotpay_session_id = ?, expires_at = NULL, updated_at = datetime('now')
       WHERE id = ? AND status IN ('pending', 'confirmed')`
    )
    .run(args.sessionId, args.bookingId);
  await db
    .prepare(
      `UPDATE booking_payments
       SET status = 'success', completed_at = datetime('now')
       WHERE booking_id = ? AND hotpay_session_id = ?`
    )
    .run(args.bookingId, args.sessionId);
  return { ok: true };
}

export async function cancelBookingPayment(
  db: AppDb,
  args: { bookingId: number; sessionId: string; status: "failure" | "cancelled" }
): Promise<void> {
  await db
    .prepare(
      `UPDATE booking_payments
       SET status = ?, completed_at = datetime('now')
       WHERE booking_id = ? AND hotpay_session_id = ? AND status = 'pending'`
    )
    .run(args.status, args.bookingId, args.sessionId);
}
