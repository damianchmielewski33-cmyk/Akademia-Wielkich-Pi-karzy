export type RemotePlayerSuggestion = { id: string; name: string };

type TheSportsDbPlayer = { idPlayer?: string; strPlayer?: string };
type TheSportsDbSearchResponse = { player?: TheSportsDbPlayer[] | null };

/**
 * Propozycje z TheSportsDB (publiczne API). Przy błędzie sieci zwraca pustą listę —
 * użytkownik może wpisać nazwisko ręcznie.
 */
export async function searchPlayersRemote(query: string): Promise<RemotePlayerSuggestion[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const url = `https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=${encodeURIComponent(q)}`;
  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store" });
  } catch {
    return [];
  }
  if (!res.ok) return [];

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return [];
  }

  const data = json as TheSportsDbSearchResponse;
  const raw = data.player;
  if (!Array.isArray(raw)) return [];

  const seen = new Set<string>();
  const out: RemotePlayerSuggestion[] = [];
  for (const p of raw) {
    const name = typeof p.strPlayer === "string" ? p.strPlayer.trim() : "";
    if (!name) continue;
    const key = name.normalize("NFC").toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const id =
      typeof p.idPlayer === "string" && p.idPlayer.trim() !== ""
        ? p.idPlayer.trim()
        : `name:${key}`;
    out.push({ id, name });
    if (out.length >= 15) break;
  }
  return out;
}
