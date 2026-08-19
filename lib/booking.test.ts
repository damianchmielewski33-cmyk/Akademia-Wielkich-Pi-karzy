import Database from "better-sqlite3";
import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";
import type { AppDb } from "@/lib/db";
import {
  BOOKING_SCHEMA_SQL,
  cancelUserBooking,
  confirmBookingPayment,
  createBookingHold,
  describeUserCancel,
  ensureBookingSchema,
  getAvailabilitySlots,
  getVenueWithPitches,
  listVenueCards,
  replaceVenuePhotos,
} from "@/lib/booking";

function createTestDb(): { db: AppDb; sqlite: Database.Database; dbPath: string } {
  const dbPath = path.join(os.tmpdir(), `awp-booking-test-${Date.now()}-${Math.random()}.sqlite`);
  const sqlite = new Database(dbPath);
  sqlite.pragma("foreign_keys = ON");
  sqlite.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      player_alias TEXT UNIQUE NOT NULL,
      is_admin INTEGER DEFAULT 0
    );
    ${BOOKING_SCHEMA_SQL}
  `);

  const db: AppDb = {
    prepare(sql: string) {
      const stmt = sqlite.prepare(sql);
      return {
        run(...params: unknown[]) {
          const r = stmt.run(...(params as never[]));
          return Promise.resolve({
            lastInsertRowid: BigInt(r.lastInsertRowid ?? 0),
            changes: r.changes ?? 0,
          });
        },
        get<T = unknown>(...params: unknown[]) {
          return Promise.resolve(stmt.get(...(params as never[])) as T | undefined);
        },
        all<T = unknown>(...params: unknown[]) {
          return Promise.resolve(stmt.all(...(params as never[])) as T[]);
        },
      };
    },
    exec(sql: string) {
      sqlite.exec(sql);
      return Promise.resolve();
    },
    async transaction<T>(fn: (tx: AppDb) => Promise<T>): Promise<T> {
      sqlite.exec("BEGIN IMMEDIATE");
      try {
        const result = await fn(db);
        sqlite.exec("COMMIT");
        return result;
      } catch (e) {
        sqlite.exec("ROLLBACK");
        throw e;
      }
    },
  };
  return { db, sqlite, dbPath };
}

function seedPitch(sqlite: Database.Database) {
  sqlite.exec(`
    INSERT INTO users (id, first_name, last_name, player_alias) VALUES (1, 'Jan', 'Kowalski', 'jan');
    INSERT INTO users (id, first_name, last_name, player_alias) VALUES (2, 'Adam', 'Nowak', 'adam');
    INSERT INTO venues (id, name, slug, city, address, published)
    VALUES (1, 'Hala Testowa', 'hala-testowa', 'Warszawa', 'Testowa 1', 1);
    INSERT INTO pitches (id, venue_id, name, surface, players, base_price_pln, slot_minutes, active)
    VALUES (1, 1, 'Boisko A', 'parkiet', 10, 200, 60, 1);
    INSERT INTO pitch_opening_hours (pitch_id, weekday, opens_at, closes_at)
    VALUES (1, 1, '18:00', '21:00');
  `);
}

describe("booking availability", () => {
  const dbs: { sqlite: Database.Database; dbPath: string }[] = [];

  afterEach(() => {
    for (const { sqlite, dbPath } of dbs.splice(0)) {
      sqlite.close();
      fs.rmSync(dbPath, { force: true });
    }
  });

  it("marks a pending booking hold as unavailable", async () => {
    const { db, sqlite, dbPath } = createTestDb();
    dbs.push({ sqlite, dbPath });
    seedPitch(sqlite);

    const first = await createBookingHold(db, {
      userId: 1,
      pitchId: 1,
      date: "2026-08-17",
      startTime: "18:00",
      contactName: "Jan Kowalski",
      contactPhone: "500600700",
    });
    expect(first.ok).toBe(true);

    const second = await createBookingHold(db, {
      userId: 2,
      pitchId: 1,
      date: "2026-08-17",
      startTime: "18:00",
      contactName: "Adam Nowak",
      contactPhone: "500600701",
    });
    expect(second.ok).toBe(false);

    const availability = await getAvailabilitySlots(db, 1, "2026-08-17");
    expect(availability?.slots.find((s) => s.start_time === "18:00")?.available).toBe(false);
  });

  it("releases expired pending holds and confirms paid bookings", async () => {
    const { db, sqlite, dbPath } = createTestDb();
    dbs.push({ sqlite, dbPath });
    seedPitch(sqlite);

    const hold = await createBookingHold(db, {
      userId: 1,
      pitchId: 1,
      date: "2026-08-17",
      startTime: "19:00",
      contactName: "Jan Kowalski",
      contactPhone: "500600700",
    });
    expect(hold.ok).toBe(true);
    if (!hold.ok) return;

    sqlite.prepare("UPDATE bookings SET expires_at = datetime('now', '-1 minute') WHERE id = ?").run(hold.booking.id);
    const availability = await getAvailabilitySlots(db, 1, "2026-08-17");
    expect(availability?.slots.find((s) => s.start_time === "19:00")?.available).toBe(true);

    sqlite.prepare("UPDATE bookings SET status = 'pending', expires_at = datetime('now', '+10 minutes') WHERE id = ?").run(hold.booking.id);
    sqlite
      .prepare(
        `INSERT INTO booking_payments (booking_id, amount_pln, status, hotpay_session_id)
         VALUES (?, 200, 'pending', 'hp_booking_test')`
      )
      .run(hold.booking.id);
    const confirmed = await confirmBookingPayment(db, { bookingId: hold.booking.id, sessionId: "hp_booking_test" });
    expect(confirmed.ok).toBe(true);
    const row = sqlite.prepare("SELECT status, expires_at FROM bookings WHERE id = ?").get(hold.booking.id) as {
      status: string;
      expires_at: string | null;
    };
    expect(row.status).toBe("confirmed");
    expect(row.expires_at).toBeNull();
  });

  it("applies weekend price rules and technical blocks", async () => {
    const { db, sqlite, dbPath } = createTestDb();
    dbs.push({ sqlite, dbPath });
    seedPitch(sqlite);
    sqlite.exec(`
      INSERT INTO pitch_opening_hours (pitch_id, weekday, opens_at, closes_at)
      VALUES (1, 0, '18:00', '21:00');
      INSERT INTO pitch_price_rules (pitch_id, weekday, start_time, end_time, price_pln, label)
      VALUES (1, 0, NULL, NULL, 280, 'Weekend');
      INSERT INTO pitch_blocks (pitch_id, block_date, start_time, end_time, reason)
      VALUES (1, '2026-08-16', '19:00', '20:00', 'konserwacja');
    `);

    const sunday = await getAvailabilitySlots(db, 1, "2026-08-16");
    expect(sunday?.slots.find((s) => s.start_time === "18:00")?.amount_pln).toBe(280);
    expect(sunday?.slots.find((s) => s.start_time === "19:00")?.available).toBe(false);
    expect(sunday?.slots.find((s) => s.start_time === "20:00")?.available).toBe(true);
  });

  it("filters venues by available hour", async () => {
    const { db, sqlite, dbPath } = createTestDb();
    dbs.push({ sqlite, dbPath });
    seedPitch(sqlite);

    const atEighteen = await listVenueCards(db, { date: "2026-08-17", time: "18:00" });
    expect(atEighteen.map((v) => v.slug)).toEqual(["hala-testowa"]);

    const atNoon = await listVenueCards(db, { date: "2026-08-17", time: "12:00" });
    expect(atNoon).toEqual([]);
  });

  it("stores up to three venue photos and exposes hours on the venue page", async () => {
    const { db, sqlite, dbPath } = createTestDb();
    dbs.push({ sqlite, dbPath });
    seedPitch(sqlite);

    await replaceVenuePhotos(db, 1, [
      "https://example.com/a.jpg",
      "https://example.com/b.jpg",
      "https://example.com/c.jpg",
    ]);
    const cards = await listVenueCards(db);
    expect(cards[0]?.photo_urls).toEqual([
      "https://example.com/a.jpg",
      "https://example.com/b.jpg",
      "https://example.com/c.jpg",
    ]);

    const details = await getVenueWithPitches(db, "hala-testowa");
    expect(details?.venue.photo_urls).toHaveLength(3);
    expect(details?.pitches[0]?.opening_hours.some((h) => h.weekday === 1 && h.opens_at === "18:00")).toBe(true);
  });

  it("lets the player cancel pending holds and confirmed bookings until 24h before start", async () => {
    const { db, sqlite, dbPath } = createTestDb();
    dbs.push({ sqlite, dbPath });
    seedPitch(sqlite);

    const pad = (n: number) => String(n).padStart(2, "0");
    const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const soon = new Date();
    soon.setHours(18, 0, 0, 0);
    const later = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    later.setHours(18, 0, 0, 0);

    sqlite
      .prepare(
        `INSERT INTO bookings (user_id, pitch_id, booking_date, start_time, end_time, amount_pln, status, contact_name, contact_phone)
         VALUES (1, 1, ?, '18:00', '19:00', 200, 'pending', 'Jan Kowalski', '500600700')`
      )
      .run(ymd(soon));
    sqlite
      .prepare(
        `INSERT INTO bookings (user_id, pitch_id, booking_date, start_time, end_time, amount_pln, status, contact_name, contact_phone)
         VALUES (1, 1, ?, '18:00', '19:00', 200, 'confirmed', 'Jan Kowalski', '500600700')`
      )
      .run(ymd(soon));
    sqlite
      .prepare(
        `INSERT INTO bookings (user_id, pitch_id, booking_date, start_time, end_time, amount_pln, status, contact_name, contact_phone)
         VALUES (1, 1, ?, '18:00', '19:00', 200, 'confirmed', 'Jan Kowalski', '500600700')`
      )
      .run(ymd(later));

    const pendingId = (sqlite.prepare("SELECT id FROM bookings WHERE status = 'pending'").get() as { id: number }).id;
    const nearId = (
      sqlite.prepare("SELECT id FROM bookings WHERE status = 'confirmed' AND booking_date = ?").get(ymd(soon)) as { id: number }
    ).id;
    const farId = (
      sqlite.prepare("SELECT id FROM bookings WHERE status = 'confirmed' AND booking_date = ?").get(ymd(later)) as { id: number }
    ).id;

    expect((await cancelUserBooking(db, { bookingId: pendingId, userId: 1 })).ok).toBe(true);
    expect(describeUserCancel({ status: "confirmed", booking_date: ymd(soon), start_time: "18:00" }).can_cancel).toBe(
      Date.now() <= new Date(`${ymd(soon)}T18:00:00`).getTime() - 24 * 60 * 60 * 1000
    );
    const nearCancel = await cancelUserBooking(db, { bookingId: nearId, userId: 1 });
    if (Date.now() > new Date(`${ymd(soon)}T18:00:00`).getTime() - 24 * 60 * 60 * 1000) {
      expect(nearCancel.ok).toBe(false);
    } else {
      expect(nearCancel.ok).toBe(true);
    }
    expect((await cancelUserBooking(db, { bookingId: farId, userId: 1 })).ok).toBe(true);
  });
});

describe("booking schema migration", () => {
  it("adds owner_user_id to an existing venues table", async () => {
    const dbPath = path.join(os.tmpdir(), `awp-booking-migrate-${Date.now()}-${Math.random()}.sqlite`);
    const sqlite = new Database(dbPath);
    sqlite.exec(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        player_alias TEXT UNIQUE NOT NULL
      );
      CREATE TABLE venues (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        city TEXT NOT NULL,
        address TEXT NOT NULL,
        published INTEGER NOT NULL DEFAULT 1
      );
    `);
    const db: AppDb = {
      prepare(sql: string) {
        const stmt = sqlite.prepare(sql);
        return {
          run(...params: unknown[]) {
            const r = stmt.run(...(params as never[]));
            return Promise.resolve({
              lastInsertRowid: BigInt(r.lastInsertRowid ?? 0),
              changes: r.changes ?? 0,
            });
          },
          get<T = unknown>(...params: unknown[]) {
            return Promise.resolve(stmt.get(...(params as never[])) as T | undefined);
          },
          all<T = unknown>(...params: unknown[]) {
            return Promise.resolve(stmt.all(...(params as never[])) as T[]);
          },
        };
      },
      exec(sql: string) {
        sqlite.exec(sql);
        return Promise.resolve();
      },
      async transaction<T>(fn: (tx: AppDb) => Promise<T>): Promise<T> {
        return fn(db);
      },
    };

    await ensureBookingSchema(db);
    const cols = sqlite.prepare("PRAGMA table_info(venues)").all() as { name: string }[];
    expect(cols.some((c) => c.name === "owner_user_id")).toBe(true);
    sqlite.prepare("SELECT owner_user_id FROM venues").all();

    sqlite.close();
    fs.rmSync(dbPath, { force: true });
  });
});
