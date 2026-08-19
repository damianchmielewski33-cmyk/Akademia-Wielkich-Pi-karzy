import Database from "better-sqlite3";
import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";
import type { AppDb } from "@/lib/db";
import { BOOKING_SCHEMA_SQL, createVenue, listVenueCards } from "@/lib/booking";
import {
  claimPartnerInvite,
  createPartnerInvite,
  isVenuePartner,
  revokePartnerInvite,
  userOwnsVenue,
} from "@/lib/venue-partners";

function createTestDb(): { db: AppDb; sqlite: Database.Database; dbPath: string } {
  const dbPath = path.join(os.tmpdir(), `awp-partner-test-${Date.now()}-${Math.random()}.sqlite`);
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
    INSERT INTO users (id, first_name, last_name, player_alias, is_admin) VALUES (1, 'Admin', 'A', 'admin', 1);
    INSERT INTO users (id, first_name, last_name, player_alias, is_admin) VALUES (2, 'Partner', 'Hali', 'partner', 0);
    INSERT INTO users (id, first_name, last_name, player_alias, is_admin) VALUES (3, 'Inny', 'Gracz', 'inny', 0);
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

describe("venue partners", () => {
  const dbs: { sqlite: Database.Database; dbPath: string }[] = [];

  afterEach(() => {
    for (const { sqlite, dbPath } of dbs.splice(0)) {
      sqlite.close();
      fs.rmSync(dbPath, { force: true });
    }
  });

  it("lets a partner claim an invite and own only their venue", async () => {
    const { db, sqlite, dbPath } = createTestDb();
    dbs.push({ sqlite, dbPath });

    const invite = await createPartnerInvite(db, { adminUserId: 1, label: "Hala Test" });
    expect(await isVenuePartner(db, 2)).toBe(false);

    const claimed = await claimPartnerInvite(db, { token: invite.token, userId: 2 });
    expect(claimed.ok).toBe(true);
    expect(await isVenuePartner(db, 2)).toBe(true);

    const stolen = await claimPartnerInvite(db, { token: invite.token, userId: 3 });
    expect(stolen.ok).toBe(false);

    const venue = await createVenue(db, {
      name: "Moja Hala",
      city: "Poznań",
      address: "Testowa 1",
      ownerUserId: 2,
    });
    expect(await userOwnsVenue(db, 2, venue.id)).toBe(true);
    expect(await userOwnsVenue(db, 3, venue.id)).toBe(false);

    const mine = await listVenueCards(db, { includeUnpublished: true, ownerUserId: 2 });
    expect(mine.map((v) => v.slug)).toEqual(["moja-hala"]);
  });

  it("revokes partner access from an invite", async () => {
    const { db, sqlite, dbPath } = createTestDb();
    dbs.push({ sqlite, dbPath });

    const invite = await createPartnerInvite(db, { adminUserId: 1 });
    await claimPartnerInvite(db, { token: invite.token, userId: 2 });
    expect(await isVenuePartner(db, 2)).toBe(true);
    expect(await revokePartnerInvite(db, invite.id)).toBe(true);
    expect(await isVenuePartner(db, 2)).toBe(false);
  });
});
