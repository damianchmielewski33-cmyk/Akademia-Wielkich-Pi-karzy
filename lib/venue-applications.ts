import type { AppDb } from "@/lib/db";
import { createVenue } from "@/lib/booking";
import { ensurePartnerUser } from "@/lib/booking-accounts";
import { grantVenuePartner } from "@/lib/venue-partners";
import { getAppBaseUrl } from "@/lib/app-url";
import { isMailConfigured, sendMail } from "@/lib/mail";
import { notifyAdminsByEmail } from "@/lib/admin-notify";
import { getAppSettings } from "@/lib/app-settings";

export type VenueApplicationStatus = "pending" | "approved" | "rejected";

export type VenueApplication = {
  id: number;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  venue_name: string;
  city: string;
  address: string;
  description: string | null;
  website: string | null;
  note: string | null;
  status: VenueApplicationStatus;
  admin_note: string | null;
  venue_id: number | null;
  partner_user_id: number | null;
  reviewed_by_admin_id: number | null;
  created_at: string;
  reviewed_at: string | null;
};

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

export async function ensureVenueApplicationsSchema(db: AppDb): Promise<void> {
  await db.exec(VENUE_APPLICATIONS_SCHEMA_SQL);
}

export async function submitVenueApplication(
  db: AppDb,
  args: {
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    venueName: string;
    city: string;
    address: string;
    description?: string | null;
    website?: string | null;
    note?: string | null;
  }
): Promise<{ ok: true; application: VenueApplication } | { ok: false; error: string }> {
  await ensureVenueApplicationsSchema(db);
  const email = args.contactEmail.trim().toLowerCase();
  const venueName = args.venueName.trim();
  const city = args.city.trim();
  const duplicate = await db
    .prepare(
      `SELECT id FROM venue_applications
       WHERE status = 'pending'
         AND LOWER(contact_email) = ?
         AND LOWER(venue_name) = ?
         AND LOWER(city) = ?
       LIMIT 1`
    )
    .get<{ id: number }>(email, venueName.toLowerCase(), city.toLowerCase());
  if (duplicate) {
    return { ok: false, error: "To zgłoszenie już czeka na weryfikację. Damy znać mailem po decyzji." };
  }

  const inserted = await db
    .prepare(
      `INSERT INTO venue_applications
        (contact_name, contact_email, contact_phone, venue_name, city, address, description, website, note, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`
    )
    .run(
      args.contactName.trim(),
      email,
      args.contactPhone.trim(),
      venueName,
      city,
      args.address.trim(),
      args.description?.trim() || null,
      args.website?.trim() || null,
      args.note?.trim() || null
    );

  const application = await getVenueApplication(db, Number(inserted.lastInsertRowid));
  if (!application) return { ok: false, error: "Nie udało się zapisać zgłoszenia." };

  void notifyAdminsByEmail(
    `Nowe zgłoszenie hali: ${application.venue_name} (${application.city})`,
    [
      `${application.contact_name} zgłosił obiekt bez tokenu zaproszenia.`,
      `Email: ${application.contact_email}`,
      `Telefon: ${application.contact_phone}`,
      `Adres: ${application.address}`,
      application.description ? `Opis: ${application.description}` : null,
      `Panel: ${getAppBaseUrl()}/panel-admina`,
    ]
      .filter(Boolean)
      .join("\n")
  );
  if (isMailConfigured()) {
    try {
      const settings = await getAppSettings(db);
      await sendMail({
        to: application.contact_email,
        subject: `Zgłoszenie obiektu: ${application.venue_name}`,
        text: [
          `Cześć ${application.contact_name},`,
          "",
          "Dziękujemy za zgłoszenie hali. Sprawdzimy dane i wrócimy z decyzją — bez linku zaproszenia od znajomych.",
          `Obiekt: ${application.venue_name}, ${application.city}`,
          "",
          `— ${settings.site_name}`,
        ].join("\n"),
      });
    } catch (e) {
      console.error("[venue-applications] confirm mail failed", e);
    }
  }
  return { ok: true, application };
}

