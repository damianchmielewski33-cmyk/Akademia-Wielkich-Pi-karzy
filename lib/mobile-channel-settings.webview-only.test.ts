import { describe, expect, it } from "vitest";
import {
  MOBILE_CHANNEL_SETTINGS_DEFAULTS,
  parseMobileSettingsJson,
  serializeMobileSettings,
} from "@/lib/mobile-channel-settings";

describe("mobile channel settings (webview-only)", () => {
  it("does not expose android_ui_mode", () => {
    expect(MOBILE_CHANNEL_SETTINGS_DEFAULTS).not.toHaveProperty("android_ui_mode");
    const roundTrip = parseMobileSettingsJson(serializeMobileSettings(MOBILE_CHANNEL_SETTINGS_DEFAULTS));
    expect(roundTrip).not.toHaveProperty("android_ui_mode");
  });

  it("ignores legacy android_ui_mode=native in stored JSON", () => {
    const legacy = {
      ...MOBILE_CHANNEL_SETTINGS_DEFAULTS,
      android_ui_mode: "native",
    };
    const parsed = parseMobileSettingsJson(JSON.stringify(legacy));
    expect(parsed).not.toHaveProperty("android_ui_mode");
    expect(parsed.login_banner).toBe(MOBILE_CHANNEL_SETTINGS_DEFAULTS.login_banner);
  });
});
