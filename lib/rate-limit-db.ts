import { getDb } from "@/lib/db";
import { checkRateLimit as checkMemoryRateLimit } from "@/lib/rate-limit";

/** Rate limit z fallbackiem: najpierw baza (współdzielona), potem pamięć procesu. */
export async function checkRateLimitDistributed(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ ok: true } | { ok: false; retryAfterSec: number }> {
  try {
    const db = await getDb();
    const now = Date.now();
    const resetAtIso = new Date(now + windowMs).toISOString();

    const row = (await db
      .prepare("SELECT count, reset_at FROM rate_limit_buckets WHERE bucket_key = ?")
      .get(key)) as { count: number; reset_at: string } | undefined;

    if (!row || new Date(row.reset_at).getTime() <= now) {
      await db
        .prepare(
          `INSERT INTO rate_limit_buckets (bucket_key, count, reset_at) VALUES (?, 1, ?)
           ON CONFLICT(bucket_key) DO UPDATE SET count = 1, reset_at = excluded.reset_at`
        )
        .run(key, resetAtIso);
      return { ok: true };
    }

    if (row.count < limit) {
      await db
        .prepare("UPDATE rate_limit_buckets SET count = count + 1 WHERE bucket_key = ?")
        .run(key);
      return { ok: true };
    }

    const retryAfterSec = Math.max(
      1,
      Math.ceil((new Date(row.reset_at).getTime() - now) / 1000)
    );
    return { ok: false, retryAfterSec };
  } catch {
    return checkMemoryRateLimit(key, limit, windowMs);
  }
}
