/** Pozycje pól w obrębie połowy (procenty względem kontenera drużyny). Max 8 na połowę (16 pól). */
export const SLOT_STYLE_AWAY: { top: string; left: string }[] = [
  { top: "78%", left: "50%" },
  { top: "60%", left: "14%" },
  { top: "60%", left: "50%" },
  { top: "60%", left: "86%" },
  { top: "38%", left: "24%" },
  { top: "38%", left: "76%" },
  { top: "12%", left: "50%" },
];

/** Węższe ekrany (<640px) — większy rozstaw pionowy, skrzydła bliżej krawędzi. */
const SLOT_STYLE_AWAY_COMPACT: { top: string; left: string }[] = [
  { top: "84%", left: "50%" },
  { top: "58%", left: "10%" },
  { top: "58%", left: "50%" },
  { top: "58%", left: "90%" },
  { top: "34%", left: "20%" },
  { top: "34%", left: "80%" },
  { top: "6%", left: "50%" },
];

/** Bardzo wąskie telefony (≤359px) — maksymalny rozstaw pionowy. */
const SLOT_STYLE_AWAY_XS: { top: string; left: string }[] = [
  { top: "88%", left: "50%" },
  { top: "62%", left: "8%" },
  { top: "62%", left: "50%" },
  { top: "62%", left: "92%" },
  { top: "36%", left: "18%" },
  { top: "36%", left: "82%" },
  { top: "4%", left: "50%" },
];

const SLOT_STYLE_AWAY_8: { top: string; left: string }[] = [
  ...SLOT_STYLE_AWAY,
  { top: "46%", left: "50%" },
];

const SLOT_STYLE_AWAY_COMPACT_8: { top: string; left: string }[] = [
  { top: "88%", left: "50%" },
  { top: "68%", left: "8%" },
  { top: "68%", left: "50%" },
  { top: "68%", left: "92%" },
  { top: "50%", left: "50%" },
  { top: "32%", left: "18%" },
  { top: "32%", left: "82%" },
  { top: "4%", left: "50%" },
];

const SLOT_STYLE_AWAY_XS_8: { top: string; left: string }[] = [
  { top: "90%", left: "50%" },
  { top: "70%", left: "8%" },
  { top: "70%", left: "50%" },
  { top: "70%", left: "92%" },
  { top: "52%", left: "50%" },
  { top: "30%", left: "16%" },
  { top: "30%", left: "84%" },
  { top: "2%", left: "50%" },
];

export const SLOT_STYLE_HOME: { top: string; left: string }[] = [
  { top: "22%", left: "50%" },
  { top: "40%", left: "14%" },
  { top: "40%", left: "50%" },
  { top: "40%", left: "86%" },
  { top: "62%", left: "24%" },
  { top: "62%", left: "76%" },
  { top: "88%", left: "50%" },
];

const SLOT_STYLE_HOME_COMPACT: { top: string; left: string }[] = [
  { top: "16%", left: "50%" },
  { top: "42%", left: "10%" },
  { top: "42%", left: "50%" },
  { top: "42%", left: "90%" },
  { top: "66%", left: "20%" },
  { top: "66%", left: "80%" },
  { top: "94%", left: "50%" },
];

const SLOT_STYLE_HOME_XS: { top: string; left: string }[] = [
  { top: "12%", left: "50%" },
  { top: "38%", left: "8%" },
  { top: "38%", left: "50%" },
  { top: "38%", left: "92%" },
  { top: "64%", left: "18%" },
  { top: "64%", left: "82%" },
  { top: "96%", left: "50%" },
];

const SLOT_STYLE_HOME_8: { top: string; left: string }[] = [
  ...SLOT_STYLE_HOME,
  { top: "54%", left: "50%" },
];

const SLOT_STYLE_HOME_COMPACT_8: { top: string; left: string }[] = [
  { top: "12%", left: "50%" },
  { top: "32%", left: "8%" },
  { top: "32%", left: "50%" },
  { top: "32%", left: "92%" },
  { top: "50%", left: "50%" },
  { top: "68%", left: "18%" },
  { top: "68%", left: "82%" },
  { top: "96%", left: "50%" },
];

const SLOT_STYLE_HOME_XS_8: { top: string; left: string }[] = [
  { top: "10%", left: "50%" },
  { top: "30%", left: "8%" },
  { top: "30%", left: "50%" },
  { top: "30%", left: "92%" },
  { top: "48%", left: "50%" },
  { top: "70%", left: "16%" },
  { top: "70%", left: "84%" },
  { top: "98%", left: "50%" },
];

export type LineupSlotDensity = "default" | "compact" | "xs";

function slotPool(
  team: "home" | "away",
  slotCount: number,
  density: LineupSlotDensity
): { top: string; left: string }[] {
  const n = Math.min(Math.max(slotCount, 0), 8);
  const is8 = n >= 8;

  if (team === "away") {
    if (density === "xs") return (is8 ? SLOT_STYLE_AWAY_XS_8 : SLOT_STYLE_AWAY_XS).slice(0, n);
    if (density === "compact") return (is8 ? SLOT_STYLE_AWAY_COMPACT_8 : SLOT_STYLE_AWAY_COMPACT).slice(0, n);
    return (is8 ? SLOT_STYLE_AWAY_8 : SLOT_STYLE_AWAY).slice(0, n);
  }

  if (density === "xs") return (is8 ? SLOT_STYLE_HOME_XS_8 : SLOT_STYLE_HOME_XS).slice(0, n);
  if (density === "compact") return (is8 ? SLOT_STYLE_HOME_COMPACT_8 : SLOT_STYLE_HOME_COMPACT).slice(0, n);
  return (is8 ? SLOT_STYLE_HOME_8 : SLOT_STYLE_HOME).slice(0, n);
}

export function getSlotStylesAway(slotCount: number, density: LineupSlotDensity = "default"): { top: string; left: string }[] {
  return slotPool("away", slotCount, density);
}

export function getSlotStylesHome(slotCount: number, density: LineupSlotDensity = "default"): { top: string; left: string }[] {
  return slotPool("home", slotCount, density);
}
