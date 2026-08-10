import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
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

export type HotpayPaymentKind = "match" | "topup" | "match_cart";
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
  /** Obecne w API z walidacją; w starszym wariancie może być puste. */
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

/**
 * Oblicza kwotę brutto (do operatora) z kwoty netto.
 *
 * Wzór bazowy: gross = ⌈ (net + fixed) / (1 − pct/100) × 100 ⌉ / 100
 *
 * `commissionOffsetPln` — kwota odjęta od prowizji zawodnika (np. zawyżenie składki
 * meczu do pełnych 0,50 zł). Nie może obniżyć brutto poniżej netto.
 *
 * Gdy pct = 0 i fixed = 0 → gross = net (bez powiększania).
 */
export function grossUpHotpayAmount(
  netPln: number,
  commissionPct: number,
  commissionFixedPln: number,
  commissionOffsetPln = 0
): number {
  if ((commissionPct <= 0 || !Number.isFinite(commissionPct)) && commissionFixedPln <= 0) {
    return netPln;
  }
  const pct = Math.max(0, Math.min(commissionPct, 99)); // 0–99%
  const fixed = Math.max(0, commissionFixedPln);
  const rate = pct / 100;
  const rawGross = Math.ceil(((netPln + fixed) / (1 - rate)) * 100) / 100;
  const commission = Math.round((rawGross - netPln) * 100) / 100;
  const offset = Math.min(
    Math.max(0, Number.isFinite(commissionOffsetPln) ? commissionOffsetPln : 0),
    commission
  );
  return Math.round((netPln + commission - offset) * 100) / 100;
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

/** HASH notyfikacji bez SECURE (wariant „API bez walidacji” w dokumentacji HotPay). */
export function buildNotificationHashWithoutSecure(args: {
  notificationPassword: string;
  amount: string;
  paymentId: string;
  orderId: string;
  status: string;
  sekret: string;
}): string {
  const raw = [
    args.notificationPassword,
    args.amount,
    args.paymentId,
    args.orderId,
    args.status,
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
    !payload.SEKRET ||
    !payload.HASH
  ) {
    return false;
  }
  // Dokumentacja: API z walidacją (z SECURE) oraz API bez walidacji (bez SECURE).
  if (payload.SECURE) {
    const withSecure = buildNotificationHash({
      notificationPassword,
      amount: payload.KWOTA,
      paymentId: payload.ID_PLATNOSCI,
      orderId: payload.ID_ZAMOWIENIA,
      status: payload.STATUS,
      secure: payload.SECURE,
      sekret: payload.SEKRET,
    });
    if (timingSafeEqualHex(withSecure, payload.HASH)) return true;
    console.error(
      `[hotpay/hash] withSecure MISMATCH computed=${withSecure.slice(0, 16)}... expected=${payload.HASH.slice(0, 16)}... pwd_len=${notificationPassword.length} pwd_prefix=${notificationPassword.slice(0, 6)}... sekret_len=${payload.SEKRET.length}`
    );
  }
  const withoutSecure = buildNotificationHashWithoutSecure({
    notificationPassword,
    amount: payload.KWOTA,
    paymentId: payload.ID_PLATNOSCI,
    orderId: payload.ID_ZAMOWIENIA,
    status: payload.STATUS,
    sekret: payload.SEKRET,
  });
  if (timingSafeEqualHex(withoutSecure, payload.HASH)) return true;
  console.error(
    `[hotpay/hash] withoutSecure MISMATCH computed=${withoutSecure.slice(0, 16)}... expected=${payload.HASH.slice(0, 16)}... pwd_len=${notificationPassword.length} pwd_prefix=${notificationPassword.slice(0, 6)}...`
  );
  return false;
}

/** Porównanie hex bez wycieku czasu (różna długość → false). */
export function timingSafeEqualHex(a: string, b: string): boolean {
  const left = a.trim().toLowerCase();
  const right = b.trim().toLowerCase();
  if (!/^[0-9a-f]+$/.test(left) || !/^[0-9a-f]+$/.test(right)) return false;
  if (left.length !== right.length) return false;
  try {
    return timingSafeEqual(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"));
  } catch {
    return false;
  }
}

export function timingSafeEqualString(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  try {
    return timingSafeEqual(left, right);
  } catch {
    return false;
  }
}

export function isHotpayNotificationIp(ip: string | null | undefined): boolean {
  if (!ip) return false;
  const cleaned = ip.replace(/^::ffff:/, "").trim();
  return (HOTPAY_NOTIFICATION_IPS as readonly string[]).includes(cleaned);
}

export function createHotpaySessionId(userId: number, opts?: { testMode?: boolean }): string {
  const suffix = randomBytes(6).toString("hex");
  const prefix = opts?.testMode ? "hp_t_" : "hp_";
  const id = `${prefix}${userId}_${Date.now()}_${suffix}`;
  return id.slice(0, 64);
}

/** Prefiks sesji z trybu testowego admina — księgowanie tagowane is_test. */
export function isHotpayTestSessionId(sessionId: string): boolean {
  return sessionId.startsWith("hp_t_");
}

/**
 * Dozwolona ścieżka powrotu po HotPay (względna, bez open redirect).
 * Domyślnie /platnosci.
 */
export function sanitizeHotpayReturnPath(raw: unknown): string {
  if (typeof raw !== "string") return "/platnosci";
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/")) return "/platnosci";
  if (trimmed.startsWith("//")) return "/platnosci";
  if (trimmed.includes("://")) return "/platnosci";
  if (trimmed.includes("\\")) return "/platnosci";
  if (trimmed.length > 512) return "/platnosci";
  // Tylko znane sekcje aplikacji (nie dowolny deep-link).
  const pathOnly = trimmed.split("?")[0] ?? trimmed;
  const allowed =
    pathOnly === "/" ||
    pathOnly === "/platnosci" ||
    pathOnly === "/terminarz" ||
    pathOnly === "/profil" ||
    pathOnly === "/pzu-cup" ||
    pathOnly.startsWith("/pzu-cup/") ||
    pathOnly.startsWith("/terminarz/") ||
    pathOnly.startsWith("/transport/") ||
    pathOnly.startsWith("/platnosci-public/") ||
    pathOnly.startsWith("/zaproszenie/");
  if (!allowed) return "/platnosci";
  return trimmed;
}

export function buildHotpayReturnUrl(
  sessionId: string,
  paymentHint: "pending" | "error" = "pending",
  returnPath?: string | null
): string {
  const base = getSiteUrl().replace(/\/$/, "");
  const path = sanitizeHotpayReturnPath(returnPath);
  const url = new URL(`${base}${path.startsWith("/") ? path : `/${path}`}`);
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

function getFormField(form: FormData, key: string): string {
  const direct = form.get(key);
  if (typeof direct === "string" && direct.length > 0) return direct;
  const want = key.toUpperCase();
  for (const [k, v] of form.entries()) {
    if (k.toUpperCase() === want && typeof v === "string" && v.length > 0) return v;
  }
  return typeof direct === "string" ? direct : "";
}

export function parseNotificationFormData(form: FormData): HotpayNotificationPayload | null {
  const payload: HotpayNotificationPayload = {
    KWOTA: getFormField(form, "KWOTA"),
    ID_PLATNOSCI: getFormField(form, "ID_PLATNOSCI"),
    ID_ZAMOWIENIA: getFormField(form, "ID_ZAMOWIENIA"),
    STATUS: getFormField(form, "STATUS"),
    SECURE: getFormField(form, "SECURE"),
    SEKRET: getFormField(form, "SEKRET"),
    HASH: getFormField(form, "HASH"),
  };
  // SECURE nie jest wymagane (starszy wariant API bez walidacji).
  if (
    !payload.KWOTA ||
    !payload.ID_PLATNOSCI ||
    !payload.ID_ZAMOWIENIA ||
    !payload.STATUS ||
    !payload.SEKRET ||
    !payload.HASH
  ) {
    return null;
  }
  return payload;
}
