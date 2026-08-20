export const BOOKING_SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS venues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    city TEXT NOT NULL,
    address TEXT NOT NULL,
    description TEXT,
    phone TEXT,
    email TEXT,
    photo_url TEXT,
    published INTEGER NOT NULL DEFAULT 1,
    owner_user_id INTEGER,
    commission_pct REAL NOT NULL DEFAULT 15,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_venues_city_published ON venues(city, published);

  CREATE TABLE IF NOT EXISTS venue_partner_invites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT NOT NULL UNIQUE,
    label TEXT,
    created_by_admin_id INTEGER NOT NULL,
    claimed_user_id INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT,
    revoked_at TEXT,
    claimed_at TEXT,
    FOREIGN KEY (created_by_admin_id) REFERENCES users(id),
    FOREIGN KEY (claimed_user_id) REFERENCES users(id)
  );
  CREATE INDEX IF NOT EXISTS idx_venue_partner_invites_token ON venue_partner_invites(token);

  CREATE TABLE IF NOT EXISTS venue_partners (
    user_id INTEGER PRIMARY KEY,
    invite_id INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    revoked_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (invite_id) REFERENCES venue_partner_invites(id)
  );

  CREATE TABLE IF NOT EXISTS venue_photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    venue_id INTEGER NOT NULL,
    url TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_venue_photos_venue ON venue_photos(venue_id, sort_order);

  CREATE TABLE IF NOT EXISTS pitches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    venue_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    surface TEXT NOT NULL DEFAULT 'sztuczna trawa',
    players INTEGER NOT NULL DEFAULT 10,
    indoor INTEGER NOT NULL DEFAULT 0,
    lighting INTEGER NOT NULL DEFAULT 1,
    amenities TEXT,
    base_price_pln REAL NOT NULL,
    slot_minutes INTEGER NOT NULL DEFAULT 60,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_pitches_venue_active ON pitches(venue_id, active);

  CREATE TABLE IF NOT EXISTS pitch_opening_hours (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pitch_id INTEGER NOT NULL,
    weekday INTEGER NOT NULL CHECK (weekday >= 0 AND weekday <= 6),
    opens_at TEXT NOT NULL,
    closes_at TEXT NOT NULL,
    FOREIGN KEY (pitch_id) REFERENCES pitches(id) ON DELETE CASCADE
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_pitch_opening_unique ON pitch_opening_hours(pitch_id, weekday);

  CREATE TABLE IF NOT EXISTS pitch_price_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pitch_id INTEGER NOT NULL,
    weekday INTEGER,
    start_time TEXT,
    end_time TEXT,
    price_pln REAL NOT NULL,
    label TEXT,
    FOREIGN KEY (pitch_id) REFERENCES pitches(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_pitch_price_rules_pitch ON pitch_price_rules(pitch_id, weekday, start_time);

  CREATE TABLE IF NOT EXISTS pitch_blocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pitch_id INTEGER NOT NULL,
    block_date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    reason TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (pitch_id) REFERENCES pitches(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_pitch_blocks_pitch_date ON pitch_blocks(pitch_id, block_date);

  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    pitch_id INTEGER NOT NULL,
    booking_date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    amount_pln REAL NOT NULL,
    platform_fee_pln REAL,
    owner_payout_pln REAL,
    payout_id INTEGER,
    status TEXT NOT NULL CHECK (status IN ('pending','confirmed','cancelled','expired')) DEFAULT 'pending',
    contact_name TEXT NOT NULL,
    contact_phone TEXT NOT NULL,
    contact_email TEXT,
    access_token TEXT,
    note TEXT,
    hotpay_session_id TEXT,
    expires_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (pitch_id) REFERENCES pitches(id)
  );
  CREATE INDEX IF NOT EXISTS idx_bookings_pitch_date_time ON bookings(pitch_id, booking_date, start_time, end_time);
  CREATE INDEX IF NOT EXISTS idx_bookings_user_created ON bookings(user_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_bookings_status_expires ON bookings(status, expires_at);

  CREATE TABLE IF NOT EXISTS booking_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id INTEGER NOT NULL,
    provider TEXT NOT NULL DEFAULT 'hotpay',
    amount_pln REAL NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending','success','failure','cancelled')) DEFAULT 'pending',
    hotpay_session_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at TEXT,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_booking_payments_booking ON booking_payments(booking_id);
  CREATE INDEX IF NOT EXISTS idx_booking_payments_session ON booking_payments(hotpay_session_id);

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

/** Indeks po ALTER — nie może być w CREATE TABLE IF NOT EXISTS, bo stara tabela `venues` nie ma jeszcze kolumny. */
export const VENUES_OWNER_INDEX_SQL =
  "CREATE INDEX IF NOT EXISTS idx_venues_owner ON venues(owner_user_id)";

export const BOOKINGS_ACCESS_TOKEN_INDEX_SQL =
  "CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_access_token ON bookings(access_token)";

export const BOOKING_GUEST_COLUMN_ALTERS: Array<{ column: string; ddl: string }> = [
  { column: "contact_email", ddl: "ALTER TABLE bookings ADD COLUMN contact_email TEXT" },
  { column: "access_token", ddl: "ALTER TABLE bookings ADD COLUMN access_token TEXT" },
];
