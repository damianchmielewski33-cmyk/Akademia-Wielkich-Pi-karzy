import { describe, expect, it, vi } from "vitest";
import { isMatchPaidForUser } from "@/lib/match-paid";

vi.mock("@/lib/wallet", () => ({
  getUserWalletBalancePln: vi.fn(),
}));

import { getUserWalletBalancePln } from "@/lib/wallet";

describe("isMatchPaidForUser", () => {
  const db = {} as never;

  it("returns true when paid flag is set", async () => {
    await expect(isMatchPaidForUser(db, { matchId: 1, userId: 2, paidFlag: 1 })).resolves.toBe(true);
  });

  it("returns true when wallet balance is non-negative", async () => {
    vi.mocked(getUserWalletBalancePln).mockResolvedValue(10);
    await expect(isMatchPaidForUser(db, { matchId: 1, userId: 2, paidFlag: 0 })).resolves.toBe(true);
  });

  it("returns false when unpaid and wallet is negative", async () => {
    vi.mocked(getUserWalletBalancePln).mockResolvedValue(-5);
    await expect(isMatchPaidForUser(db, { matchId: 1, userId: 2, paidFlag: 0 })).resolves.toBe(false);
  });
});
