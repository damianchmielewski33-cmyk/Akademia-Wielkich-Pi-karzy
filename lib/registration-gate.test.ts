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

  it("always allows registration (empty db)", async () => {
    expect(await isSelfRegistrationAllowed(mockDb(0))).toBe(true);
  });

  it("always allows registration even when admin flag is closed", async () => {
    vi.stubEnv("ALLOW_SELF_REGISTRATION", "0");
    expect(await isSelfRegistrationAllowed(mockDb(3, 0))).toBe(true);
    expect(await isSelfRegistrationAllowed(mockDb(3), { allow_self_registration: false })).toBe(true);
  });

  it("always allows registration in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(await isSelfRegistrationAllowed(mockDb(5))).toBe(true);
  });
});
