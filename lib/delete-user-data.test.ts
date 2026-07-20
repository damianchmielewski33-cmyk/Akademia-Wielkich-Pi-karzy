import Database from "better-sqlite3";
import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";
import type { AppDb } from "@/lib/db";
import { deleteUserAccountData } from "@/lib/delete-user-data";

function createTestDb(): { db: AppDb; sqlite: Database.Database; dbPath: string } {
  const dbPath = path.join(os.tmpdir(), `awp-delete-test-${Date.now()}-${Math.random()}.sqlite`);
  const sqlite = new Database(dbPath);
  sqlite.pragma("foreign_keys = ON");
  sqlite.exec(`
    CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, first_name TEXT NOT NULL, last_name TEXT NOT NULL, player_alias TEXT UNIQUE NOT NULL, is_admin INTEGER DEFAULT 0, pin_hash TEXT);
    CREATE TABLE matches (id INTEGER PRIMARY KEY AUTOINCREMENT, match_date TEXT, match_time TEXT, location TEXT, max_slots INTEGER, signed_up INTEGER DEFAULT 0, played INTEGER DEFAULT 0);
    CREATE TABLE match_signups (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, match_id INTEGER NOT NULL, paid INTEGER DEFAULT 0, commitment INTEGER DEFAULT 1, FOREIGN KEY(user_id) REFERENCES users(id), FOREIGN KEY(match_id) REFERENCES matches(id));
    CREATE TABLE match_attendance (match_id INTEGER NOT NULL, user_id INTEGER NOT NULL, present INTEGER NOT NULL, marked_by_admin_id INTEGER NOT NULL, marked_at TEXT DEFAULT (datetime('now')), PRIMARY KEY (match_id, user_id), FOREIGN KEY (user_id) REFERENCES users(id), FOREIGN KEY (marked_by_admin_id) REFERENCES users(id));
    CREATE TABLE wallet_transactions (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, kind TEXT NOT NULL, amount_pln REAL NOT NULL, created_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (user_id) REFERENCES users(id));
    CREATE TABLE wallet_deposit_requests (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, amount_pln REAL NOT NULL, created_by TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', created_at TEXT NOT NULL DEFAULT (datetime('now')), FOREIGN KEY (user_id) REFERENCES users(id));
    CREATE TABLE match_wallet_charges (match_id INTEGER NOT NULL, user_id INTEGER NOT NULL, amount_pln REAL NOT NULL, created_by_admin_id INTEGER NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')), PRIMARY KEY (match_id, user_id), FOREIGN KEY (user_id) REFERENCES users(id), FOREIGN KEY (created_by_admin_id) REFERENCES users(id));
    CREATE TABLE page_views (id INTEGER PRIMARY KEY AUTOINCREMENT, screen_key TEXT NOT NULL, pathname TEXT NOT NULL, user_id INTEGER, visitor_id TEXT NOT NULL, created_at TEXT NOT NULL, FOREIGN KEY (user_id) REFERENCES users(id));
    CREATE TABLE activity_log (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, action TEXT NOT NULL, timestamp TEXT DEFAULT (datetime('now')), FOREIGN KEY (user_id) REFERENCES users(id));
    CREATE TABLE admin_messages (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, sender_name TEXT NOT NULL, body TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'unread', read_by_admin_id INTEGER, created_at TEXT NOT NULL DEFAULT (datetime('now')), FOREIGN KEY (user_id) REFERENCES users(id), FOREIGN KEY (read_by_admin_id) REFERENCES users(id));
    CREATE TABLE public_share_links (id INTEGER PRIMARY KEY AUTOINCREMENT, token TEXT NOT NULL UNIQUE, kind TEXT NOT NULL, created_by_admin_id INTEGER NOT NULL, user_id INTEGER, created_at TEXT NOT NULL DEFAULT (datetime('now')), FOREIGN KEY (created_by_admin_id) REFERENCES users(id));
    CREATE TABLE match_transport_messages (id INTEGER PRIMARY KEY AUTOINCREMENT, match_id INTEGER NOT NULL, user_id INTEGER NOT NULL, body TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')), FOREIGN KEY (user_id) REFERENCES users(id));
    CREATE TABLE match_participation_survey (user_id INTEGER NOT NULL, match_id INTEGER NOT NULL, played INTEGER NOT NULL, answered_at TEXT NOT NULL DEFAULT (datetime('now')), PRIMARY KEY (user_id, match_id), FOREIGN KEY (user_id) REFERENCES users(id));
    CREATE TABLE match_lineup_slots (match_id INTEGER NOT NULL, team TEXT NOT NULL, slot_index INTEGER NOT NULL, user_id INTEGER NOT NULL, PRIMARY KEY (match_id, team, slot_index), FOREIGN KEY (user_id) REFERENCES users(id));
    CREATE TABLE match_stats (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, match_id INTEGER NOT NULL, goals INTEGER DEFAULT 0, assists INTEGER DEFAULT 0, distance REAL DEFAULT 0, saves INTEGER DEFAULT 0, FOREIGN KEY (user_id) REFERENCES users(id));
    CREATE TABLE participation_survey_answer (user_id INTEGER NOT NULL, survey_key TEXT NOT NULL, played INTEGER NOT NULL, answered_at TEXT NOT NULL DEFAULT (datetime('now')), PRIMARY KEY (user_id, survey_key), FOREIGN KEY (user_id) REFERENCES users(id));
    CREATE TABLE standalone_match_stats (user_id INTEGER NOT NULL, survey_key TEXT NOT NULL, goals INTEGER DEFAULT 0, assists INTEGER DEFAULT 0, distance REAL DEFAULT 0, saves INTEGER DEFAULT 0, updated_at TEXT NOT NULL DEFAULT (datetime('now')), PRIMARY KEY (user_id, survey_key), FOREIGN KEY (user_id) REFERENCES users(id));
    CREATE TABLE ranking_seasons (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, started_by_admin_id INTEGER NOT NULL, ended_by_admin_id INTEGER, started_at TEXT NOT NULL DEFAULT (datetime('now')), ended_at TEXT, FOREIGN KEY (started_by_admin_id) REFERENCES users(id), FOREIGN KEY (ended_by_admin_id) REFERENCES users(id));
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
  };

  return { db, sqlite, dbPath };
}

describe("deleteUserAccountData", () => {
  let sqlite: Database.Database;
  let db: AppDb;
  let dbPath: string;

  afterEach(() => {
    sqlite.close();
    try {
      fs.unlinkSync(dbPath);
    } catch {
      /* ignore */
    }
  });

  it("usuwa piłkarza z obecnością na meczu, portfelem i zapisem", async () => {
    ({ db, sqlite, dbPath } = createTestDb());
    const adminId = sqlite
      .prepare("INSERT INTO users (first_name, last_name, player_alias, is_admin) VALUES (?,?,?,1)")
      .run("Admin", "Test", "admin-alias").lastInsertRowid;
    const userId = sqlite
      .prepare("INSERT INTO users (first_name, last_name, player_alias, is_admin, pin_hash) VALUES (?,?,?,0,NULL)")
      .run("Jan", "Kowalski", "jan-k").lastInsertRowid;
    const matchId = sqlite
      .prepare("INSERT INTO matches (match_date, match_time, location, max_slots, signed_up) VALUES (?,?,?,?,1)")
      .run("2026-01-01", "12:00", "Boisko", 10).lastInsertRowid;

    sqlite.prepare("INSERT INTO match_signups (user_id, match_id) VALUES (?,?)").run(userId, matchId);
    sqlite
      .prepare("INSERT INTO match_attendance (match_id, user_id, present, marked_by_admin_id) VALUES (?,?,1,?)")
      .run(matchId, userId, adminId);
    sqlite.prepare("INSERT INTO wallet_transactions (user_id, kind, amount_pln) VALUES (?, 'adjustment', 10)").run(userId);
    sqlite
      .prepare("INSERT INTO match_wallet_charges (match_id, user_id, amount_pln, created_by_admin_id) VALUES (?,?,10,?)")
      .run(matchId, userId, adminId);

    await deleteUserAccountData(db, Number(userId));

    expect(sqlite.prepare("SELECT id FROM users WHERE id = ?").get(userId)).toBeUndefined();
    expect(sqlite.prepare("SELECT 1 FROM match_attendance WHERE user_id = ?").get(userId)).toBeUndefined();
    const signedUp = sqlite.prepare("SELECT signed_up FROM matches WHERE id = ?").get(matchId) as { signed_up: number };
    expect(signedUp.signed_up).toBe(0);
  });

  it("usuwa admina z przypisaniami FK — reassign do innego admina", async () => {
    ({ db, sqlite, dbPath } = createTestDb());
    const adminA = sqlite
      .prepare("INSERT INTO users (first_name, last_name, player_alias, is_admin) VALUES (?,?,?,1)")
      .run("Admin", "A", "admin-a").lastInsertRowid;
    const adminB = sqlite
      .prepare("INSERT INTO users (first_name, last_name, player_alias, is_admin) VALUES (?,?,?,1)")
      .run("Admin", "B", "admin-b").lastInsertRowid;
    const matchId = sqlite
      .prepare("INSERT INTO matches (match_date, match_time, location, max_slots, signed_up) VALUES (?,?,?,?,0)")
      .run("2026-02-01", "10:00", "Boisko", 10).lastInsertRowid;
    const playerId = sqlite
      .prepare("INSERT INTO users (first_name, last_name, player_alias, is_admin) VALUES (?,?,?,0)")
      .run("Jan", "K", "jan-k2").lastInsertRowid;

    sqlite
      .prepare("INSERT INTO match_attendance (match_id, user_id, present, marked_by_admin_id) VALUES (?,?,1,?)")
      .run(matchId, playerId, adminA);
    sqlite
      .prepare("INSERT INTO match_wallet_charges (match_id, user_id, amount_pln, created_by_admin_id) VALUES (?,?,10,?)")
      .run(matchId, playerId, adminA);
    sqlite
      .prepare("INSERT INTO public_share_links (token, kind, created_by_admin_id) VALUES (?,?,?)")
      .run("tok123", "terminarz", adminA);
    sqlite
      .prepare("INSERT INTO ranking_seasons (name, started_by_admin_id) VALUES (?,?)")
      .run("Sezon test", adminA);

    await deleteUserAccountData(db, Number(adminA));

    expect(sqlite.prepare("SELECT id FROM users WHERE id = ?").get(adminA)).toBeUndefined();
    const attendance = sqlite
      .prepare("SELECT marked_by_admin_id FROM match_attendance WHERE match_id = ?")
      .get(matchId) as { marked_by_admin_id: number };
    expect(attendance.marked_by_admin_id).toBe(Number(adminB));
  });
});
