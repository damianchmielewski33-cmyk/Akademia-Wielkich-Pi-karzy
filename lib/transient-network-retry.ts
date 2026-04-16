/** Kody błędów sieciowych, przy których warto ponowić żądanie (Turso / libSQL przez HTTP). */
const TRANSIENT_CODES = new Set([
  "ECONNRESET",
  "ETIMEDOUT",
  "ECONNREFUSED",
  "EPIPE",
  "UND_ERR_SOCKET",
]);

function readCode(err: unknown): string | undefined {
  if (!err || typeof err !== "object") return undefined;
  const o = err as { code?: unknown; errno?: unknown; cause?: unknown };
  if (typeof o.code === "string") return o.code;
  if (typeof o.errno === "string") return o.errno;
  if (typeof o.errno === "number") return String(o.errno);
  if (o.cause) return readCode(o.cause);
  return undefined;
}

export function isTransientNetworkError(err: unknown): boolean {
  const code = readCode(err);
  if (code && TRANSIENT_CODES.has(code)) return true;
  if (err instanceof Error && /ECONNRESET|ETIMEDOUT|ECONNREFUSED|EPIPE/i.test(err.message)) {
    return true;
  }
  return false;
}

export type TransientRetryOptions = {
  maxAttempts?: number;
  baseDelayMs?: number;
  /** Wywoływane po nieudanej próbie, przed opóźnieniem i kolejną próbą (np. nowy klient libSQL). */
  onBeforeRetry?: (attempt: number) => void;
};

/**
 * Ponawia `fn` przy przejściowych błędach sieci (np. ECONNRESET do Turso /v2/pipeline).
 */
export async function withTransientNetworkRetries<T>(
  fn: () => Promise<T>,
  options?: TransientRetryOptions
): Promise<T> {
  const maxAttempts = options?.maxAttempts ?? 5;
  const baseDelayMs = options?.baseDelayMs ?? 400;
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const retryable = isTransientNetworkError(err) && attempt < maxAttempts;
      if (!retryable) throw err;
      options?.onBeforeRetry?.(attempt);
      const delay = baseDelayMs * 2 ** (attempt - 1);
      await new Promise((r) => setTimeout(r, Math.min(delay, 10_000)));
    }
  }
  throw lastError;
}
