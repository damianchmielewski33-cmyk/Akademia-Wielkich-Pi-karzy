import { getAppBaseUrl } from "@/lib/app-url";
import { getDb, type MatchRow } from "@/lib/db";
import { isMailConfigured, sendMail } from "@/lib/mail";

/**
 * Po dodaniu meczu: e-mail do użytkowników z podanym adresem i zgodą.
 * Musi być awaitowane w route handlerze — na serverless „fire and forget” często nie kończy wysyłki.
 */
export async function notifySubscribersAboutNewMatch(match: MatchRow): Promise<void> {
  if (!isMailConfigured()) {
    console.error(
      "[match-notifications] Brak SMTP w środowisku (SMTP_HOST, SMTP_FROM). Powiadomienia e-mail wyłączone."
    );
    return;
  }

  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, email, first_name FROM users
       WHERE match_notifications_consent = 1
         AND email IS NOT NULL
         AND TRIM(email) != ''`
    )
    .all() as { id: number; email: string; first_name: string }[];

  if (rows.length === 0) {
    console.error(
      "[match-notifications] Brak odbiorców: nikt nie ma zapisanej zgody + e-maila (match_notifications_consent=1)."
    );
    return;
  }

  const base = getAppBaseUrl();
  const link = `${base}/terminarz?mecz=${match.id}`;
  const subject = `Nowy termin meczu — ${match.match_date} ${match.match_time}`;

  let sent = 0;
  for (const row of rows) {
    const text = [
      `Cześć ${row.first_name},`,
      "",
      `Dodano nowy mecz w terminarzu:`,
      `• Data: ${match.match_date}`,
      `• Godzina: ${match.match_time}`,
      `• Miejsce: ${match.location}`,
      "",
      `Zapisz się na mecz (link prowadzi do terminarza z wyróżnionym terminem):`,
      link,
      "",
      `— Akademia Wielkich Piłkarzy`,
    ].join("\n");
    try {
      await sendMail({
        to: row.email.trim(),
        subject,
        text,
      });
      sent++;
    } catch (e) {
      console.error(`[match-notifications] Błąd wysyłki do user ${row.id}:`, e);
    }
  }
  if (sent < rows.length) {
    console.error(
      `[match-notifications] Mecz id=${match.id}: tylko ${sent}/${rows.length} wysłanych — część mogła się nie udać (szczegóły wyżej).`
    );
  } else {
    console.log(`[match-notifications] Mecz id=${match.id}: wysłano ${sent}/${rows.length} wiadomości.`);
  }
}
