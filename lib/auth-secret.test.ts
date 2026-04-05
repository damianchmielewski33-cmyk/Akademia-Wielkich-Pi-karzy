import { afterEach, describe, expect, it, vi } from "vitest";
import { getAuthSecretKey } from "@/lib/auth-secret";

describe("getAuthSecretKey", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("in development accepts AUTH_SECRET when at least 32 chars", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("AUTH_SECRET", "a".repeat(32));
    const key = getAuthSecretKey();
    expect(key.byteLength).toBeGreaterThan(0);
  });

  it("in production throws when AUTH_SECRET is missing", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_SECRET", "");
    expect(() => getAuthSecretKey()).toThrow(/AUTH_SECRET/);
  });

  it("in production throws when AUTH_SECRET is too short", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_SECRET", "short-secret");
    expect(() => getAuthSecretKey()).toThrow(/32/);
  });

  it("in production accepts long AUTH_SECRET", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_SECRET", "b".repeat(32));
    expect(() => getAuthSecretKey()).not.toThrow();
  });
});
