import { createHash, randomBytes } from "node:crypto";
import { getSiteUrl } from "@/lib/site";

export const HOTPAY_PAYMENT_URL = "https://platnosc.hotpay.pl/";

export const HOTPAY_NOTIFICATION_IPS = [
  "18.197.55.26",
  "3.126.108.86",
  "3.64.128.101",
  "18.184.99.42",
  "3.72.152.155",
  "35.159.7.168",
] as const;

export type HotpayPaymentKind = "match" | "topup";
export type HotpayPaymentStatus = "pending" | "success" | "failure" | "cancelled";

export type HotpayConfig = {
  sekret: string;
  notificationPassword: string;
  serviceName: string;
};

export type HotpayInitParams = {
  amountPln: number;
  orderId: string;
  returnUrl: string;
  email?: string;
  personalData?: string;
  serviceName?: string;
};

export type HotpayInitSuccess = { ok: true; url: string };
export type HotpayInitFailure = { ok: false; error: string };
export type HotpayInitResult = HotpayInitSuccess | HotpayInitFailure;

export type HotpayNotificationPayload = {
  KWOTA: string;
  ID_PLATNOSCI: string;
  ID_ZAMOWIENIA: string;
  STATUS: string;
  SECURE: string;
  SEKRET: string;
  HASH: string;
};

function trimEnv(value: string | undefined): string {
  return (value ?? "").trim();
}

export function getHotpayConfig(): HotpayConfig | null {
  const sekret = trimEnv(process.env.HOTPAY_SEKRET);
  const notificationPassword = trimEnv(process.env.HOTPAY_NOTIFICATION_PASSWORD);
  if (!sekret || !notificationPassword) return null;
  const serviceName =
    trimEnv(process.env.HOTPAY_SERVICE_NAME) || "Akademia Wielkich Piłkarzy — wpisowe";
  return { sekret, notificationPassword, serviceName };
}

export function isHotpayConfigured(): boolean {
  return getHotpayConfig() != null;
}

/** Kwota w formacie wymaganym przez HotPay (np. "50.00"). */
export function formatHotpayAmount(amountPln: number): string {
  const n = Math.round(Number(amountPln) * 100) / 100;
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error("Nieprawidłowa kwota HotPay");
  }
  return n.toFixed(2);
}

