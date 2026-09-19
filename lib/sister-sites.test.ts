import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AWP_SESSION_MESSAGE_TYPE,
  DEFAULT_GYMBRAT_URL,
  GYMBRAT_REQUEST_AWP_SESSION,
  buildAwpSessionPostMessage,
  getGymBratCrossLink,
  getGymBratUrl,
  isTrustedGymBratOrigin,
} from "@/lib/sister-sites";

describe("isTrustedGymBratOrigin", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("accepts configured GymBrat origin and local :3001", () => {
    expect(isTrustedGymBratOrigin(DEFAULT_GYMBRAT_URL)).toBe(true);
    expect(isTrustedGymBratOrigin("http://localhost:3001")).toBe(true);
    expect(isTrustedGymBratOrigin("http://127.0.0.1:3001")).toBe(true);
    expect(isTrustedGymBratOrigin("http://10.0.2.2:3001")).toBe(true);
  });

  it("accepts NEXT_PUBLIC_GYMBRAT_URL and extra trusted origins", () => {
    vi.stubEnv("NEXT_PUBLIC_GYMBRAT_URL", "https://custom-gym.example.com/app");
    expect(isTrustedGymBratOrigin("https://custom-gym.example.com")).toBe(true);

    vi.stubEnv("NEXT_PUBLIC_GYMBRAT_TRUSTED_ORIGINS", "https://preview.example.com, https://other.test");
    expect(isTrustedGymBratOrigin("https://preview.example.com")).toBe(true);
    expect(isTrustedGymBratOrigin("https://other.test")).toBe(true);
  });

  it("accepts Vercel GymBrat preview hosts", () => {
    expect(isTrustedGymBratOrigin("https://gym-brat-git-feat-team.vercel.app")).toBe(true);
    expect(isTrustedGymBratOrigin("https://gymbrat-xyz.vercel.app")).toBe(true);
  });

  it("rejects foreign origins so session token is not leaked", () => {
    expect(isTrustedGymBratOrigin("https://evil.example")).toBe(false);
    expect(isTrustedGymBratOrigin("https://akademia-wielkich-pilkarzy.vercel.app")).toBe(false);
    expect(isTrustedGymBratOrigin("http://localhost:3000")).toBe(false);
    expect(isTrustedGymBratOrigin("https://random-app.vercel.app")).toBe(false);
    expect(isTrustedGymBratOrigin(null)).toBe(false);
    expect(isTrustedGymBratOrigin("")).toBe(false);
    expect(isTrustedGymBratOrigin("not-a-url")).toBe(false);
  });
});

describe("buildAwpSessionPostMessage", () => {
  const token = "eyJhbGciOiJIUzI1NiJ9.session";

  it("replies with awp-session only for trusted GymBrat origin + request type + token", () => {
    expect(
      buildAwpSessionPostMessage(DEFAULT_GYMBRAT_URL, { type: GYMBRAT_REQUEST_AWP_SESSION }, token)
    ).toEqual({ type: AWP_SESSION_MESSAGE_TYPE, token });

    expect(
      buildAwpSessionPostMessage("http://localhost:3001", { type: GYMBRAT_REQUEST_AWP_SESSION }, token)
    ).toEqual({ type: AWP_SESSION_MESSAGE_TYPE, token });
  });

  it("does not leak token to foreign origins", () => {
    expect(
      buildAwpSessionPostMessage("https://evil.example", { type: GYMBRAT_REQUEST_AWP_SESSION }, token)
    ).toBeNull();
    expect(
      buildAwpSessionPostMessage("http://localhost:3000", { type: GYMBRAT_REQUEST_AWP_SESSION }, token)
    ).toBeNull();
  });

  it("stays silent without session or wrong message type", () => {
    expect(
      buildAwpSessionPostMessage(DEFAULT_GYMBRAT_URL, { type: GYMBRAT_REQUEST_AWP_SESSION }, null)
    ).toBeNull();
    expect(
      buildAwpSessionPostMessage(DEFAULT_GYMBRAT_URL, { type: GYMBRAT_REQUEST_AWP_SESSION }, "  ")
    ).toBeNull();
    expect(buildAwpSessionPostMessage(DEFAULT_GYMBRAT_URL, { type: "other" }, token)).toBeNull();
    expect(buildAwpSessionPostMessage(DEFAULT_GYMBRAT_URL, null, token)).toBeNull();
  });
});

describe("getGymBratCrossLink", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("always sets from=awp and optionally awp_token", () => {
    const base = getGymBratCrossLink("/");
    expect(base).toContain("from=awp");
    expect(base).not.toContain("awp_token=");

    const withToken = getGymBratCrossLink("/login", { awpToken: "jwt.abc.def" });
    expect(withToken.startsWith(getGymBratUrl())).toBe(true);
    expect(withToken).toContain("from=awp");
    expect(withToken).toContain("awp_token=jwt.abc.def");

    const blank = getGymBratCrossLink("/", { awpToken: "  " });
    expect(blank).not.toContain("awp_token=");
  });
});
