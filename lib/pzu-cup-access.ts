import { cache } from "react";
import type { AppDb } from "@/lib/db";
import { getDb } from "@/lib/db";

/** Administratorzy mają dostęp do sekcji PZU Cup bez osobnego przełącznika. */
export async function userHasPzuCupAccess(db: AppDb, userId: number, isAdmin?: boolean): Promise<boolean> {
  if (isAdmin) return true;
  const row = (await db
    .prepare("SELECT COALESCE(can_pzu_cup, 0) AS can_pzu_cup, COALESCE(is_admin, 0) AS is_admin FROM users WHERE id = ?")
    .get(userId)) as { can_pzu_cup: number; is_admin: number } | undefined;
  if (!row) return false;
  return row.is_admin === 1 || row.can_pzu_cup === 1;
}

export const getPzuCupAccessForUser = cache(async (userId: number, isAdmin?: boolean): Promise<boolean> => {
  const db = await getDb();
  return userHasPzuCupAccess(db, userId, isAdmin);
});
