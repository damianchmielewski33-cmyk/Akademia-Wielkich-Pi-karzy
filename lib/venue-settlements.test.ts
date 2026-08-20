import Database from "better-sqlite3";
import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";
import type { AppDb } from "@/lib/db";
import { BOOKING_SCHEMA_SQL, cancelUserBooking, createBookingHold } from "@/lib/booking";
import {
  createVenuePayout,
  getPartnerSettlement,
  isBookingEligibleForPayout,
  markVenuePayoutPaid,
  splitBookingAmount,
} from "@/lib/venue-settlements";

function createTestDb(): { db: AppDb; sqlite: Database.Database; dbPath: string } {
  const dbPath = path.join(os.tmpdir(), `awp-settle-test-${Date.now()}-${Math.random()}.sqlite`);
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
  sqlite.exec(`
    INSERT INTO users (id, first_name, last_name, player_alias, is_admin) VALUES (1, 'Jan', 'Kowalski', 'jan', 1);
    INSERT INTO users (id, first_name, last_name, player_alias, is_admin) VALUES (2, 'Hala', 'Owner', 'hala', 0);
    INSERT INTO venues (id, name, slug, city, address, published, owner_user_id, commission_pct)
    VALUES (1, 'Hala Testowa', 'hala-testowa', 'Warszawa', 'Testowa 1', 1, 2, 15);
    INSERT INTO pitches (id, venue_id, name, surface, players, base_price_pln, slot_minutes, active)
    VALUES (1, 1, 'Boisko A', 'parkiet', 10, 180, 60, 1);
    INSERT INTO pitch_opening_hours (pitch_id, weekday, opens_at, closes_at)
    VALUES (1, 1, '18:00', '21:00');
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

describe("venue settlements", () => {
  const dbs: { sqlite: Database.Database; dbPath: string }[] = [];

  afterEach(() => {
    for (const { sqlite, dbPath } of dbs.splice(0)) {
      sqlite.close();
      fs.rmSync(dbPath, { force: true });
    }
  });

  it("splits slot price 15% to the academy and the rest to the hall", () => {
    expect(splitBookingAmount(180, 15)).toEqual({
      amount_pln: 180,
      platform_fee_pln: 27,
      owner_payout_pln: 153,
      commission_pct: 15,
    });
  });

  it("snapshots the split on hold and pays out after the slot starts", async () => {
    const { db, sqlite, dbPath } = createTestDb();
    dbs.push({ sqlite, dbPath });

    const hold = await createBookingHold(db, {
      userId: 1,
      pitchId: 1,
      date: "2020-01-06",
      startTime: "18:00",
      contactName: "Jan Kowalski",
      contactPhone: "500600700",
    });
    expect(hold.ok).toBe(true);
    if (!hold.ok) return;
    expect(hold.booking.platform_fee_pln).toBe(27);
    expect(hold.booking.owner_payout_pln).toBe(153);

    await db.prepare("UPDATE bookings SET status = 'confirmed', expires_at = NULL WHERE id = ?").run(hold.booking.id);

    const partner = await getPartnerSettlement(db, 2, new Date("2020-01-06T19:00:00"));
    expect(partner.pending.owner_payout_pln).toBe(153);
    expect(partner.pending.booking_count).toBe(1);

    const created = await createVenuePayout(db, {
      venueId: 1,
      adminUserId: 1,
      now: new Date("2020-01-06T19:00:00"),
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.payout.owner_payout_pln).toBe(153);

    const again = await createVenuePayout(db, {
      venueId: 1,
      adminUserId: 1,
      now: new Date("2020-01-06T19:00:00"),
    });
    expect(again.ok).toBe(false);

    expect((await cancelUserBooking(db, { bookingId: hold.booking.id, userId: 1 })).ok).toBe(false);

    expect(await markVenuePayoutPaid(db, { payoutId: created.payout.id, adminUserId: 1 })).toEqual({ ok: true });
    const after = await getPartnerSettlement(db, 2, new Date("2020-01-06T19:00:00"));
    expect(after.pending.booking_count).toBe(0);
    expect(after.payouts[0]?.status).toBe("paid");
  });

  it("does not include a future slot even if it is already paid", () => {
    expect(
      isBookingEligibleForPayout(
        {
          booking_date: "2099-01-04",
          start_time: "18:00",
          paid_ok: 1,
          amount_pln: 180,
          platform_fee_pln: 27,
          owner_payout_pln: 153,
          commission_pct: 15,
        },
        new Date("2026-08-20T12:00:00")
      )
    ).toBe(false);
  });
});
