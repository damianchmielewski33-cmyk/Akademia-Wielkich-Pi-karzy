import { afterEach, describe, expect, it, vi } from "vitest";
import { assertAnalyticsOrigin, assertCsrf, isAllowedRequestOrigin } from "@/lib/csrf";
import { CSRF_COOKIE_NAME } from "@/lib/csrf-constants";

function post(
  url: string,
  init: {
    origin?: string | null;
    cookie?: string;
    token?: string;
    forwardedHost?: string;
    forwardedProto?: string;
    host?: string;
    secFetchSite?: string;
  },
) {
  const headers: Record<string, string> = {};
  if (init.origin !== undefined && init.origin !== null) {
    headers.origin = init.origin;
  }
  if (init.cookie) headers.cookie = init.cookie;
  if (init.token) headers["x-xsrf-token"] = init.token;
  if (init.forwardedHost) headers["x-forwarded-host"] = init.forwardedHost;
  if (init.forwardedProto) headers["x-forwarded-proto"] = init.forwardedProto;
  if (init.host) headers.host = init.host;
  if (init.secFetchSite) headers["sec-fetch-site"] = init.secFetchSite;
  return new Request(url, { method: "POST", headers });
}

describe("assertCsrf", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns null for GET", () => {
    expect(assertCsrf(new Request("https://app.example.com/api/x", { method: "GET" }))).toBeNull();
  });

  it("rejects when cookie and header token mismatch", () => {
    const r = post("https://app.example.com/api/x", {
      origin: "https://app.example.com",
      cookie: `${CSRF_COOKIE_NAME}=aaa`,
      token: "bbb",
    });
    const res = assertCsrf(r);
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
  });

  it("allows POST when origin matches request URL and tokens match", () => {
    const tok = "a".repeat(64);
    const r = post("http://localhost:3000/api/foo", {
      origin: "http://localhost:3000",
      cookie: `${CSRF_COOKIE_NAME}=${tok}`,
      token: tok,
    });
    expect(assertCsrf(r)).toBeNull();
  });

  it("allows POST when Origin is Render host and x-forwarded-host matches (req.url is localhost)", () => {
    vi.stubEnv("RENDER_EXTERNAL_URL", "https://akademia-wielkich-pilkarzy.onrender.com");
    const tok = "b".repeat(64);
    const r = post("http://localhost:10000/api/foo", {
      origin: "https://akademia-wielkich-pilkarzy.onrender.com",
      forwardedHost: "akademia-wielkich-pilkarzy.onrender.com",
      forwardedProto: "https",
      cookie: `${CSRF_COOKIE_NAME}=${tok}`,
      token: tok,
    });
    expect(assertCsrf(r)).toBeNull();
  });

  it("allows Origin from CSRF_ALLOWED_ORIGINS when req.url is localhost", () => {
    vi.stubEnv("CSRF_ALLOWED_ORIGINS", "https://custom.example.com");
    const tok = "c".repeat(64);
    const r = post("http://localhost:10000/api/foo", {
      origin: "https://custom.example.com",
      cookie: `${CSRF_COOKIE_NAME}=${tok}`,
      token: tok,
    });
    expect(assertCsrf(r)).toBeNull();
  });
});

describe("assertAnalyticsOrigin / isAllowedRequestOrigin", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("accepts RENDER_EXTERNAL_URL in allowlist", () => {
    vi.stubEnv("RENDER_EXTERNAL_URL", "https://akademia-wielkich-pilkarzy.onrender.com");
    expect(isAllowedRequestOrigin("https://akademia-wielkich-pilkarzy.onrender.com")).toBe(true);
  });

  it("allows analytics POST when Origin matches x-forwarded-host on Render", () => {
    const r = post("http://localhost:10000/api/analytics/page-view", {
      origin: "https://akademia-wielkich-pilkarzy.onrender.com",
      forwardedHost: "akademia-wielkich-pilkarzy.onrender.com",
      forwardedProto: "https",
      secFetchSite: "same-origin",
    });
    expect(assertAnalyticsOrigin(r)).toBeNull();
  });
});
