"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Smartphone, TabletSmartphone, UserX, Users } from "lucide-react";
import { toast } from "@/lib/app-toast";
import { formatActivityTimePl } from "@/lib/activity-display";
import {
  AdminCard,
  AdminMetricTile,
  AdminTableShell,
  AdminToolbar,
  adminDataSearchInputClass,
} from "@/components/admin-ui";
import { AdminFilterChips } from "@/components/admin-row-actions";
import { PlayerAvatar, PlayerNameStack } from "@/components/player-avatar";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type MobileFilter = "installed" | "android" | "ios" | "none" | "all";

type PlayerMobileRow = {
  id: number;
  first_name: string;
  last_name: string;
  zawodnik: string;
  profile_photo_path: string | null;
  android: boolean;
  ios: boolean;
  ios_source: "native" | "pwa" | null;
  android_last_at: string | null;
  ios_last_at: string | null;
  last_seen_at: string | null;
};

type Summary = {
  players: number;
  with_android: number;
  with_ios: number;
  with_any: number;
  without: number;
};

function formatSeen(raw: string | null): string {
  if (!raw) return "—";
  return formatActivityTimePl(raw);
}

export function AdminMobileAppsTab() {
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<MobileFilter>("installed");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [players, setPlayers] = useState<PlayerMobileRow[]>([]);

  const load = useCallback(async (q: string, f: MobileFilter) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      params.set("filter", f);
      const res = await fetch(`/api/admin/mobile-apps?${params.toString()}`);
      if (!res.ok) throw new Error();
      const json = (await res.json()) as { summary: Summary; players: PlayerMobileRow[] };
      setSummary(json.summary);
      setPlayers(Array.isArray(json.players) ? json.players : []);
    } catch {
      toast.error("Nie udało się wczytać listy aplikacji mobilnych");
      setPlayers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void load(query, filter);
    }, query ? 250 : 0);
    return () => window.clearTimeout(t);
  }, [query, filter, load]);

  return (
    <div className="space-y-4">
      <AdminToolbar
        title="Aplikacje mobilne"
        description="Sprawdź po imieniu i nazwisku, kto ma zainstalowaną aplikację Android lub iOS (PWA)."
        onReload={() => void load(query, filter)}
        loading={loading}
      />

      {summary ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <AdminMetricTile
            label="Z aplikacją"
            hint={`z ${summary.players} graczy`}
            value={summary.with_any}
            icon={Smartphone}
            photoKey="mobile-any"
            onClick={() => setFilter("installed")}
          />
          <AdminMetricTile
            label="Android"
            hint="Aplikacja natywna"
            value={summary.with_android}
            icon={TabletSmartphone}
            photoKey="mobile-android"
            onClick={() => setFilter("android")}
          />
          <AdminMetricTile
            label="iOS"
            hint="Aplikacja / PWA"
            value={summary.with_ios}
            icon={Smartphone}
            photoKey="mobile-ios"
            onClick={() => setFilter("ios")}
          />
          <AdminMetricTile
            label="Bez aplikacji"
            hint="Brak rejestracji urządzenia"
            value={summary.without}
            icon={UserX}
            photoKey="mobile-none"
            onClick={() => setFilter("none")}
          />
        </div>
      ) : null}

      <AdminCard
        title="Weryfikacja instalacji"
        description="Wyszukaj gracza i zobacz, na jakiej platformie ma aplikację."
        headerExtra={<Users className="h-5 w-5 text-white/90" aria-hidden />}
      >
        <div className="mb-3 flex flex-col gap-3">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Szukaj po imieniu i nazwisku…"
            className={adminDataSearchInputClass}
            aria-label="Szukaj gracza po imieniu i nazwisku"
          />
          <AdminFilterChips
            ariaLabel="Filtr aplikacji"
            value={filter}
            onChange={(id) => setFilter(id as MobileFilter)}
            options={[
              { id: "installed", label: "Z aplikacją", count: summary?.with_any },
              { id: "android", label: "Android", count: summary?.with_android },
              { id: "ios", label: "iOS", count: summary?.with_ios },
              { id: "none", label: "Bez", count: summary?.without },
              { id: "all", label: "Wszyscy", count: summary?.players },
            ]}
          />
        </div>

        <AdminTableShell>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Gracz</TableHead>
                <TableHead>Platformy</TableHead>
                <TableHead className="hidden sm:table-cell">Ostatnio widziany</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && players.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="py-10 text-center text-sm">
                    <span className="inline-flex items-center gap-2 text-emerald-100/80">
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      Wczytywanie…
                    </span>
                  </TableCell>
                </TableRow>
              ) : players.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="py-8 text-center text-sm text-emerald-100/75">
                    {query.trim()
                      ? "Brak graczy pasujących do wyszukiwania."
                      : filter === "none"
                        ? "Wszyscy widoczni gracze mają aplikację albo lista jest pusta."
                        : "Brak zarejestrowanych instalacji dla tego filtra."}
                  </TableCell>
                </TableRow>
              ) : (
                players.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <PlayerAvatar
                          firstName={p.first_name}
                          lastName={p.last_name}
                          photoPath={p.profile_photo_path}
                          size="sm"
                        />
                        <PlayerNameStack
                          firstName={p.first_name}
                          lastName={p.last_name}
                          nick={p.zawodnik}
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        {p.android ? (
                          <Badge variant="secondary" className="font-semibold">
                            Android
                          </Badge>
                        ) : null}
                        {p.ios ? (
                          <Badge variant="secondary" className="font-semibold">
                            iOS{p.ios_source === "pwa" ? " · PWA" : ""}
                          </Badge>
                        ) : null}
                        {!p.android && !p.ios ? (
                          <span className="text-sm text-emerald-100/60">Brak</span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-[11px] text-emerald-100/55 sm:hidden">
                        {formatSeen(p.last_seen_at)}
                      </p>
                    </TableCell>
                    <TableCell className="hidden tabular-nums text-sm text-emerald-100/80 sm:table-cell">
                      {formatSeen(p.last_seen_at)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </AdminTableShell>
      </AdminCard>
    </div>
  );
}
