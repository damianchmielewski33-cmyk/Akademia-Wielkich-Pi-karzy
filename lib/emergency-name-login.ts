/**
 * Tymczasowe logowanie tylko imieniem i nazwiskiem (utrata PIN_PEPPER).
 *
 * Włączone gdy:
 * - ENABLE_EMERGENCY_NAME_ONLY_LOGIN / NEXT_PUBLIC_… = 1, albo
 * - jesteśmy na Renderze (`RENDER` / `RENDER_EXTERNAL_URL`) — domyślnie ON,
 *   dopóki nie ustawisz którejś zmiennej na `0`.
 *
 * Po odzyskaniu PIN: ustaw ENABLE_EMERGENCY_NAME_ONLY_LOGIN=0 i redeploy.
 */
export function isEmergencyNameOnlyLoginEnabled(): boolean {
  const raw =
    process.env.ENABLE_EMERGENCY_NAME_ONLY_LOGIN?.trim() ||
    process.env.NEXT_PUBLIC_EMERGENCY_NAME_ONLY_LOGIN?.trim() ||
    "";
  const lower = raw.toLowerCase();
  if (lower === "0" || lower === "false" || lower === "off") return false;
  if (lower === "1" || lower === "true" || lower === "on") return true;

  // Render Free: włącz bez ręcznego env (awaria PIN_PEPPER).
  return Boolean(process.env.RENDER_EXTERNAL_URL?.trim() || process.env.RENDER?.trim());
}
