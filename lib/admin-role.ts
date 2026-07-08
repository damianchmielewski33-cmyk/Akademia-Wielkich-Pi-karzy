type DbLike = {
  prepare: (sql: string) => {
    get: (...args: unknown[]) => unknown;
    run: (...args: unknown[]) => unknown;
  };
};

export async function countAdmins(db: DbLike): Promise<number> {
  const row = (await db.prepare("SELECT COUNT(*) AS c FROM users WHERE is_admin = 1").get()) as
    | { c: number }
    | undefined;
  return row?.c ?? 0;
}

/** Zwraca komunikat błędu, jeśli odebranie roli admina nie jest dozwolone. */
export async function adminDemotionBlockedReason(
  db: DbLike,
  targetUserId: number,
  actorUserId: number,
  nextRole: "admin" | "player"
): Promise<string | null> {
  if (nextRole === "admin") return null;

  if (targetUserId === actorUserId) {
    return "Nie możesz odebrać sobie roli administratora.";
  }

  const target = (await db.prepare("SELECT is_admin FROM users WHERE id = ?").get(targetUserId)) as
    | { is_admin: number }
    | undefined;
  if (!target || target.is_admin !== 1) return null;

  const admins = await countAdmins(db);
  if (admins <= 1) {
    return "Nie można odebrać roli ostatniemu administratorowi.";
  }

  return null;
}

export async function bumpAuthVersion(db: DbLike, userId: number): Promise<void> {
  await db
    .prepare("UPDATE users SET auth_version = auth_version + 1 WHERE id = ?")
    .run(userId);
}
