/**
 * Wspólny Design System AWP — źródło prawdy dla WWW, iOS i Android.
 * Implementacja WWW: CSS vars w `app/globals.css`.
 * Android: `android/.../ui/theme/Color.kt` + `Type.kt`.
 * iOS: `ios/AwpDesignTokens.swift`.
 */

export const awpColor = {
  navy: "#1A2D5A",
  purple: "#3D2A6E",
  pitch: "#00A651",
  pitchDark: "#008C44",
  gold: "#F5C518",
  red: "#E4002B",
  teal: "#00C9B1",
  tealDark: "#00A394",
  ink: "#171717",
  muted: "#6B7280",
  pageLight: "#F4F5F7",
  pageDark: "#0C1020",
  murawa: "#061410",
  white: "#FFFFFF",
  success: "#059669",
  warning: "#D97706",
  error: "#DC2626",
  info: "#2563EB",
} as const;

export const awpSpace = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

export const awpRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const awpType = {
  display: { family: "Teko", weights: [400, 600, 700], role: "Nagłówki, numery, ranking" },
  sans: { family: "Geist", weights: [400, 500, 600, 700], role: "UI, tabele, formularze" },
  mono: { family: "Geist Mono", weights: [400, 500], role: "Kwoty, ID, logi admin" },
} as const;

export const awpGrid = {
  desktop: { columns: 12, gutter: 24, maxWidth: 1280 },
  tablet: { columns: 8, gutter: 16, maxWidth: 834 },
  mobile: { columns: 4, gutter: 12, maxWidth: 430 },
} as const;

export const awpMotion = {
  fast: "120ms",
  base: "200ms",
  slow: "320ms",
  easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
} as const;

export type AwpButtonVariant = "primary" | "secondary" | "ghost" | "gold" | "destructive" | "stadium";

export const awpButtonVariants: { id: AwpButtonVariant; label: string; use: string }[] = [
  { id: "primary", label: "Primary", use: "CTA: Gram, Zapłać, Rezerwuj" },
  { id: "secondary", label: "Secondary", use: "Druga akcja na karcie" },
  { id: "ghost", label: "Ghost", use: "Nawigacja, anuluj" },
  { id: "gold", label: "Gold", use: "Wyróżnienie, sezon, LIVE" },
  { id: "destructive", label: "Destructive", use: "Wypisz, odwołaj, usuń" },
  { id: "stadium", label: "Stadium", use: "Przyciski na hero / murawie" },
];
