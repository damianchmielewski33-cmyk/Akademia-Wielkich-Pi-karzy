import { describe, expect, it } from "vitest";
import { sanitizeAppBridgeNext } from "@/lib/app-bridge";

describe("sanitizeAppBridgeNext", () => {
  it("accepts relative academy paths", () => {
    expect(sanitizeAppBridgeNext("/panel-admina")).toBe("/panel-admina");
    expect(sanitizeAppBridgeNext("/transport/12")).toBe("/transport/12");
    expect(sanitizeAppBridgeNext("/pilkarze")).toBe("/pilkarze");
    expect(sanitizeAppBridgeNext("/platnosci?payment=pending&session_id=hp_1_abc")).toBe(
      "/platnosci?payment=pending&session_id=hp_1_abc"
    );
  });

  it("rejects open redirects and bad input", () => {
    expect(sanitizeAppBridgeNext("//evil.com")).toBeNull();
    expect(sanitizeAppBridgeNext("https://evil.com")).toBeNull();
    expect(sanitizeAppBridgeNext("/ok://x")).toBeNull();
    expect(sanitizeAppBridgeNext("panel-admina")).toBeNull();
    expect(sanitizeAppBridgeNext(null)).toBeNull();
  });
});