export function buildInitHash(args: {
  notificationPassword: string;
  amount: string;
  serviceName: string;
  returnUrl: string;
  orderId: string;
  sekret: string;
}): string {
  const raw = [
    args.notificationPassword,
    args.amount,
    args.serviceName,
    args.returnUrl,
    args.orderId,
    args.sekret,
  ].join(";");
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

export function buildNotificationHash(args: {
  notificationPassword: string;
  amount: string;
  paymentId: string;
  orderId: string;
  status: string;
  secure: string;
  sekret: string;
}): string {
  const raw = [
    args.notificationPassword,
    args.amount,
    args.paymentId,
    args.orderId,
    args.status,
    args.secure,
    args.sekret,
  ].join(";");
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

export function verifyNotificationHash(
  payload: HotpayNotificationPayload,
  notificationPassword: string
): boolean {
  if (
    !payload.KWOTA ||
    !payload.ID_PLATNOSCI ||
    !payload.ID_ZAMOWIENIA ||
    !payload.STATUS ||
    !payload.SECURE ||
    !payload.SEKRET ||
    !payload.HASH
  ) {
    return false;
  }
  const expected = buildNotificationHash({
    notificationPassword,
    amount: payload.KWOTA,
    paymentId: payload.ID_PLATNOSCI,
    orderId: payload.ID_ZAMOWIENIA,
    status: payload.STATUS,
    secure: payload.SECURE,
    sekret: payload.SEKRET,
  });
  return expected.toLowerCase() === payload.HASH.toLowerCase();
}

export function isHotpayNotificationIp(ip: string | null | undefined): boolean {
  if (!ip) return false;
  const cleaned = ip.replace(/^::ffff:/, "").trim();
  return (HOTPAY_NOTIFICATION_IPS as readonly string[]).includes(cleaned);
}

export function createHotpaySessionId(userId: number): string {
  const suffix = randomBytes(6).toString("hex");
  const id = `hp_${userId}_${Date.now()}_${suffix}`;
  return id.slice(0, 64);
}

export function buildHotpayReturnUrl(sessionId: string, paymentHint: "pending" | "error" = "pending"): string {
  const base = getSiteUrl().replace(/\/$/, "");
  const url = new URL(`${base}/platnosci`);
  url.searchParams.set("payment", paymentHint);
  url.searchParams.set("session_id", sessionId);
  return url.toString();
}

export async function initPayment(
  params: HotpayInitParams,
  options?: {
    config?: HotpayConfig | null;
    fetchImpl?: typeof fetch;
  }
): Promise<HotpayInitResult> {
  const config = options?.config === undefined ? getHotpayConfig() : options.config;
  if (!config) {
    return { ok: false, error: "HotPay nie jest skonfigurowany (brak HOTPAY_SEKRET / HOTPAY_NOTIFICATION_PASSWORD)" };
  }

  let amount: string;
  try {
    amount = formatHotpayAmount(params.amountPln);
  } catch {
    return { ok: false, error: "Nieprawidłowa kwota płatności" };
  }

  const serviceName = (params.serviceName ?? config.serviceName).trim();
  const returnUrl = params.returnUrl.trim();
  const orderId = params.orderId.trim().slice(0, 64);
  if (!serviceName || !returnUrl || !orderId) {
    return { ok: false, error: "Brak wymaganych parametrów płatności" };
  }

  const hash = buildInitHash({
    notificationPassword: config.notificationPassword,
    amount,
    serviceName,
    returnUrl,
    orderId,
    sekret: config.sekret,
  });

  const form = new FormData();
  form.append("SEKRET", config.sekret);
  form.append("KWOTA", amount);
  form.append("NAZWA_USLUGI", serviceName);
  form.append("ADRES_WWW", returnUrl);
  form.append("ID_ZAMOWIENIA", orderId);
  form.append("EMAIL", params.email?.trim() ?? "");
  form.append("DANE_OSOBOWE", params.personalData?.trim() ?? "");
  form.append("TYP", "INIT");
  form.append("HASH", hash);

  const fetchImpl = options?.fetchImpl ?? globalThis.fetch;
  let response: Response;
  try {
    response = await fetchImpl(HOTPAY_PAYMENT_URL, {
      method: "POST",
      body: form,
    });
  } catch {
    return { ok: false, error: "Nie udało się połączyć z HotPay" };
  }

  const rawText = await response.text().catch(() => "");
  let json: { STATUS?: boolean; URL?: string; WIADOMOSC?: string } | null = null;
  try {
    json = JSON.parse(rawText) as { STATUS?: boolean; URL?: string; WIADOMOSC?: string };
  } catch {
    return {
      ok: false,
      error: response.ok
        ? "HotPay zwrócił nieprawidłową odpowiedź"
        : `HotPay HTTP ${response.status}`,
    };
  }

  if (json?.STATUS === true && typeof json.URL === "string" && json.URL.trim()) {
    return { ok: true, url: json.URL.trim() };
  }

  const message =
    typeof json?.WIADOMOSC === "string" && json.WIADOMOSC.trim()
      ? json.WIADOMOSC.trim()
      : "HotPay odrzucił inicjalizację płatności";
  return { ok: false, error: message };
}

export function parseNotificationFormData(form: FormData): HotpayNotificationPayload | null {
  const get = (key: string) => {
    const v = form.get(key);
    return typeof v === "string" ? v : "";
  };
  const payload: HotpayNotificationPayload = {
    KWOTA: get("KWOTA"),
    ID_PLATNOSCI: get("ID_PLATNOSCI"),
    ID_ZAMOWIENIA: get("ID_ZAMOWIENIA"),
    STATUS: get("STATUS"),
    SECURE: get("SECURE"),
    SEKRET: get("SEKRET"),
    HASH: get("HASH"),
  };
  if (
    !payload.KWOTA ||
    !payload.ID_PLATNOSCI ||
    !payload.ID_ZAMOWIENIA ||
    !payload.STATUS ||
    !payload.SECURE ||
    !payload.SEKRET ||
    !payload.HASH
  ) {
    return null;
  }
  return payload;
}
