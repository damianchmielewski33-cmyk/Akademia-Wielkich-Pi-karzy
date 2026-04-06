import { describe, expect, it } from "vitest";
import { appendShareSessionQuery, terminarzInviteRelativePath } from "@/lib/share-link";
import { INVITE_MATCH_QUERY_PARAM, SHARE_LINK_QUERY_PARAM } from "@/lib/constants";

describe("appendShareSessionQuery", () => {
  it("dodaje awp_share=1 do ścieżki z query", () => {
    const out = appendShareSessionQuery("/terminarz?mecz=42");
    expect(out).toContain("mecz=42");
    expect(out).toContain(`${SHARE_LINK_QUERY_PARAM}=1`);
  });

  it("dodaje query gdy go brakowało", () => {
    const out = appendShareSessionQuery("/sklady");
    expect(out).toBe(`/sklady?${SHARE_LINK_QUERY_PARAM}=1`);
  });

  it("zaproszenie: mecz + flaga przed udostępnieniem", () => {
    expect(terminarzInviteRelativePath(7)).toBe(`/terminarz?mecz=7&${INVITE_MATCH_QUERY_PARAM}=1`);
  });
});
