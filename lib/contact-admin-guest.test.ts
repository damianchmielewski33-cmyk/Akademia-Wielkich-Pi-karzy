import { describe, expect, it } from "vitest";
import {
  createContactAdminGuestToken,
  guestHasConversationAccess,
  verifyContactAdminGuestToken,
} from "@/lib/contact-admin-guest";

describe("contact-admin guest access", () => {
  it("round-trips signed guest token for a conversation key", async () => {
    const token = await createContactAdminGuestToken("guest:jan kowalski");
    const verified = await verifyContactAdminGuestToken(token);
    expect(verified).toEqual({ conversationKey: "guest:jan kowalski" });
    expect(guestHasConversationAccess(verified, "guest:jan kowalski")).toBe(true);
    expect(guestHasConversationAccess(verified, "guest:anna nowak")).toBe(false);
  });

  it("rejects tampered token", async () => {
    const token = await createContactAdminGuestToken("guest:jan kowalski");
    const bad = `${token.slice(0, -4)}xxxx`;
    expect(await verifyContactAdminGuestToken(bad)).toBeNull();
  });
});
