import { describe, expect, it } from "vitest";
import {
  compareAndroidAppVersion,
  compareVersionName,
  isAppWebViewUserAgent,
  parseAndroidAppIdentity,
} from "@/lib/app-webview";

describe("app-webview", () => {
  it("rozpoznaje WebView aplikacji", () => {
    expect(isAppWebViewUserAgent("Mozilla/5.0 AWPAndroidApp/1.10.3")).toBe(true);
    expect(isAppWebViewUserAgent("Mozilla/5.0")).toBe(false);
  });

  it("czyta wersję i numer kompilacji z User-Agenta", () => {
    expect(parseAndroidAppIdentity("Foo AWPAndroidApp/1.10.3 AWPAndroidCode/26 Bar")).toEqual({
      versionName: "1.10.3",
      versionCode: 26,
    });
    expect(parseAndroidAppIdentity("AWPAndroidApp/1.9.0")).toEqual({
      versionName: "1.9.0",
      versionCode: null,
    });
    expect(parseAndroidAppIdentity("Chrome Mobile")).toBeNull();
  });

  it("porównuje wersje po kodzie albo nazwie", () => {
    expect(compareVersionName("1.11.0", "1.10.3")).toBeGreaterThan(0);
    expect(compareVersionName("1.10.3", "1.10.3")).toBe(0);
    expect(
      compareAndroidAppVersion(
        { versionName: "1.10.3", versionCode: 26 },
        { versionName: "1.11.0", versionCode: 27 }
      )
    ).toBeGreaterThan(0);
    expect(
      compareAndroidAppVersion(
        { versionName: "1.10.3", versionCode: 26 },
        { versionName: "1.10.3", versionCode: 26 }
      )
    ).toBe(0);
  });
});
