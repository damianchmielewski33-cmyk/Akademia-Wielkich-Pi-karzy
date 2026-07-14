import type { AppDb } from "@/lib/db";
import { REALMS, type Realm } from "@/lib/realm";

export async function getMatchRealm(db: AppDb, matchId: number): Promise<Realm | null> {
  const row = (await db
    .prepare("SELECT COALESCE(realm, ?) AS realm FROM matches WHERE id = ?")
    .get(REALMS.ACADEMY, matchId)) as { realm: string } | undefined;
  if (!row) return null;
  return row.realm === REALMS.PZU_CUP ? REALMS.PZU_CUP : REALMS.ACADEMY;
}

export async function matchBelongsToRealm(db: AppDb, matchId: number, realm: Realm): Promise<boolean> {
  const matchRealm = await getMatchRealm(db, matchId);
  return matchRealm === realm;
}

export async function getUserRealm(db: AppDb, userId: number): Promise<Realm | null> {
  const row = (await db
    .prepare("SELECT COALESCE(realm, ?) AS realm FROM users WHERE id = ?")
    .get(REALMS.ACADEMY, userId)) as { realm: string } | undefined;
  if (!row) return null;
  return row.realm === REALMS.PZU_CUP ? REALMS.PZU_CUP : REALMS.ACADEMY;
}
