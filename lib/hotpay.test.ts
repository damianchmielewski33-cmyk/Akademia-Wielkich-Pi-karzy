import { describe, expect, it } from "vitest";
import {
  buildInitHash,
  buildNotificationHash,
  formatHotpayAmount,
  initPayment,
  isHotpayNotificationIp,
  verifyNotificationHash,
} from "@/lib/hotpay";
import {
  buildMockInitHash,
  buildMockNotification,
  HOTPAY_TEST_CONFIG,
  HOTPAY_TEST_ORDER,
  mockHotpayFetch,
} from "@/lib/hotpay-fixtures";

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

  it("notification hash includes SECURE field", () => {
    const withSecure = buildNotificationHash({
      notificationPassword: HOTPAY_TEST_CONFIG.notificationPassword,
      amount: HOTPAY_TEST_ORDER.amount,
      paymentId: HOTPAY_TEST_ORDER.paymentId,
      orderId: HOTPAY_TEST_ORDER.orderId,
      status: "SUCCESS",
      secure: "aaa",
      sekret: HOTPAY_TEST_CONFIG.sekret,
    });
    const otherSecure = buildNotificationHash({
      notificationPassword: HOTPAY_TEST_CONFIG.notificationPassword,
      amount: HOTPAY_TEST_ORDER.amount,
      paymentId: HOTPAY_TEST_ORDER.paymentId,
      orderId: HOTPAY_TEST_ORDER.orderId,
      status: "SUCCESS",
      secure: "bbb",
      sekret: HOTPAY_TEST_CONFIG.sekret,
    });
    expect(withSecure).not.toBe(otherSecure);
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
