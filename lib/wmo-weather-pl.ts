/** Skrócone opisy kodów WMO (Open-Meteo / WMO 4677). */
export function wmoWeatherCodeToPolish(code: number): string {
  if (code === 0) return "Bezchmurnie";
  if (code === 1) return "Prawie bezchmurnie";
  if (code === 2) return "Częściowe zachmurzenie";
  if (code === 3) return "Pochmurno";
  if (code === 45 || code === 48) return "Mgła";
  if (code >= 51 && code <= 55) return "Mżawka";
  if (code === 56 || code === 57) return "Marznąca mżawka";
  if (code === 61 || code === 63 || code === 65) return "Deszcz";
  if (code === 66 || code === 67) return "Marznący deszcz";
  if (code === 71 || code === 73 || code === 75) return "Śnieg";
  if (code === 77) return "Ziarnisty śnieg";
  if (code >= 80 && code <= 82) return "Przelotne opady";
  if (code === 85 || code === 86) return "Przelotny śnieg";
  if (code === 95) return "Burza";
  if (code === 96 || code === 99) return "Burza z gradem";
  return "Zachmurzenie / zmienne";
}
