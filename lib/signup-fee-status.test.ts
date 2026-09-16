import { describe, expect, it } from "vitest";
import { signupFeePaymentStatus } from "@/lib/signup-fee-status";

describe("signupFeePaymentStatus", () => {
  it("opłacone tylko gdy paid = 1, nawet po zgłoszeniu BLIK", () => {
    expect(signupFeePaymentStatus({ match_paid: 1, blik_declared: 1 })).toBe("paid");
    expect(signupFeePaymentStatus({ match_paid: 1, blik_declared: 0 })).toBe("paid");
  });

  it("zgłoszony przelew bez potwierdzenia admina nie jest opłacony", () => {
    expect(signupFeePaymentStatus({ match_paid: 0, blik_declared: 1 })).toBe("pending_blik");
  });

  it("bez zgłoszenia i bez opłaty zostaje nieopłacony", () => {
    expect(signupFeePaymentStatus({ match_paid: 0, blik_declared: 0 })).toBe("unpaid");
    expect(signupFeePaymentStatus({})).toBe("unpaid");
  });

  it("częściowa wpłata na portfelu to niedopłata, nie opłacone", () => {
    expect(signupFeePaymentStatus({ match_paid: 0, blik_declared: 1, blik_received_pln: 20 })).toBe(
      "underpaid"
    );
  });
});
