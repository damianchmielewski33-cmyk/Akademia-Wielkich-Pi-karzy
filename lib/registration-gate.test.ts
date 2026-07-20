import { afterEach, describe, expect, it, vi } from "vitest";
import { isSelfRegistrationAllowed } from "@/lib/registration-gate";

function mockDb(count: number, allowSelfReg: number | null = null) {
  return {
    prepare: (sql: string) => ({
      get: () => {
        if (sql.includes("COUNT")) return { c: count };
        if (sql.includes("allow_self_registration")) return { allow_self_registration: allowSelfReg };
        return undefined;
      },
    }),
  };
}

describe("isSelfRegistrationAllowed", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("allows bootstrap when database is empty", async () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(await isSelfRegistrationAllowed(mockDb(0))).toBe(true);
  });

  it("allows production registration by default in auto mode", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ALLOW_SELF_REGISTRATION", "");
    expect(await isSelfRegistrationAllowed(mockDb(3))).toBe(true);
  });

  it("blocks when ALLOW_SELF_REGISTRATION=0 in auto mode", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ALLOW_SELF_REGISTRATION", "0");
    expect(await isSelfRegistrationAllowed(mockDb(3))).toBe(false);
  });

  it("allows production registration when ALLOW_SELF_REGISTRATION=1", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ALLOW_SELF_REGISTRATION", "1");
    expect(await isSelfRegistrationAllowed(mockDb(3))).toBe(true);
  });

  it("allows development registration by default", async () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(await isSelfRegistrationAllowed(mockDb(5))).toBe(true);
  });

  it("respects admin panel force-open", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ALLOW_SELF_REGISTRATION", "");
    expect(await isSelfRegistrationAllowed(mockDb(3, 1))).toBe(true);
  });

  it("respects admin panel force-closed", async () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(await isSelfRegistrationAllowed(mockDb(3, 0))).toBe(false);
  });

  it("respects boolean false from settings object", async () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(await isSelfRegistrationAllowed(mockDb(3), { allow_self_registration: false })).toBe(false);
  });

  it("respects boolean true from settings object", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ALLOW_SELF_REGISTRATION", "0");
    expect(await isSelfRegistrationAllowed(mockDb(3), { allow_self_registration: true })).toBe(true);
  });
});
