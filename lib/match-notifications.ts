import { getAppBaseUrl } from "@/lib/app-url";
import { getAppSettings } from "@/lib/app-settings";
import { getDb, type MatchRow } from "@/lib/db";
import { isMailConfigured, sendMail } from "@/lib/mail";
import { appendShareSessionQuery, terminarzInviteRelativePath } from "@/lib/share-link";

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

  const db = await getDb();
  const settings = await getAppSettings(db);
  if (!settings.match_email_notifications_enabled) {
    console.log("[match-notifications] Wysyłka wyłączona w ustawieniach aplikacji.");
    return;
  }
  const rows = (await db
    .prepare(
      `SELECT id, email, first_name FROM users
       WHERE match_notifications_consent = 1
         AND email IS NOT NULL
         AND TRIM(email) != ''`
    )
    .all()) as { id: number; email: string; first_name: string }[];

  if (rows.length === 0) {
    console.error(
      "[match-notifications] Brak odbiorców: nikt nie ma zapisanej zgody + e-maila (match_notifications_consent=1)."
    );
    return;
  }

  const base = getAppBaseUrl();
  const link = `${base}${appendShareSessionQuery(terminarzInviteRelativePath(match.id))}`;
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
      `Zapisz się na mecz (link prowadzi do wizytówki zaproszenia):`,
      link,
      "",
      `— ${settings.site_name}`,
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

export async function notifySignedUpPlayersAboutCancelledMatch(args: {
  matchId: number;
  matchDate: string;
  matchTime: string;
  location: string;
  reason: string;
}): Promise<void> {
  const db = await getDb();
  const settings = await getAppSettings(db);

  const players = (await db
    .prepare(
      `SELECT u.id, u.email, u.first_name
       FROM match_signups ms
       JOIN users u ON u.id = ms.user_id
       WHERE ms.match_id = ? AND COALESCE(ms.commitment, 1) = 1`
    )
    .all(args.matchId)) as { id: number; email: string | null; first_name: string }[];

  if (players.length === 0) return;

  if (isMailConfigured() && settings.match_email_notifications_enabled) {
    const subject = `Mecz odwołany — ${args.matchDate} ${args.matchTime}`;
    for (const row of players) {
      const email = row.email?.trim();
      if (!email) continue;
      const text = [
        `Cześć ${row.first_name},`,
        "",
        `Mecz został anulowany:`,
        `• Data: ${args.matchDate}`,
        `• Godzina: ${args.matchTime}`,
        `• Miejsce: ${args.location}`,
        `• Powód: ${args.reason}`,
        "",
        `Sprawdź terminarz na stronie akademii.`,
        "",
        `— ${settings.site_name}`,
      ].join("\n");
      try {
        await sendMail({ to: email, subject, text });
      } catch (e) {
        console.error(`[match-notifications] anulacja — błąd mail do user ${row.id}:`, e);
      }
    }
  }
}
