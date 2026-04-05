import { afterEach, describe, expect, it, vi } from "vitest";
import { checkRateLimit, clearRateLimitStore, getClientIp, rateLimitKey } from "@/lib/rate-limit";

describe("checkRateLimit", () => {
  afterEach(() => {
    clearRateLimitStore();
    vi.useRealTimers();
  });

  it("allows requests up to the limit", () => {
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit("a", 5, 60_000).ok).toBe(true);
    }
  });

  it("blocks after limit until window resets", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-05T12:00:00.000Z"));
    for (let i = 0; i < 3; i++) {
      expect(checkRateLimit("b", 3, 10_000).ok).toBe(true);
    }
    const blocked = checkRateLimit("b", 3, 10_000);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.retryAfterSec).toBeGreaterThan(0);
    }
    vi.advanceTimersByTime(10_001);
    expect(checkRateLimit("b", 3, 10_000).ok).toBe(true);
  });
});

describe("getClientIp / rateLimitKey", () => {
  it("reads first x-forwarded-for hop", () => {
    const req = new Request("https://example.com", {
      headers: { "x-forwarded-for": "203.0.113.1, 10.0.0.1" },
    });
    expect(getClientIp(req)).toBe("203.0.113.1");
    expect(rateLimitKey("t", req)).toBe("t:203.0.113.1");
  });

  it("falls back to x-real-ip then unknown", () => {
    expect(
      getClientIp(
        new Request("https://example.com", {
          headers: { "x-real-ip": "198.51.100.2" },
        })
      )
    ).toBe("198.51.100.2");
    expect(getClientIp(new Request("https://example.com"))).toBe("unknown");
  });
});
