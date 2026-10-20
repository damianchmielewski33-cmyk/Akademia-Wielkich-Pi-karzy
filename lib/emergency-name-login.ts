/**
 * Tymczasowe logowanie tylko imieniem i nazwiskiem (utrata PIN_PEPPER).
 * Ustaw na Renderze: NEXT_PUBLIC_EMERGENCY_NAME_ONLY_LOGIN=1
 * Po odzyskaniu dostępu — usuń zmienną i redeploy.
 */
export function isEmergencyNameOnlyLoginEnabled(): boolean {
  const v =
    process.env.NEXT_PUBLIC_EMERGENCY_NAME_ONLY_LOGIN?.trim() ||
    process.env.ENABLE_EMERGENCY_NAME_ONLY_LOGIN?.trim();
  return v === "1" || v?.toLowerCase() === "true";
}
