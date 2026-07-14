import { cache } from "react";
import type { AppSession } from "@/lib/auth";
import type { AppDb } from "@/lib/db";
import { getDb } from "@/lib/db";
import { getUserRealm } from "@/lib/realm-db";
import { REALMS } from "@/lib/realm";

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

/** Dostęp do sekcji PZU Cup: gracz turnieju lub organizator z Akademii. */
export async function canAccessPzuCup(session: AppSession | null): Promise<boolean> {
  if (!session) return false;
  const db = await getDb();
  const userRealm = await getUserRealm(db, session.userId);
  if (userRealm === REALMS.PZU_CUP) return true;
  return userHasPzuCupAccess(db, session.userId, session.isAdmin);
}
