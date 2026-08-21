"use client";

/**
 * Wibracje / haptics — APK (most AwpAndroid) + navigator.vibrate (PWA / mobile web).
 */

export type HapticKind = "light" | "medium" | "success" | "cheer" | "goal" | "whistle" | "error";

const MUTE_KEY = "awp-haptics-muted";

/** Wzorce: [vibrateMs, pauseMs, vibrateMs, ...] — jak Vibration API. */
const PATTERNS: Record<HapticKind, number[]> = {
  light: [18],
  medium: [32],
  success: [28, 40, 28],
  cheer: [35, 45, 35, 45, 50],
  goal: [55, 70, 55, 70, 90],
  whistle: [40],
  error: [50, 60, 80],
};

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function isHapticsMuted(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setHapticsMuted(muted: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent("awp-haptics-muted", { detail: { muted } }));
}

function vibrateViaAndroidBridge(pattern: number[]): boolean {
  try {
    const bridge = window.AwpAndroid;
    if (!bridge?.vibrate) return false;
    bridge.vibrate(pattern.join(","));
    return true;
  } catch {
    return false;
  }
}

function vibrateViaNavigator(pattern: number[]): boolean {
  try {
    if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return false;
    return navigator.vibrate(pattern);
  } catch {
    return false;
  }
}

/** Odpal wibrację (most APK albo Vibration API). */
export function triggerHaptic(kind: HapticKind = "medium"): void {
  if (typeof window === "undefined") return;
  if (isHapticsMuted() || prefersReducedMotion()) return;
  const pattern = PATTERNS[kind] ?? PATTERNS.medium;
  if (vibrateViaAndroidBridge(pattern)) return;
  vibrateViaNavigator(pattern);
}

export function hapticForStadiumSound(
  sound: "applause" | "cheer" | "goal" | "whistle" | "crowd"
): void {
  if (sound === "goal") triggerHaptic("goal");
  else if (sound === "cheer") triggerHaptic("cheer");
  else if (sound === "whistle") triggerHaptic("whistle");
  else if (sound === "crowd") triggerHaptic("light");
  else triggerHaptic("success");
}
