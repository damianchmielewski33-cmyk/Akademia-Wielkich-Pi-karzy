import { describe, expect, it } from "vitest";
import {
  buildInitHash,
  buildNotificationHashWithoutSecure,
  formatHotpayAmount,
  initPayment,
  isHotpayNotificationIp,
  sanitizeHotpayReturnPath,
  verifyNotificationHash,
} from "@/lib/hotpay";
import {
  buildMockInitHash,
  buildMockNotification,
  HOTPAY_TEST_CONFIG,
  HOTPAY_TEST_ORDER,
  mockHotpayFetch,
} from "@/lib/hotpay-fixtures";

describe("sanitizeHotpayReturnPath", () => {
  it("pozwala na powrót na stronę zaproszenia (gość)", () => {
    expect(sanitizeHotpayReturnPath("/zaproszenie/12")).toBe("/zaproszenie/12");
    expect(sanitizeHotpayReturnPath("/zaproszenie/12?foo=1")).toBe("/zaproszenie/12?foo=1");
  });

  it("odrzuca obce ścieżki", () => {
    expect(sanitizeHotpayReturnPath("https://evil.test/")).toBe("/platnosci");
    expect(sanitizeHotpayReturnPath("//evil.test")).toBe("/platnosci");
  });
});

describe("hotpay hashing", () => {
  it("buildInitHash is stable and matches fixture helper", () => {
    const a = buildInitHash({
      notificationPassword: HOTPAY_TEST_CONFIG.notificationPassword,
      amount: HOTPAY_TEST_ORDER.amount,
      serviceName: HOTPAY_TEST_CONFIG.serviceName,
      returnUrl: HOTPAY_TEST_ORDER.returnUrl,
      orderId: HOTPAY_TEST_ORDER.orderId,
      sekret: HOTPAY_TEST_CONFIG.sekret,
    });
    expect(a).toMatch(/^[a-f0-9]{64}$/);
    expect(a).toBe(buildMockInitHash());
  });

  it("buildNotificationHash verifies SUCCESS payload", () => {
    const payload = buildMockNotification({ status: "SUCCESS" });
    expect(verifyNotificationHash(payload, HOTPAY_TEST_CONFIG.notificationPassword)).toBe(true);
  });

  it("rejects invalid notification hash", () => {
    const payload = buildMockNotification({ status: "SUCCESS", invalidHash: true });
    expect(verifyNotificationHash(payload, HOTPAY_TEST_CONFIG.notificationPassword)).toBe(false);
  });

  it("timing-safe hex compare rejects different lengths", async () => {
    const { timingSafeEqualHex } = await import("@/lib/hotpay");
    expect(timingSafeEqualHex("ab", "abcd")).toBe(false);
    expect(timingSafeEqualHex("abcd", "abcd")).toBe(true);
  });

  it("accepts notification hash without SECURE (API bez walidacji)", () => {
    const password = HOTPAY_TEST_CONFIG.notificationPassword;
    const hash = buildNotificationHashWithoutSecure({
      notificationPassword: password,
      amount: HOTPAY_TEST_ORDER.amount,
      paymentId: HOTPAY_TEST_ORDER.paymentId,
      orderId: HOTPAY_TEST_ORDER.orderId,
      status: "SUCCESS",
      sekret: HOTPAY_TEST_CONFIG.sekret,
    });
    const payload = {
      KWOTA: HOTPAY_TEST_ORDER.amount,
      ID_PLATNOSCI: HOTPAY_TEST_ORDER.paymentId,
      ID_ZAMOWIENIA: HOTPAY_TEST_ORDER.orderId,
      STATUS: "SUCCESS",
      SECURE: "",
      SEKRET: HOTPAY_TEST_CONFIG.sekret,
      HASH: hash,
    };
    expect(verifyNotificationHash(payload, password)).toBe(true);
  });
});

describe("formatHotpayAmount", () => {
  it("formats to two decimals", () => {
    expect(formatHotpayAmount(50)).toBe("50.00");
    expect(formatHotpayAmount(12.5)).toBe("12.50");
    expect(formatHotpayAmount(0.1 + 0.2)).toBe("0.30");
  });

  it("rejects non-positive amounts", () => {
    expect(() => formatHotpayAmount(0)).toThrow();
    expect(() => formatHotpayAmount(-1)).toThrow();
  });
});

