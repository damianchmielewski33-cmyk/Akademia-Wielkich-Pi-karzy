import Database from "better-sqlite3";
import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";
import type { AppDb } from "@/lib/db";
import { BOOKING_SCHEMA_SQL, listVenueCards } from "@/lib/booking";
import {
  VENUE_APPLICATIONS_SCHEMA_SQL,
  approveVenueApplication,
  rejectVenueApplication,
  submitVenueApplication,
} from "@/lib/venue-applications";
import { isVenuePartner } from "@/lib/venue-partners";

function createTestDb(): { db: AppDb; sqlite: Database.Database; dbPath: string } {
  const dbPath = path.join(os.tmpdir(), `awp-apply-test-${Date.now()}-${Math.random()}.sqlite`);
  const sqlite = new Database(dbPath);
  sqlite.pragma("foreign_keys = ON");
  sqlite.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      player_alias TEXT UNIQUE NOT NULL,
      is_admin INTEGER DEFAULT 0,
      email TEXT,
      pin_hash TEXT
    );
    ${BOOKING_SCHEMA_SQL}
    ${VENUE_APPLICATIONS_SCHEMA_SQL}
  `);
  sqlite.exec(`
    INSERT INTO users (id, first_name, last_name, player_alias, is_admin) VALUES (1, 'Admin', 'A', 'admin', 1);
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

describe("venue applications", () => {
  const dbs: { sqlite: Database.Database; dbPath: string }[] = [];

  afterEach(() => {
    for (const { sqlite, dbPath } of dbs.splice(0)) {
      sqlite.close();
      fs.rmSync(dbPath, { force: true });
    }
  });

  it("accepts a public hall application without an invite token", async () => {
    const { db, sqlite, dbPath } = createTestDb();
    dbs.push({ sqlite, dbPath });

    const first = await submitVenueApplication(db, {
      contactName: "Anna Hala",
      contactEmail: "anna@hala.pl",
      contactPhone: "500600700",
      venueName: "Hala Wola",
      city: "Warszawa",
      address: "ul. Testowa 1",
    });
    expect(first.ok).toBe(true);

    const dup = await submitVenueApplication(db, {
      contactName: "Anna Hala",
      contactEmail: "anna@hala.pl",
      contactPhone: "500600700",
      venueName: "Hala Wola",
      city: "Warszawa",
      address: "ul. Testowa 1",
    });
    expect(dup.ok).toBe(false);
  });

  it("creates an unpublished venue and partner account on approve", async () => {
    const { db, sqlite, dbPath } = createTestDb();
    dbs.push({ sqlite, dbPath });

    const submitted = await submitVenueApplication(db, {
      contactName: "Anna Hala",
      contactEmail: "anna@hala.pl",
      contactPhone: "500600700",
      venueName: "Hala Wola",
      city: "Warszawa",
      address: "ul. Testowa 1",
    });
    expect(submitted.ok).toBe(true);
    if (!submitted.ok) return;

    const approved = await approveVenueApplication(db, {
      applicationId: submitted.application.id,
      adminUserId: 1,
      publish: false,
    });
    expect(approved.ok).toBe(true);
    if (!approved.ok) return;
    expect(approved.pin).toBeTruthy();
    expect(await isVenuePartner(db, approved.partnerUserId)).toBe(true);

    const venue = sqlite.prepare("SELECT published, owner_user_id FROM venues WHERE id = ?").get(approved.venueId) as {
      published: number;
      owner_user_id: number;
    };
    expect(venue.published).toBe(0);
    expect(venue.owner_user_id).toBe(approved.partnerUserId);
    const cards = await listVenueCards(db);
    expect(cards.some((row) => row.name === "Hala Wola")).toBe(false);
  });

  it("rejects a pending application", async () => {
    const { db, sqlite, dbPath } = createTestDb();
    dbs.push({ sqlite, dbPath });
    const submitted = await submitVenueApplication(db, {
      contactName: "Jan Obiekt",
      contactEmail: "jan@obiekt.pl",
      contactPhone: "500600701",
      venueName: "Orlik Test",
      city: "Warszawa",
      address: "ul. Druga 2",
    });
    expect(submitted.ok).toBe(true);
    if (!submitted.ok) return;
    expect(
      (await rejectVenueApplication(db, { applicationId: submitted.application.id, adminUserId: 1 })).ok
    ).toBe(true);
    expect(
      (await approveVenueApplication(db, { applicationId: submitted.application.id, adminUserId: 1 })).ok
    ).toBe(false);
  });
});
