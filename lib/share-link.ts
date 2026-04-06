import { INVITE_MATCH_QUERY_PARAM, SHARE_LINK_QUERY_PARAM } from "@/lib/constants";

/**
 * Dodaje parametr `awp_share=1` do względnego URL (ścieżka + opcjonalnie query).
 * Używaj wyłącznie dla linków wysyłanych na zewnątrz — nie dla nawigacji wewnątrz aplikacji.
 */
export function appendShareSessionQuery(relativePathWithQuery: string): string {
  const qIndex = relativePathWithQuery.indexOf("?");
  const path = qIndex === -1 ? relativePathWithQuery : relativePathWithQuery.slice(0, qIndex);
  const query = qIndex === -1 ? "" : relativePathWithQuery.slice(qIndex + 1);
  const sp = new URLSearchParams(query);
  sp.set(SHARE_LINK_QUERY_PARAM, "1");
  const s = sp.toString();
  return s ? `${path}?${s}` : path;
}

/** Ścieżka terminarza z meczem i flagą zaproszenia (przed dodaniem `awp_share`). */
export function terminarzInviteRelativePath(matchId: number): string {
  return `/terminarz?mecz=${matchId}&${INVITE_MATCH_QUERY_PARAM}=1`;
}
