import { describe, expect, it } from "vitest";
import { sanitizePublicRowIdentity, type PublicWalletPlayerRow } from "@/lib/public-payment-share";

describe("sanitizePublicRowIdentity", () => {
  it("zachowuje pełne nazwisko i usuwa zdjęcie profilowe", () => {
    const row: PublicWalletPlayerRow = {
      id: 1,
      first_name: "Jan",
      last_name: "Kowalski",
      zawodnik: "Lewandowski",
      profile_photo_path: "/photos/jan.jpg",
      balance_pln: -25,
    };

    const sanitized = sanitizePublicRowIdentity(row);

    expect(sanitized.last_name).toBe("Kowalski");
    expect(sanitized.first_name).toBe("Jan");
    expect(sanitized.profile_photo_path).toBeNull();
    expect(sanitized.balance_pln).toBe(-25);
  });
});
