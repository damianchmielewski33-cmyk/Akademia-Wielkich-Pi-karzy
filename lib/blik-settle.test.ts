import { describe, expect, it } from "vitest";
import {
  blikContributionCovered,
  parseBlikAmountInput,
  resolveBlikReceivedPln,
} from "@/lib/blik-settle";

describe("resolveBlikReceivedPln", () => {
  it("nie otrzymał = 0 zł na portfelu", () => {
    expect(resolveBlikReceivedPln({ outcome: "not_received", contributionPln: 25 })).toEqual({
      ok: true,
      receivedPln: 0,
    });
  });

  it("otrzymał składkę bez podanej kwoty = pełna składka", () => {
    expect(resolveBlikReceivedPln({ outcome: "received", contributionPln: 25 })).toEqual({
      ok: true,
      receivedPln: 25,
    });
  });

  it("za mało wymaga kwoty poniżej składki", () => {
    expect(
      resolveBlikReceivedPln({ outcome: "underpaid", contributionPln: 25, receivedPln: 20 })
    ).toEqual({ ok: true, receivedPln: 20 });
    expect(resolveBlikReceivedPln({ outcome: "underpaid", contributionPln: 25, receivedPln: 25 }).ok).toBe(
      false
    );
  });

  it("za dużo wymaga kwoty powyżej składki", () => {
    expect(
      resolveBlikReceivedPln({ outcome: "overpaid", contributionPln: 25, receivedPln: 40 })
    ).toEqual({ ok: true, receivedPln: 40 });
    expect(resolveBlikReceivedPln({ outcome: "overpaid", contributionPln: 25, receivedPln: 25 }).ok).toBe(
      false
    );
  });

  it("pełna składka i nadpłata pokrywają wpisowe, niedopłata nie", () => {
    expect(blikContributionCovered(25, 25)).toBe(true);
    expect(blikContributionCovered(40, 25)).toBe(true);
    expect(blikContributionCovered(20, 25)).toBe(false);
    expect(blikContributionCovered(0, 25)).toBe(false);
  });

  it("parsuje kwotę z przecinkiem", () => {
    expect(parseBlikAmountInput("20,50")).toBe(20.5);
    expect(parseBlikAmountInput("abc")).toBeNull();
  });
});
