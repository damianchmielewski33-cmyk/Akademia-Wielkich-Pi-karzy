import type { AppDb } from "@/lib/db";

/**
 * Usuwa konto użytkownika i wszystkie powiązane rekordy (kolejność pod klucze obce).
 */
export async function deleteUserAccountData(db: AppDb, userId: number): Promise<void> {
  const signupMatchIds = (await db
    .prepare("SELECT match_id, COALESCE(commitment, 1) AS commitment FROM match_signups WHERE user_id = ?")
    .all(userId)) as { match_id: number; commitment: number }[];

  for (const row of signupMatchIds) {
    if (row.commitment === 1) {
      await db
        .prepare("UPDATE matches SET signed_up = signed_up - 1 WHERE id = ? AND signed_up > 0")
        .run(row.match_id);
    }
  }

  await db.prepare("DELETE FROM wallet_transactions WHERE user_id = ?").run(userId);
  await db.prepare("DELETE FROM wallet_deposit_requests WHERE user_id = ?").run(userId);
  await db.prepare("DELETE FROM match_wallet_charges WHERE user_id = ?").run(userId);

  await db.prepare("UPDATE page_views SET user_id = NULL WHERE user_id = ?").run(userId);
  await db.prepare("UPDATE activity_log SET user_id = NULL WHERE user_id = ?").run(userId);
  await db.prepare("UPDATE admin_messages SET read_by_admin_id = NULL WHERE read_by_admin_id = ?").run(userId);
  await db.prepare("DELETE FROM admin_messages WHERE user_id = ?").run(userId);
  await db.prepare("UPDATE public_share_links SET user_id = NULL WHERE user_id = ?").run(userId);

  await db.prepare("DELETE FROM match_transport_messages WHERE user_id = ?").run(userId);
  await db.prepare("DELETE FROM match_participation_survey WHERE user_id = ?").run(userId);
  await db.prepare("DELETE FROM match_attendance WHERE user_id = ?").run(userId);
  await db.prepare("DELETE FROM match_lineup_slots WHERE user_id = ?").run(userId);
  await db.prepare("DELETE FROM match_stats WHERE user_id = ?").run(userId);
  await db.prepare("DELETE FROM standalone_match_stats WHERE user_id = ?").run(userId);
  await db.prepare("DELETE FROM participation_survey_answer WHERE user_id = ?").run(userId);
  await db.prepare("DELETE FROM match_signups WHERE user_id = ?").run(userId);

  const fallbackAdmin = (await db
    .prepare("SELECT id FROM users WHERE is_admin = 1 AND id != ? ORDER BY id LIMIT 1")
    .get(userId)) as { id: number } | undefined;
  const fallbackAdminId = fallbackAdmin?.id ?? null;

  if (fallbackAdminId != null) {
    await db
      .prepare("UPDATE match_attendance SET marked_by_admin_id = ? WHERE marked_by_admin_id = ?")
      .run(fallbackAdminId, userId);
    await db
      .prepare("UPDATE match_wallet_charges SET created_by_admin_id = ? WHERE created_by_admin_id = ?")
      .run(fallbackAdminId, userId);
    await db
      .prepare("UPDATE public_share_links SET created_by_admin_id = ? WHERE created_by_admin_id = ?")
      .run(fallbackAdminId, userId);
    await db
      .prepare("UPDATE ranking_seasons SET started_by_admin_id = ? WHERE started_by_admin_id = ?")
      .run(fallbackAdminId, userId);
    await db
      .prepare("UPDATE ranking_seasons SET ended_by_admin_id = ? WHERE ended_by_admin_id = ?")
      .run(fallbackAdminId, userId);
  } else {
    await db.prepare("DELETE FROM match_attendance WHERE marked_by_admin_id = ?").run(userId);
    await db.prepare("DELETE FROM match_wallet_charges WHERE created_by_admin_id = ?").run(userId);
    await db.prepare("DELETE FROM public_share_links WHERE created_by_admin_id = ?").run(userId);
    await db.prepare("DELETE FROM ranking_seasons WHERE started_by_admin_id = ?").run(userId);
  }

  await db.prepare("DELETE FROM users WHERE id = ?").run(userId);
}