describe("grossUpHotpayAmount", () => {
  it("returns net when commission is zero", async () => {
    const { grossUpHotpayAmount } = await import("@/lib/hotpay");
    expect(grossUpHotpayAmount(50, 0, 0)).toBe(50);
  });

  it("grosses up with pct + fixed (DN: 2.45% + 0.30)", async () => {
    const { grossUpHotpayAmount } = await import("@/lib/hotpay");
    // (14.5 + 0.30) / (1 - 0.0245) ≈ 15.1719 → ceil to 15.18
    expect(grossUpHotpayAmount(14.5, 2.45, 0.3)).toBe(15.18);
  });

  it("subtracts fee-rounding offset from commission", async () => {
    const { grossUpHotpayAmount } = await import("@/lib/hotpay");
    const full = grossUpHotpayAmount(14.5, 2.45, 0.3); // 15.18
    const withOffset = grossUpHotpayAmount(14.5, 2.45, 0.3, 0.21); // commission 0.68 − 0.21 = 0.47
    expect(full).toBe(15.18);
    expect(withOffset).toBe(14.97);
  });

  it("does not reduce gross below net", async () => {
    const { grossUpHotpayAmount } = await import("@/lib/hotpay");
    expect(grossUpHotpayAmount(14.5, 2.45, 0.3, 99)).toBe(14.5);
  });
});

describe("isHotpayNotificationIp", () => {
  it("accepts documented HotPay IPs", () => {
    expect(isHotpayNotificationIp("18.197.55.26")).toBe(true);
    expect(isHotpayNotificationIp("::ffff:3.126.108.86")).toBe(true);
  });

  it("rejects unknown IPs", () => {
    expect(isHotpayNotificationIp("1.2.3.4")).toBe(false);
    expect(isHotpayNotificationIp(null)).toBe(false);
  });
});

describe("initPayment with operator mocks", () => {
  it("returns payment URL on STATUS true", async () => {
    const result = await initPayment(
      {
        amountPln: HOTPAY_TEST_ORDER.amountPln,
        orderId: HOTPAY_TEST_ORDER.orderId,
        returnUrl: HOTPAY_TEST_ORDER.returnUrl,
        serviceName: HOTPAY_TEST_CONFIG.serviceName,
      },
      {
        config: HOTPAY_TEST_CONFIG,
        fetchImpl: mockHotpayFetch({ type: "success", url: "https://platnosc.hotpay.pl/pay/abc" }),
      }
    );
    expect(result).toEqual({ ok: true, url: "https://platnosc.hotpay.pl/pay/abc" });
  });

  it("maps WIADOMOSC on STATUS false", async () => {
    const result = await initPayment(
      {
        amountPln: HOTPAY_TEST_ORDER.amountPln,
        orderId: HOTPAY_TEST_ORDER.orderId,
        returnUrl: HOTPAY_TEST_ORDER.returnUrl,
      },
      {
        config: HOTPAY_TEST_CONFIG,
        fetchImpl: mockHotpayFetch({ type: "failure", message: "Błędny HASH" }),
      }
    );
    expect(result).toEqual({ ok: false, error: "Błędny HASH" });
  });

  it("handles network errors", async () => {
    const result = await initPayment(
      {
        amountPln: HOTPAY_TEST_ORDER.amountPln,
        orderId: HOTPAY_TEST_ORDER.orderId,
        returnUrl: HOTPAY_TEST_ORDER.returnUrl,
      },
      {
        config: HOTPAY_TEST_CONFIG,
        fetchImpl: mockHotpayFetch({ type: "network_error" }),
      }
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/HotPay/i);
  });

  it("handles invalid JSON body", async () => {
    const result = await initPayment(
      {
        amountPln: HOTPAY_TEST_ORDER.amountPln,
        orderId: HOTPAY_TEST_ORDER.orderId,
        returnUrl: HOTPAY_TEST_ORDER.returnUrl,
      },
      {
        config: HOTPAY_TEST_CONFIG,
        fetchImpl: mockHotpayFetch({ type: "invalid_json" }),
      }
    );
    expect(result.ok).toBe(false);
  });

  it("fails without config and does not call fetch", async () => {
    const fetchImpl = mockHotpayFetch({ type: "success" });
    const result = await initPayment(
      {
        amountPln: 10,
        orderId: "x",
        returnUrl: "https://example.test/platnosci",
      },
      { config: null, fetchImpl }
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/skonfigurowany/i);
  });
});
