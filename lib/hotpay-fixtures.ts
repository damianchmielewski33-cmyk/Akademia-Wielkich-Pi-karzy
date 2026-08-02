import { buildInitHash, buildNotificationHash, type HotpayConfig, type HotpayNotificationPayload } from "@/lib/hotpay";

/** Stałe używane wyłącznie w testach — nie są prawdziwymi sekretami produkcyjnymi. */
export const HOTPAY_TEST_CONFIG: HotpayConfig = {
  sekret: "test_sekret_serwisu_awp",
  notificationPassword: "test_haslo_notyfikacji_awp",
  serviceName: "AWP test wpisowe",
};

export const HOTPAY_TEST_ORDER = {
  amount: "50.00",
  amountPln: 50,
  orderId: "hp_1_1700000000000_abcdef",
  returnUrl: "https://example.test/platnosci?payment=pending&session_id=hp_1_1700000000000_abcdef",
  paymentId: "HPAY-MOCK-12345",
  secure: "secure-mock-token",
};

export function mockInitSuccessResponse(url = "https://platnosc.hotpay.pl/pay/mock-token") {
  return { STATUS: true as const, URL: url };
}

export function mockInitFailureResponse(message = "Błędny HASH") {
  return { STATUS: false as const, WIADOMOSC: message };
}

export function buildMockInitHash(overrides?: Partial<typeof HOTPAY_TEST_ORDER & HotpayConfig>): string {
  return buildInitHash({
    notificationPassword: overrides?.notificationPassword ?? HOTPAY_TEST_CONFIG.notificationPassword,
    amount: overrides?.amount ?? HOTPAY_TEST_ORDER.amount,
    serviceName: overrides?.serviceName ?? HOTPAY_TEST_CONFIG.serviceName,
    returnUrl: overrides?.returnUrl ?? HOTPAY_TEST_ORDER.returnUrl,
    orderId: overrides?.orderId ?? HOTPAY_TEST_ORDER.orderId,
    sekret: overrides?.sekret ?? HOTPAY_TEST_CONFIG.sekret,
  });
}

export function buildMockNotification(args?: {
  status?: "SUCCESS" | "PENDING" | "FAILURE";
  amount?: string;
  paymentId?: string;
  orderId?: string;
  secure?: string;
  sekret?: string;
  notificationPassword?: string;
  /** Gdy true — celowo zły HASH. */
  invalidHash?: boolean;
}): HotpayNotificationPayload {
  const status = args?.status ?? "SUCCESS";
  const amount = args?.amount ?? HOTPAY_TEST_ORDER.amount;
  const paymentId = args?.paymentId ?? HOTPAY_TEST_ORDER.paymentId;
  const orderId = args?.orderId ?? HOTPAY_TEST_ORDER.orderId;
  const secure = args?.secure ?? HOTPAY_TEST_ORDER.secure;
  const sekret = args?.sekret ?? HOTPAY_TEST_CONFIG.sekret;
  const notificationPassword = args?.notificationPassword ?? HOTPAY_TEST_CONFIG.notificationPassword;

  const hash = args?.invalidHash
    ? "0".repeat(64)
    : buildNotificationHash({
        notificationPassword,
        amount,
        paymentId,
        orderId,
        status,
        secure,
        sekret,
      });

  return {
    KWOTA: amount,
    ID_PLATNOSCI: paymentId,
    ID_ZAMOWIENIA: orderId,
    STATUS: status,
    SECURE: secure,
    SEKRET: sekret,
    HASH: hash,
  };
}

export function notificationToFormData(payload: HotpayNotificationPayload): FormData {
  const form = new FormData();
  for (const [key, value] of Object.entries(payload)) {
    form.append(key, value);
  }
  return form;
}

export type MockHotpayFetchScenario =
  | { type: "success"; url?: string }
  | { type: "failure"; message?: string }
  | { type: "invalid_json" }
  | { type: "network_error" };

/** Mock `fetch` dla INIT HotPay. */
export function mockHotpayFetch(scenario: MockHotpayFetchScenario): typeof fetch {
  return (async () => {
    if (scenario.type === "network_error") {
      throw new Error("network down");
    }
    if (scenario.type === "invalid_json") {
      return new Response("not-json", { status: 200, headers: { "Content-Type": "text/plain" } });
    }
    if (scenario.type === "failure") {
      return new Response(JSON.stringify(mockInitFailureResponse(scenario.message)), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify(mockInitSuccessResponse(scenario.url)), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;
}
