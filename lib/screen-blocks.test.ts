import { describe, expect, it } from "vitest";
import {
  DEFAULT_SCREEN_BLOCK_MESSAGE,
  getScreenKeyFromPathname,
  isScreenDisabledForUser,
  isScreenEffectivelyDisabled,
  parseScreenBlocksJson,
  screenBlockMessage,
  serializeScreenBlocksMap,
} from "@/lib/screen-blocks";

describe("screen-blocks", () => {
  it("mapuje pathname na klucz ekranu", () => {
    expect(getScreenKeyFromPathname("/terminarz")).toBe("terminarz");
    expect(getScreenKeyFromPathname("/players/12")).toBe("players_detail");
    expect(getScreenKeyFromPathname("/login")).toBeNull();
  });

  it("parsuje i serializuje JSON zaślepek", () => {
    const raw = JSON.stringify({
      terminarz: { disabled: true, message: "Przerwa zimowa" },
    });
    const parsed = parseScreenBlocksJson(raw);
    expect(parsed.terminarz.disabled).toBe(true);
    expect(parsed.terminarz.message).toBe("Przerwa zimowa");
    expect(parsed.pilkarze.disabled).toBe(false);

    const again = parseScreenBlocksJson(serializeScreenBlocksMap(parsed));
    expect(again.terminarz).toEqual(parsed.terminarz);
  });

  it("blokuje ekran tylko dla nie-adminów", () => {
    const blocks = parseScreenBlocksJson(
      JSON.stringify({ galeria: { disabled: true, message: "" } })
    );
    expect(isScreenDisabledForUser(blocks, "galeria", false)).toBe(true);
    expect(isScreenDisabledForUser(blocks, "galeria", true)).toBe(false);
    expect(screenBlockMessage(blocks, "galeria")).toBe(DEFAULT_SCREEN_BLOCK_MESSAGE);
  });

  it("respektuje harmonogram zaślepki", () => {
    const entry = {
      disabled: true,
      message: "",
      active_from: "2099-01-01",
      active_until: "2099-12-31",
    };
    expect(isScreenEffectivelyDisabled(entry, "2099-06-01")).toBe(true);
    expect(isScreenEffectivelyDisabled(entry, "2098-12-31")).toBe(false);
    expect(isScreenEffectivelyDisabled(entry, "2100-01-01")).toBe(false);
  });
});
