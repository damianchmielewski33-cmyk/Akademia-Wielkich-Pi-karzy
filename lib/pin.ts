import bcrypt from "bcryptjs";
import {
  isValidPinFormat as isValidPinFormatPolicy,
  isWeakPin as isWeakPinPolicy,
  WEAK_PIN_MESSAGE as WEAK_PIN_MESSAGE_POLICY,
} from "@/lib/pin-policy";

const BCRYPT_ROUNDS = 10;

export { WEAK_PIN_MESSAGE_POLICY as WEAK_PIN_MESSAGE };
export { isValidPinFormatPolicy as isValidPinFormat, isWeakPinPolicy as isWeakPin };

export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin.trim(), BCRYPT_ROUNDS);
}

export async function verifyPin(pin: string, pinHash: string | null | undefined): Promise<boolean> {
  if (!pinHash) return false;
  try {
    return await bcrypt.compare(pin.trim(), pinHash);
  } catch {
    return false;
  }
}