export async function listVenueApplications(db: AppDb): Promise<VenueApplication[]> {
  await ensureVenueApplicationsSchema(db);
  return db
    .prepare(
      `SELECT * FROM venue_applications
       ORDER BY CASE status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END, created_at DESC, id DESC`
    )
    .all<VenueApplication>();
}

export async function getVenueApplication(db: AppDb, id: number): Promise<VenueApplication | null> {
  await ensureVenueApplicationsSchema(db);
  const row = await db.prepare("SELECT * FROM venue_applications WHERE id = ?").get<VenueApplication>(id);
  return row ?? null;
}

export async function rejectVenueApplication(
  db: AppDb,
  args: { applicationId: number; adminUserId: number; adminNote?: string | null }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const application = await getVenueApplication(db, args.applicationId);
  if (!application) return { ok: false, error: "Nie znaleziono zgłoszenia." };
  if (application.status !== "pending") return { ok: false, error: "To zgłoszenie jest już rozpatrzone." };
  await db
    .prepare(
      `UPDATE venue_applications
       SET status = 'rejected', admin_note = ?, reviewed_by_admin_id = ?, reviewed_at = datetime('now')
       WHERE id = ? AND status = 'pending'`
    )
    .run(args.adminNote?.trim() || null, args.adminUserId, args.applicationId);
  return { ok: true };
}

export async function approveVenueApplication(
  db: AppDb,
  args: { applicationId: number; adminUserId: number; publish?: boolean; adminNote?: string | null }
): Promise<
  | { ok: true; venueId: number; partnerUserId: number; pin: string | null }
  | { ok: false; error: string }
> {
  const application = await getVenueApplication(db, args.applicationId);
  if (!application) return { ok: false, error: "Nie znaleziono zgłoszenia." };
  if (application.status !== "pending") return { ok: false, error: "To zgłoszenie jest już rozpatrzone." };

  const partner = await ensurePartnerUser(db, {
    name: application.contact_name,
    email: application.contact_email,
  });
  await grantVenuePartner(db, partner.userId);
  const venue = await createVenue(db, {
    name: application.venue_name,
    city: application.city,
    address: application.address,
    description: application.description,
    phone: application.contact_phone,
    email: application.contact_email,
    published: args.publish === true,
    ownerUserId: partner.userId,
  });

  await db
    .prepare(
      `UPDATE venue_applications
       SET status = 'approved',
           admin_note = ?,
           venue_id = ?,
           partner_user_id = ?,
           reviewed_by_admin_id = ?,
           reviewed_at = datetime('now')
       WHERE id = ? AND status = 'pending'`
    )
    .run(args.adminNote?.trim() || null, venue.id, partner.userId, args.adminUserId, args.applicationId);

  const base = getAppBaseUrl();
  if (isMailConfigured()) {
    try {
      const settings = await getAppSettings(db);
      await sendMail({
        to: application.contact_email,
        subject: `Obiekt zaakceptowany: ${application.venue_name}`,
        text: [
          `Cześć ${application.contact_name},`,
          "",
          "Zgłoszenie hali przeszło weryfikację.",
          args.publish
            ? "Obiekt jest już widoczny w katalogu — dokończ zdjęcia, cennik i godziny w panelu."
            : "Obiekt czeka na publikację. Dodaj boisko, cennik, godziny i zdjęcia w panelu partnera.",
          "",
          `Panel: ${base}/partner`,
          `Logowanie: ${base}/login?next=/partner`,
          partner.pin
            ? `PIN do panelu (imię i nazwisko z zgłoszenia): ${partner.pin}`
            : "Wejdź istniejącym PIN-em przypisanym do tego adresu e-mail.",
          "",
          "W panelu widać obrót, prowizję 15% i termin przelewu.",
          "",
          `— ${settings.site_name}`,
        ].join("\n"),
      });
    } catch (e) {
      console.error("[venue-applications] approve mail failed", e);
    }
  }

  return { ok: true, venueId: venue.id, partnerUserId: partner.userId, pin: partner.pin };
}
