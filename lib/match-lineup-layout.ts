/** Pozycje pól w obrębie połowy (procenty względem kontenera drużyny). Max 8 na połowę (16 pól). */
export const SLOT_STYLE_AWAY: { top: string; left: string }[] = [
  { top: "76%", left: "50%" },
  { top: "58%", left: "18%" },
  { top: "58%", left: "50%" },
  { top: "58%", left: "82%" },
  { top: "36%", left: "28%" },
  { top: "36%", left: "72%" },
  { top: "14%", left: "50%" },
];

const SLOT_STYLE_AWAY_8: { top: string; left: string }[] = [
  ...SLOT_STYLE_AWAY,
  { top: "46%", left: "50%" },
];

export const SLOT_STYLE_HOME: { top: string; left: string }[] = [
  { top: "24%", left: "50%" },
  { top: "42%", left: "18%" },
  { top: "42%", left: "50%" },
  { top: "42%", left: "82%" },
  { top: "64%", left: "28%" },
  { top: "64%", left: "72%" },
  { top: "86%", left: "50%" },
];

const SLOT_STYLE_HOME_8: { top: string; left: string }[] = [
  ...SLOT_STYLE_HOME,
  { top: "54%", left: "50%" },
];

export function getSlotStylesAway(slotCount: number): { top: string; left: string }[] {
  const n = Math.min(Math.max(slotCount, 0), 8);
  return SLOT_STYLE_AWAY_8.slice(0, n);
}

export function getSlotStylesHome(slotCount: number): { top: string; left: string }[] {
  const n = Math.min(Math.max(slotCount, 0), 8);
  return SLOT_STYLE_HOME_8.slice(0, n);
}
