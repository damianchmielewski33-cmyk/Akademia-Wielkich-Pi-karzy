import { getAppBaseUrl } from "@/lib/app-url";
import { getAppSettings } from "@/lib/app-settings";
import { getDb } from "@/lib/db";
import { isMailConfigured, sendMail } from "@/lib/mail";
import { sendPushToUserIds } from "@/lib/push-notifications";
import { getBookingById, type BookingRow } from "@/lib/booking";

async function userEmail(userId: number): Promise<{ email: string | null; first_name: string } | null> {
  const db = await getDb();
  return (
    ((await db
      .prepare("SELECT email, first_name FROM users WHERE id = ?")
      .get(userId)) as { email: string | null; first_name: string } | undefined) ?? null
  );
}

function bookingLines(booking: BookingRow): string[] {
  return [
    `• Obiekt: ${booking.venue_name ?? "—"}`,
    `• Boisko: ${booking.pitch_name ?? "—"}`,
    `• Data: ${booking.booking_date}`,
    `• Godzina: ${booking.start_time}–${booking.end_time}`,
    `• Kwota: ${Number(booking.amount_pln).toFixed(2)} zł`,
  ];
}

export async function notifyBookingConfirmed(bookingId: number): Promise<void> {
  const db = await getDb();
  const booking = await getBookingById(db, bookingId);
  if (!booking) return;
  const settings = await getAppSettings(db);
  const user = await userEmail(booking.user_id);
  const link = `${getAppBaseUrl()}/rezerwacje?booking=${booking.id}`;

  if (isMailConfigured() && user?.email?.trim()) {
    try {
      await sendMail({
        to: user.email.trim(),
        subject: `Rezerwacja potwierdzona — ${booking.booking_date} ${booking.start_time}`,
        text: [
          `Cześć ${user.first_name},`,
          "",
          "Twoja rezerwacja boiska została potwierdzona:",
          ...bookingLines(booking),
          "",
          `Szczegóły: ${link}`,
          "",
          `— ${settings.site_name}`,
        ].join("\n"),
      });
    } catch (e) {
      console.error(`[booking-notifications] confirm mail failed booking=${bookingId}`, e);
    }
  }

  await sendPushToUserIds({
    userIds: [booking.user_id],
    title: "Rezerwacja potwierdzona",
    body: `${booking.venue_name ?? "Boisko"} · ${booking.booking_date} ${booking.start_time}`,
    data: { type: "booking_confirmed", booking_id: String(booking.id) },
  });
}

export async function notifyBookingCancelled(bookingId: number): Promise<void> {
  const db = await getDb();
  const booking = await getBookingById(db, bookingId);
  if (!booking) return;
  const settings = await getAppSettings(db);
  const user = await userEmail(booking.user_id);
  const link = `${getAppBaseUrl()}/rezerwacje?booking=${booking.id}`;

  if (isMailConfigured() && user?.email?.trim()) {
    try {
      await sendMail({
        to: user.email.trim(),
        subject: `Rezerwacja anulowana — ${booking.booking_date} ${booking.start_time}`,
        text: [
          `Cześć ${user.first_name},`,
          "",
          "Rezerwacja boiska została anulowana:",
          ...bookingLines(booking),
          "",
          `Szczegóły: ${link}`,
          "",
          `— ${settings.site_name}`,
        ].join("\n"),
      });
    } catch (e) {
      console.error(`[booking-notifications] cancel mail failed booking=${bookingId}`, e);
    }
  }

  await sendPushToUserIds({
    userIds: [booking.user_id],
    title: "Rezerwacja anulowana",
    body: `${booking.venue_name ?? "Boisko"} · ${booking.booking_date} ${booking.start_time}`,
    data: { type: "booking_cancelled", booking_id: String(booking.id) },
  });
}
