export const VENUE_APPLICATIONS_SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS venue_applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contact_name TEXT NOT NULL,
    contact_email TEXT NOT NULL,
    contact_phone TEXT NOT NULL,
    venue_name TEXT NOT NULL,
    city TEXT NOT NULL,
    address TEXT NOT NULL,
    description TEXT,
    website TEXT,
    note TEXT,
    status TEXT NOT NULL CHECK (status IN ('pending','approved','rejected')) DEFAULT 'pending',
    admin_note TEXT,
    venue_id INTEGER,
    partner_user_id INTEGER,
    reviewed_by_admin_id INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    reviewed_at TEXT,
    FOREIGN KEY (venue_id) REFERENCES venues(id),
    FOREIGN KEY (partner_user_id) REFERENCES users(id),
    FOREIGN KEY (reviewed_by_admin_id) REFERENCES users(id)
  );
  CREATE INDEX IF NOT EXISTS idx_venue_applications_status ON venue_applications(status, created_at);
`;
