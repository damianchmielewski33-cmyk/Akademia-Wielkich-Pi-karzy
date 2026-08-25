import { getAppBaseUrl } from "@/lib/app-url";
import { getAppSettings } from "@/lib/app-settings";
import { getDb, type MatchRow } from "@/lib/db";
import { isMailConfigured, sendMail } from "@/lib/mail";
import { appendShareSessionQuery, terminarzInviteRelativePath } from "@/lib/share-link";
import { sendPushToConsentingUsers, sendPushToUserIds } from "@/lib/push-notifications";

/**
 * Po dodaniu meczu: e-mail do użytkowników z podanym adresem i zgodą + push
 * (FCM Android + Web Push / Safari PWA) do zarejestrowanych urządzeń.
 * Musi być awaitowane w route handlerze — na serverless „fire and forget” często nie kończy wysyłki.
 */
export async function notifySubscribersAboutNewMatch(match: MatchRow): Promise<void> {
  const db = await getDb();
  const settings = await getAppSettings(db);

  if (!isMailConfigured()) {
    console.error(
      "[match-notifications] Brak SMTP w środowisku (SMTP_HOST, SMTP_FROM). Powiadomienia e-mail wyłączone."
    );
  } else if (!settings.match_email_notifications_enabled) {
    console.log("[match-notifications] Wysyłka e-mail wyłączona w ustawieniach aplikacji.");
  } else {
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
    } else {
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
  }

  await sendPushToConsentingUsers({
    title: "Nowy termin meczu",
    body: `${match.match_date} ${match.match_time} · ${match.location}`,
    data: {
      type: "new_match",
      match_id: String(match.id),
    },
  });
}

export async function notifySignedUpPlayersAboutCancelledMatch(args: {
  matchId: number;
  matchDate: string;
  matchTime: string;
  location: string;
  reason: string;
  refundedPln?: number;
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

  const refundLine =
    args.refundedPln != null && args.refundedPln > 0
      ? "Jeśli opłaciłeś wpisowe (koszyk lub rozliczenie), środki wróciły na portfel w Serwisie."
      : null;

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
        ...(refundLine ? [refundLine, ""] : []),
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

  await sendPushToUserIds({
    userIds: players.map((p) => p.id),
    title: "Mecz odwołany",
    body:
      args.refundedPln != null && args.refundedPln > 0
        ? `${args.matchDate} ${args.matchTime} · zwrot na portfel · ${args.reason}`
        : `${args.matchDate} ${args.matchTime} · ${args.reason}`,
    data: {
      type: "match_cancelled",
      match_id: String(args.matchId),
    },
  });
}

export type MatchRosterAdminAction = "signup" | "unsubscribe";

export function adminIdsForRosterPush(adminIds: number[], excludeUserId?: number): number[] {
  const unique = [...new Set(adminIds.filter((id) => Number.isFinite(id) && id > 0))];
  if (excludeUserId == null) return unique;
  return unique.filter((id) => id !== excludeUserId);
}

export function adminMatchRosterPushCopy(args: {
  action: MatchRosterAdminAction;
  playerName: string;
  matchDate: string;
  matchTime: string;
  location: string;
}): { title: string; body: string } {
  const when = `${args.matchDate} ${args.matchTime} · ${args.location}`;
  if (args.action === "signup") {
    return {
      title: "Nowy zapis na mecz",
      body: `${args.playerName} — zapis na mecz ${when}`,
    };
  }
  return {
    title: "Wypis z meczu",
    body: `${args.playerName} — wypis z meczu ${when}`,
  };
}

async function playerDisplayName(userId: number): Promise<string> {
  const db = await getDb();
  const row = (await db
    .prepare("SELECT first_name, last_name, player_alias FROM users WHERE id = ?")
    .get(userId)) as { first_name: string; last_name: string; player_alias: string | null } | undefined;
  if (!row) return "Zawodnik";
  const full = `${row.first_name} ${row.last_name}`.trim();
  const nick = row.player_alias?.trim();
  if (full && nick) return `${full} (${nick})`;
  return full || nick || "Zawodnik";
}

/**
 * Push na telefony administratorów (FCM Android + Web Push), gdy ktoś zapisze się
 * lub wypisze z meczu. Pomija osobę, która wykonała akcję (np. admin dopisujący ręcznie).
 */
export async function notifyAdminsAboutMatchRosterChange(args: {
  action: MatchRosterAdminAction;
  matchId: number;
  matchDate: string;
  matchTime: string;
  location: string;
  playerUserId: number;
  excludeUserId?: number;
}): Promise<void> {
  const db = await getDb();
  const admins = (await db
    .prepare("SELECT id FROM users WHERE COALESCE(is_admin, 0) = 1")
    .all()) as { id: number }[];
  const userIds = adminIdsForRosterPush(
    admins.map((a) => a.id),
    args.excludeUserId ?? args.playerUserId
  );
  if (userIds.length === 0) return;

  const playerName = await playerDisplayName(args.playerUserId);
  const copy = adminMatchRosterPushCopy({
    action: args.action,
    playerName,
    matchDate: args.matchDate,
    matchTime: args.matchTime,
    location: args.location,
  });

  await sendPushToUserIds({
    userIds,
    title: copy.title,
    body: copy.body,
    data: {
      type: args.action === "signup" ? "match_signup" : "match_unsubscribe",
      match_id: String(args.matchId),
    },
  });
}
