import { describe, expect, it } from "vitest";
import { hashPin, verifyPin } from "@/lib/pin";
import { isValidPinFormat, isWeakPin } from "@/lib/pin-policy";

describe("pin-policy", () => {
  it("akceptuje 4–6 cyfr", () => {
    expect(isValidPinFormat("1234")).toBe(true);
    expect(isValidPinFormat("123456")).toBe(true);
    expect(isValidPinFormat("123")).toBe(false);
    expect(isValidPinFormat("1234567")).toBe(false);
    expect(isValidPinFormat("12ab")).toBe(false);
  });

  it("wykrywa słabe PIN-y", () => {
    expect(isWeakPin("1234")).toBe(true);
    expect(isWeakPin("1111")).toBe(true);
    expect(isWeakPin("8765")).toBe(true);
    expect(isWeakPin("1357")).toBe(false);
    expect(isWeakPin("482916")).toBe(false);
  });
});

describe("pin (bcrypt)", () => {
  it("hash i verify są spójne", async () => {
    const h = await hashPin("424242");
    expect((await verifyPin("424242", h)).ok).toBe(true);
    expect((await verifyPin("000000", h)).ok).toBe(false);
  });
});
