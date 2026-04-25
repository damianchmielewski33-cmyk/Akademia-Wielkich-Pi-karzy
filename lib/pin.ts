import bcrypt from "bcryptjs";
import {
  isValidPinFormat as isValidPinFormatPolicy,
  isWeakPin as isWeakPinPolicy,
  WEAK_PIN_MESSAGE as WEAK_PIN_MESSAGE_POLICY,
} from "@/lib/pin-policy";

const BCRYPT_ROUNDS = 10;

export { WEAK_PIN_MESSAGE_POLICY as WEAK_PIN_MESSAGE };
export { isValidPinFormatPolicy as isValidPinFormat, isWeakPinPolicy as isWeakPin };

function readPinPepper(): string | undefined {
  const p = process.env.PIN_PEPPER;
  if (typeof p === "string" && p.trim()) return p.trim();
  return undefined;
}

function pinWithPepper(pin: string): string {
  const pepper = readPinPepper();
  const base = pin.trim();
  return pepper ? `${base}:${pepper}` : base;
}

export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pinWithPepper(pin), BCRYPT_ROUNDS);
}

export type VerifyPinResult =
  | { ok: true; legacy: false }
  | { ok: true; legacy: true }
  | { ok: false };

export async function verifyPin(pin: string, pinHash: string | null | undefined): Promise<VerifyPinResult> {
  if (!pinHash) return { ok: false };
  try {
    // Preferuj wariant z pepperem; jeśli pepper jest skonfigurowany, nadal akceptuj legacy hash bez peppera,
    // żeby dało się przejść na nowe haszowanie bez resetu PIN-ów.
    const peppered = await bcrypt.compare(pinWithPepper(pin), pinHash);
    if (peppered) return { ok: true, legacy: false };
    const pepper = readPinPepper();
    if (pepper) {
      const legacy = await bcrypt.compare(pin.trim(), pinHash);
      if (legacy) return { ok: true, legacy: true };
    }
    return { ok: false };
  } catch {
    return { ok: false };
  }
}
