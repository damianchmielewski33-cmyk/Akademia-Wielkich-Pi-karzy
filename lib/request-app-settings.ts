import { cache } from "react";
import { getAppSettings } from "@/lib/app-settings";
import { getDb } from "@/lib/db";
import { REALMS, type Realm } from "@/lib/realm";

/**
 * Jedno wczytanie `app_settings` na żądanie Next.js (layout + metadata + strony).
 * Testy i zapis w API nadal używają `getAppSettings(db, realm)` z przekazaną bazą.
 */
export const getRequestAppSettings = cache(async (realm: Realm = REALMS.ACADEMY) => {
  const db = await getDb();
  return getAppSettings(db, realm);
});
