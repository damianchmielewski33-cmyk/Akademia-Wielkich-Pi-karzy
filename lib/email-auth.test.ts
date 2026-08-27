import { afterEach, describe, expect, it } from "vitest";
import {
  emailAuthCodesMatch,
  hashEmailAuthCode,
  isEmailAuthCodeValid,
  MOCK_EMAIL_AUTH_CODE,
  userCanLoginWithPin,
  userNeedsEmailAuthSetup,
} from "@/lib/email-auth";

const pinOnly = {
  email: null,
  password_hash: null,
  email_verified: 0,
  is_admin: 0,
};

const complete = {
  email: "jan@example.com",
  password_hash: "hash",
  email_verified: 1,
  is_admin: 0,
};

describe("email-auth helpers", () => {
  const prevNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    if (prevNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = prevNodeEnv;
  });

  it("przy wyłączonej funkcji nie wymaga uzupełnienia e-maila", () => {
    expect(userNeedsEmailAuthSetup(pinOnly, false)).toBe(false);
    expect(userCanLoginWithPin(pinOnly, false)).toBe(true);
    expect(userCanLoginWithPin(complete, false)).toBe(true);
  });

  it("konto tylko z PIN-em musi uzupełnić e-mail i hasło, ale może się zalogować PIN-em", () => {
    expect(userNeedsEmailAuthSetup(pinOnly, true)).toBe(true);
    expect(userCanLoginWithPin(pinOnly, true)).toBe(true);
  });

  it("po weryfikacji e-maila i hasła PIN jest wyłączony", () => {
    expect(userNeedsEmailAuthSetup(complete, true)).toBe(false);
    expect(userCanLoginWithPin(complete, true)).toBe(false);
  });

  it("niepełne dane (brak hasła albo weryfikacji) nadal wymagają setupu i pozwalają na PIN", () => {
    expect(
      userNeedsEmailAuthSetup({ email: "a@b.c", password_hash: null, email_verified: 0, is_admin: 0 }, true)
    ).toBe(true);
    expect(
      userCanLoginWithPin({ email: "a@b.c", password_hash: "x", email_verified: 0, is_admin: 0 }, true)
    ).toBe(true);
  });

  it("admin nie jest zmuszany do e-maila i może korzystać z PIN-u", () => {
    expect(userNeedsEmailAuthSetup({ ...pinOnly, is_admin: 1 }, true)).toBe(false);
    expect(userCanLoginWithPin({ ...complete, is_admin: 1 }, true)).toBe(true);
  });

  it("kod HMAC jest związany z adresem e-mail", () => {
    const code = "654321";
    const hash = hashEmailAuthCode(code, "jan@example.com");
    expect(emailAuthCodesMatch(code, "jan@example.com", hash)).toBe(true);
    expect(emailAuthCodesMatch(code, "JAN@example.com", hash)).toBe(true);
    expect(emailAuthCodesMatch(code, "other@example.com", hash)).toBe(false);
    expect(emailAuthCodesMatch("000000", "jan@example.com", hash)).toBe(false);
  });

  it("przyjmuje mockowy kod 123456 poza produkcją nawet bez hasha", () => {
    process.env.NODE_ENV = "development";
    expect(isEmailAuthCodeValid(MOCK_EMAIL_AUTH_CODE, "jan@example.com", null, null)).toBe(true);
  });

  it("w produkcji odrzuca mock dla zwykłego gracza", () => {
    process.env.NODE_ENV = "production";
    expect(isEmailAuthCodeValid(MOCK_EMAIL_AUTH_CODE, "jan@example.com", null, null)).toBe(false);
    expect(
      isEmailAuthCodeValid(MOCK_EMAIL_AUTH_CODE, "jan@example.com", null, null, { isAdmin: false })
    ).toBe(false);
  });

  it("w produkcji przyjmuje mock tylko dla admina", () => {
    process.env.NODE_ENV = "production";
    expect(
      isEmailAuthCodeValid(MOCK_EMAIL_AUTH_CODE, "admin@example.com", null, null, { isAdmin: true })
    ).toBe(true);
  });
});
