import type { AppDb } from "@/lib/db";

export type AdminMessageStatus = "unread" | "read";

export type AdminMessageRow = {
  id: number;
  user_id: number | null;
  sender_name: string;
  sender_email: string | null;
  body: string;
  status: AdminMessageStatus;
  read_at: string | null;
  read_by_admin_id: number | null;
  created_at: string;
};

export async function getUnreadAdminMessageCount(db: AppDb): Promise<number> {
  const row = (await db
    .prepare("SELECT COUNT(*) AS c FROM admin_messages WHERE status = 'unread'")
    .get()) as { c: number };
  return row.c;
}
