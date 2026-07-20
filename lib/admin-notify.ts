import { getAppSettings } from "@/lib/app-settings";
import { getDb } from "@/lib/db";
import { isMailConfigured, sendMail } from "@/lib/mail";

export async function notifyAdminsByEmail(subject: string, body: string): Promise<void> {
  if (!isMailConfigured()) return;
  const db = await getDb();
  const settings = await getAppSettings(db);
  const recipients = new Set<string>();
  if (settings.contact_email?.trim()) recipients.add(settings.contact_email.trim());
  if (settings.organizer_damian_email?.trim()) recipients.add(settings.organizer_damian_email.trim());
  if (settings.organizer_mateusz_email?.trim()) recipients.add(settings.organizer_mateusz_email.trim());

  for (const to of recipients) {
    try {
      await sendMail({ to, subject, text: body });
    } catch (e) {
      console.error("[admin-notify] mail failed", to, e);
    }
  }
}
