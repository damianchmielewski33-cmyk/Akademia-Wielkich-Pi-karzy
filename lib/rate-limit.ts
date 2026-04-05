import { NextResponse } from "next/server";

type Bucket = { count: number; resetAt: number };

const store = new Map<string, Bucket>();

/** Czyści liczniki (np. między testami). */
export function clearRateLimitStore() {
  store.clear();
}

/** Prosty limiter in-memory (jedna instancja Node). Przy wielu replikach każda ma własny licznik. */
export function checkRateLimit(key: string, limit: number, windowMs: number): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  if (store.size > 5000) {
    for (const [k, b] of store) {
      if (now >= b.resetAt) store.delete(k);
    }
  }
  const existing = store.get(key);
  if (!existing || now >= existing.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if (existing.count < limit) {
    existing.count += 1;
    return { ok: true };
  }
  return { ok: false, retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)) };
}

export function getClientIp(req: Request): string {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) {
    const first = xf.split(",")[0]?.trim();
    if (first) return first.slice(0, 64);
  }
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real.slice(0, 64);
  return "unknown";
}

export function rateLimitKey(prefix: string, req: Request): string {
  return `${prefix}:${getClientIp(req)}`;
}

export function rateLimitedResponse(retryAfterSec: number) {
  const res = NextResponse.json(
    { error: "Zbyt wiele żądań. Spróbuj ponownie za chwilę." },
    { status: 429 }
  );
  res.headers.set("Retry-After", String(retryAfterSec));
  return res;
}

export const RATE = {
  login: { limit: 30, windowMs: 15 * 60 * 1000 },
  register: { limit: 10, windowMs: 60 * 60 * 1000 },
  pageView: { limit: 200, windowMs: 60 * 1000 },
} as const;
