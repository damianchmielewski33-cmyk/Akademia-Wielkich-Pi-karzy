import { parseRealm, REALM_HEADER, REALMS, type Realm } from "@/lib/realm";

/** Realm z nagłówka API (ustawiany przez klienta PZU Cup). Domyślnie Akademia. */
export function getApiRealm(req: Request): Realm {
  return parseRealm(req.headers.get(REALM_HEADER), REALMS.ACADEMY);
}
