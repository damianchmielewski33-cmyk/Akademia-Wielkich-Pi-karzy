export type UiTheme = "light" | "dark";

export function normalizeUiTheme(value: string | null | undefined): UiTheme {
  return value === "dark" ? "dark" : "light";
}
