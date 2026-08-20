export const BOOKING_STATUSES = ["pending", "confirmed", "cancelled", "expired"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const BOOKING_FREE_CANCEL_HOURS = 24;

export type VenueRow = {
  id: number;
  name: string;
  slug: string;
  city: string;
  address: string;
  description: string | null;
  phone: string | null;
  email: string | null;
  photo_url: string | null;
  published: number;
  owner_user_id?: number | null;
  commission_pct?: number | null;
  created_at: string;
  updated_at: string;
};

export type PitchRow = {
  id: number;
  venue_id: number;
  name: string;
  surface: string;
  players: number;
  indoor: number;
  lighting: number;
  amenities: string | null;
  base_price_pln: number;
  slot_minutes: number;
  active: number;
  created_at: string;
  updated_at: string;
};

export type BookingRow = {
  id: number;
  user_id: number;
  pitch_id: number;
  booking_date: string;
  start_time: string;
  end_time: string;
  amount_pln: number;
  platform_fee_pln?: number | null;
  owner_payout_pln?: number | null;
  payout_id?: number | null;
  status: BookingStatus;
  contact_name: string;
  contact_phone: string;
  contact_email?: string | null;
  access_token?: string | null;
  note: string | null;
  hotpay_session_id: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  venue_name?: string;
  venue_city?: string;
  venue_address?: string;
  pitch_name?: string;
  user_name?: string;
  can_cancel?: boolean;
  cancel_until?: string | null;
};

export type VenueCard = VenueRow & {
  pitch_count: number;
  min_price_pln: number | null;
  surfaces: string | null;
  photo_urls?: string[];
  has_indoor?: number;
  has_outdoor?: number;
  has_lighting?: number;
};

export type PitchOpeningHour = {
  weekday: number;
  opens_at: string;
  closes_at: string;
};

export type PitchPriceRule = {
  weekday: number | null;
  start_time: string | null;
  end_time: string | null;
  price_pln: number;
  label: string | null;
};

export type PitchPublic = PitchRow & {
  opening_hours: PitchOpeningHour[];
  price_rules: PitchPriceRule[];
};

export type PitchBlockPublic = {
  pitch_id: number;
  pitch_name: string;
  block_date: string;
  start_time: string;
  end_time: string;
  reason: string | null;
};

export const WEEKDAY_LABELS_PL = [
  "niedziela",
  "poniedziałek",
  "wtorek",
  "środa",
  "czwartek",
  "piątek",
  "sobota",
] as const;

export type AvailabilitySlot = {
  date: string;
  start_time: string;
  end_time: string;
  amount_pln: number;
  available: boolean;
};

export type AdminPitchRow = PitchRow & {
  venue_name: string;
  venue_city: string;
  opens_at: string | null;
  closes_at: string | null;
};

function two(n: number): string {
  return String(n).padStart(2, "0");
}

export function normalizeTime(raw: string): string {
  const trimmed = raw.trim();
  const match = /^([0-2]?\d):([0-5]\d)$/.exec(trimmed);
  if (!match) throw new Error("INVALID_TIME");
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23) throw new Error("INVALID_TIME");
  return `${two(h)}:${two(m)}`;
}

export function addMinutes(time: string, minutes: number): string {
  const [h, m] = normalizeTime(time).split(":").map(Number);
  const total = h * 60 + m + minutes;
  if (total < 0 || total > 24 * 60) throw new Error("TIME_OUT_OF_RANGE");
  return `${two(Math.floor(total / 60))}:${two(total % 60)}`;
}

export function bookingStartDate(date: string, startTime: string): Date {
  return new Date(`${date}T${normalizeTime(startTime)}:00`);
}

export function bookingCancelDeadline(date: string, startTime: string): Date {
  return new Date(bookingStartDate(date, startTime).getTime() - BOOKING_FREE_CANCEL_HOURS * 60 * 60 * 1000);
}

export function formatPlDateTime(value: Date | string): string {
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("pl-PL", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
