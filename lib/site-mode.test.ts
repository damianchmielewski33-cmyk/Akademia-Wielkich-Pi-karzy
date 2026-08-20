import { describe, expect, it } from "vitest";
import { parseSiteMode, shouldAskSiteMode, siteModeFromPathname } from "@/lib/site-mode";

describe("site-mode", () => {
  it("rozpoznaje ścieżki rezerwacji boisk", () => {
    expect(siteModeFromPathname("/obiekty")).toBe("booking");
    expect(siteModeFromPathname("/obiekty/12")).toBe("booking");
    expect(siteModeFromPathname("/rezerwacje")).toBe("booking");
    expect(siteModeFromPathname("/dla-obiektow")).toBe("booking");
    expect(siteModeFromPathname("/partner")).toBe("booking");
    expect(siteModeFromPathname("/partner/zaproszenie/abc")).toBe("booking");
  });

  it("rozpoznaje ścieżki akademii", () => {
    expect(siteModeFromPathname("/terminarz")).toBe("academy");
    expect(siteModeFromPathname("/pilkarze")).toBe("academy");
    expect(siteModeFromPathname("/players/3")).toBe("academy");
    expect(siteModeFromPathname("/sklady")).toBe("academy");
    expect(siteModeFromPathname("/galeria")).toBe("academy");
    expect(siteModeFromPathname("/statystyki")).toBe("academy");
    expect(siteModeFromPathname("/rankingi")).toBe("academy");
    expect(siteModeFromPathname("/platnosci")).toBe("academy");
    expect(siteModeFromPathname("/profil")).toBe("academy");
    expect(siteModeFromPathname("/blog")).toBe("academy");
    expect(siteModeFromPathname("/o-nas")).toBe("academy");
  });

  it("nie zgaduje trybu na stronie głównej ani kontakcie", () => {
    expect(siteModeFromPathname("/")).toBeNull();
    expect(siteModeFromPathname("/kontakt")).toBeNull();
    expect(siteModeFromPathname("/login")).toBeNull();
  });

  it("pyta o tryb tylko gdy nie ma wyboru i nie da się go wywnioskować", () => {
    expect(shouldAskSiteMode("/", null)).toBe(true);
    expect(shouldAskSiteMode("/kontakt", null)).toBe(true);
    expect(shouldAskSiteMode("/", "booking")).toBe(false);
    expect(shouldAskSiteMode("/", "academy")).toBe(false);
    expect(shouldAskSiteMode("/obiekty", null)).toBe(false);
    expect(shouldAskSiteMode("/terminarz", null)).toBe(false);
    expect(shouldAskSiteMode("/panel-admina", null)).toBe(false);
    expect(shouldAskSiteMode("/login", null)).toBe(false);
    expect(shouldAskSiteMode("/pzu-cup", null)).toBe(false);
    expect(shouldAskSiteMode("/", null, false)).toBe(false);
    expect(shouldAskSiteMode("/kontakt", null, false)).toBe(false);
  });

  it("parsuje zapisany tryb", () => {
    expect(parseSiteMode("booking")).toBe("booking");
    expect(parseSiteMode("academy")).toBe("academy");
    expect(parseSiteMode("other")).toBeNull();
    expect(parseSiteMode(null)).toBeNull();
  });
});
