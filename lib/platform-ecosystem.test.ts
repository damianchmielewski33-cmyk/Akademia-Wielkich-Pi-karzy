import { describe, expect, it } from "vitest";
import {
  AWP_PRODUCTS,
  AWP_SURFACES,
  ECOSYSTEM_FEATURES,
  SHARED_STACK,
  assertFeatureParity,
} from "@/lib/platform-ecosystem";

describe("platform-ecosystem", () => {
  it("traktuje WWW, iOS i Android jako trzy produkty", () => {
    expect([...AWP_PRODUCTS]).toEqual(["www", "ios", "android"]);
  });

  it("ma makiety dla desktop, tablet, mobile web, iOS i Android", () => {
    expect([...AWP_SURFACES]).toEqual([
      "web-desktop",
      "web-tablet",
      "web-mobile",
      "ios",
      "android",
    ]);
  });

  it("współdzieli backend, API, auth, płatności, ranking, stats i push", () => {
    expect([...SHARED_STACK]).toEqual([
      "backend",
      "API",
      "baza danych",
      "logowanie",
      "płatności",
      "ranking",
      "statystyki",
      "powiadomienia",
    ]);
  });

  it("każda funkcja biznesowa ma odpowiednik na WWW, iOS i Android", () => {
    expect(assertFeatureParity()).toEqual([]);
    expect(ECOSYSTEM_FEATURES.length).toBeGreaterThanOrEqual(12);
  });

  it("administracja jest pełna na WWW, a mobile ma skrót", () => {
    const admin = ECOSYSTEM_FEATURES.find((f) => f.id === "admin");
    expect(admin?.home).toBe("www-primary");
    expect(admin?.www).toBe(true);
    expect(admin?.ios).toBe(true);
    expect(admin?.android).toBe(true);
  });
});
