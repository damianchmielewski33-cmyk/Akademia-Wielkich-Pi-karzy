import type { AppSettings } from "@/lib/app-settings";

export const CONTACT_ADMIN_RECIPIENT_KEYS = ["damian", "mateusz"] as const;

export type ContactAdminRecipientKey = (typeof CONTACT_ADMIN_RECIPIENT_KEYS)[number];

export type ContactAdminRecipientOption = {
  key: ContactAdminRecipientKey;
  label: string;
};

export function contactAdminRecipientsFromSettings(settings: AppSettings): ContactAdminRecipientOption[] {
  return [
    { key: "damian", label: settings.organizer_damian_name },
    { key: "mateusz", label: settings.organizer_mateusz_name },
  ];
}

export function isContactAdminRecipientKey(value: string): value is ContactAdminRecipientKey {
  return (CONTACT_ADMIN_RECIPIENT_KEYS as readonly string[]).includes(value);
}

export function contactAdminRecipientLabel(
  key: string | null | undefined,
  settings: AppSettings
): string | null {
  if (key === "damian") return settings.organizer_damian_name;
  if (key === "mateusz") return settings.organizer_mateusz_name;
  return null;
}
