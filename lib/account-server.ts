import { cache } from "react";
import { getDb } from "@/lib/db";
import { normalizeUiTheme, type UiTheme } from "@/lib/ui-theme";

/** Pola użytkownika z bazy — współdzielone w jednym żądaniu (layout + strony) przez React cache(). */
export type AccountNavRow = {
  firstName: string;
  lastName: string;
  zawodnik: string;
  profilePhotoPath: string | null;
  uiTheme: UiTheme;
};

export const getAccountNavFields = cache(
  async (userId: number): Promise<AccountNavRow | null> => {
    const db = await getDb();
    const row = (await db
      .prepare(
        "SELECT first_name, last_name, player_alias AS zawodnik, profile_photo_path, ui_theme FROM users WHERE id = ?"
      )
      .get(userId)) as
      | {
          first_name: string;
          last_name: string;
          zawodnik: string;
          profile_photo_path: string | null;
          ui_theme: string | null;
        }
      | undefined;
    if (!row) return null;
    return {
      firstName: row.first_name,
      lastName: row.last_name,
      zawodnik: row.zawodnik,
      profilePhotoPath: row.profile_photo_path ?? null,
      uiTheme: normalizeUiTheme(row.ui_theme),
    };
  }
);
