"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { LayoutGrid, Loader2, X } from "lucide-react";
import { LineupBoardPreloader } from "@/components/preloaders";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlayerAvatar, PlayerNameStack } from "@/components/player-avatar";
import { cn } from "@/lib/utils";
import { getSlotStylesAway, getSlotStylesHome } from "@/lib/match-lineup-layout";

type MatchOpt = { id: number; date: string; time: string; location: string; lineupPublic: boolean };
type Player = {
  userId: number;
  displayName: string;
  firstName: string;
  lastName: string;
  zawodnik: string;
  initials: string;
  profilePhotoPath: string | null;
};

type LineupState = { home: (number | null)[]; away: (number | null)[] };

function Toolbar({
  title,
  description,
  onReload,
  loading,
  children,
}: {
  title: string;
  description?: string;
  onReload: () => void;
  loading: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-4 sm:mb-6">
      <div className="min-w-0">
        <h1 className="text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl">{title}</h1>
        {description ? (
          <p className="mt-1 text-xs leading-relaxed text-zinc-600 sm:text-sm">{description}</p>
        ) : null}
      </div>
      <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
        {children}
        <Button type="button" variant="outline" size="sm" className="w-full sm:w-auto" onClick={onReload} disabled={loading}>
          Odśwież
        </Button>
      </div>
    </div>
  );
}

/** Przeciąganie palcem/myszą — HTML5 DnD na telefonach jest zawodne; Pointer Events działają wszędzie. */
function usePointerLineupDrag({
  assignToSlot,
  clearUserEverywhere,
  maxHomeSlots,
  maxAwaySlots,
}: {
  assignToSlot: (team: "home" | "away", slotIndex: number, userId: number) => void;
  clearUserEverywhere: (userId: number) => void;
  maxHomeSlots: number;
  maxAwaySlots: number;
}) {
  const dragRef = useRef<{ userId: number } | null>(null);
  const [ghost, setGhost] = useState<{ userId: number; x: number; y: number } | null>(null);

  useEffect(() => {
    if (!ghost) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [ghost]);

  const handlePointerDown = useCallback((e: React.PointerEvent, userId: number) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { userId };
    setGhost({ userId, x: e.clientX, y: e.clientY });
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return;
    setGhost((g) => (g ? { ...g, x: e.clientX, y: e.clientY } : null));
  }, []);

  const finishDrag = useCallback(
    (e: React.PointerEvent) => {
      const current = dragRef.current;
      if (!current) return;
      const { userId } = current;
      dragRef.current = null;
      setGhost(null);
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }

      const el = document.elementFromPoint(e.clientX, e.clientY);
      const slotEl = el?.closest("[data-lineup-slot]") as HTMLElement | null;
      const benchHit = el?.closest("[data-lineup-bench]");

      if (slotEl?.dataset.slotTeam != null && slotEl.dataset.slotIndex != null) {
        const team = slotEl.dataset.slotTeam as "home" | "away";
        const idx = Number(slotEl.dataset.slotIndex);
        if (team === "home" || team === "away") {
          const cap = team === "home" ? maxHomeSlots : maxAwaySlots;
          if (Number.isFinite(idx) && idx >= 0 && idx < cap) {
            assignToSlot(team, idx, userId);
          }
        }
      } else if (benchHit) {
        clearUserEverywhere(userId);
      }
    },
    [assignToSlot, clearUserEverywhere, maxAwaySlots, maxHomeSlots]
  );

  const handlePointerCancel = useCallback((e: React.PointerEvent) => {
    dragRef.current = null;
    setGhost(null);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }, []);

  const dragBind = useCallback(
    (userId: number) => ({
      onPointerDown: (e: React.PointerEvent) => handlePointerDown(e, userId),
      onPointerMove: handlePointerMove,
      onPointerUp: finishDrag,
      onPointerCancel: handlePointerCancel,
    }),
    [finishDrag, handlePointerCancel, handlePointerDown, handlePointerMove]
  );

  return { ghost, dragBind };
}

export function MatchLineupAdmin() {
  const [matches, setMatches] = useState<MatchOpt[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [matchInfo, setMatchInfo] = useState<MatchOpt | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [lineup, setLineup] = useState<LineupState>({ home: [], away: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lineupPublic, setLineupPublic] = useState(false);
  const [publishSaving, setPublishSaving] = useState(false);
  const everLoaded = useRef(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const playerById = useMemo(() => {
    const m = new Map<number, Player>();
    for (const p of players) m.set(p.userId, p);
    return m;
  }, [players]);

  const assignToSlot = useCallback((team: "home" | "away", slotIndex: number, userId: number) => {
    setLineup((prev) => {
      const home = [...prev.home];
      const away = [...prev.away];
      if (team === "home") {
        if (slotIndex < 0 || slotIndex >= home.length) return prev;
      } else {
        if (slotIndex < 0 || slotIndex >= away.length) return prev;
      }
      for (let i = 0; i < home.length; i++) {
        if (home[i] === userId) home[i] = null;
      }
      for (let i = 0; i < away.length; i++) {
        if (away[i] === userId) away[i] = null;
      }
      if (team === "home") home[slotIndex] = userId;
      else away[slotIndex] = userId;
      return { home, away };
    });
  }, []);

  const clearSlot = useCallback((team: "home" | "away", slotIndex: number) => {
    setLineup((prev) => {
      const home = [...prev.home];
      const away = [...prev.away];
      if (team === "home") home[slotIndex] = null;
      else away[slotIndex] = null;
      return { home, away };
    });
  }, []);

  const clearUserEverywhere = useCallback((userId: number) => {
    setLineup((prev) => ({
      home: prev.home.map((u) => (u === userId ? null : u)),
      away: prev.away.map((u) => (u === userId ? null : u)),
    }));
  }, []);

  const { ghost, dragBind } = usePointerLineupDrag({
    assignToSlot,
    clearUserEverywhere,
    maxHomeSlots: lineup.home.length,
    maxAwaySlots: lineup.away.length,
  });

  const load = useCallback(async (matchId?: number | null) => {
    setLoading(true);
    try {
      const q =
        matchId != null && Number.isFinite(matchId) ? `?matchId=${matchId}` : "";
      const res = await fetch(`/api/admin/lineup${q}`);
      if (!res.ok) throw new Error();
      const data = (await res.json()) as {
        matches: MatchOpt[];
        selectedMatchId: number | null;
        match: MatchOpt | null;
        pitchSlotTotal: number;
        homeSlotCount: number;
        awaySlotCount: number;
        players: Player[];
        home: (number | null)[];
        away: (number | null)[];
      };
      setMatches(data.matches);
      setSelectedId(data.selectedMatchId);
      setMatchInfo(data.match);
      setLineupPublic(data.match?.lineupPublic ?? false);
      setPlayers(data.players);
      setLineup({
        home: [...data.home],
        away: [...data.away],
      });
    } catch {
      toast.error("Nie udało się wczytać składów");
    } finally {
      setLoading(false);
      everLoaded.current = true;
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const togglePublish = useCallback(
    async (published: boolean) => {
      if (selectedId == null) return;
      setPublishSaving(true);
      try {
        const res = await fetch("/api/admin/lineup/publish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ match_id: selectedId, published }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error(typeof data.error === "string" ? data.error : "Nie zapisano widoczności");
          return;
        }
        setLineupPublic(published);
        setMatches((prev) =>
          prev.map((m) => (m.id === selectedId ? { ...m, lineupPublic: published } : m))
        );
        toast.success(
          published ? "Składy widoczne na stronie głównej" : "Składy ukryte na stronie głównej"
        );
      } catch {
        toast.error("Nie zapisano widoczności");
      } finally {
        setPublishSaving(false);
      }
    },
    [selectedId]
  );

  async function save() {
    if (selectedId == null) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/lineup", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          match_id: selectedId,
          home: lineup.home,
          away: lineup.away,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Nie zapisano składu");
        return;
      }
      toast.success("Zapisano składy na boisku");
    } catch {
      toast.error("Nie zapisano składu");
    } finally {
      setSaving(false);
    }
  }

  const onSelectMatch = (v: string) => {
    const id = Number(v);
    if (!Number.isFinite(id)) return;
    setSelectedId(id);
    setLineup({ home: [], away: [] });
    void load(id);
  };

  const bench = useMemo(() => {
    const onPitch = new Set<number>();
    for (const u of lineup.home) if (u != null) onPitch.add(u);
    for (const u of lineup.away) if (u != null) onPitch.add(u);
    return players.filter((p) => !onPitch.has(p.userId));
  }, [players, lineup.home, lineup.away]);

  const showInitialSpinner = loading && !everLoaded.current;

  const ghostPlayer = ghost ? playerById.get(ghost.userId) : undefined;

  return (
    <div className="min-w-0 overflow-x-hidden pb-4">
      <Toolbar
        title="Składy na mecz"
        description="Liczba pól na boisku zależy od zapisów (12–16). Przeciągnij zawodników (telefon lub komputer). Pusto = rezerwa."
        onReload={() => void load(selectedId)}
        loading={loading}
      >
        <Button
          type="button"
          size="sm"
          className="w-full sm:w-auto"
          onClick={() => void save()}
          disabled={saving || selectedId == null || loading}
        >
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
          Zapisz składy
        </Button>
      </Toolbar>

      {mounted &&
        ghost &&
        ghostPlayer &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[200] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5 rounded-xl border-2 border-emerald-400 bg-white/95 p-1.5 shadow-xl"
            style={{ left: ghost.x, top: ghost.y }}
            aria-hidden
          >
            <PlayerAvatar
              photoPath={ghostPlayer.profilePhotoPath}
              firstName={ghostPlayer.firstName}
              lastName={ghostPlayer.lastName}
              size="sm"
              ringClassName="ring-2 ring-emerald-300"
            />
            <span className="max-w-[88px] truncate text-center text-[10px] font-semibold leading-tight text-zinc-800">
              {ghostPlayer.displayName}
            </span>
          </div>,
          document.body
        )}

      {showInitialSpinner ? (
        <LineupBoardPreloader />
      ) : matches.length === 0 ? (
        <Card className="border-zinc-200/80 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Brak meczów do ułożenia składu</CardTitle>
            <CardDescription>
              Pojawią się nadchodzące mecze (od dzisiejszej daty), które nie są oznaczone jako rozegrane.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-4 sm:space-y-6">
          <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-zinc-900">Widoczność na stronie głównej</p>
              <p className="mt-0.5 text-xs leading-snug text-zinc-600">
                Przycisk „Zobacz składy na mecz” jest aktywny dopiero po udostępnieniu.
              </p>
            </div>
            <Button
              type="button"
              variant={lineupPublic ? "outline" : "default"}
              className="h-auto min-h-11 w-full shrink-0 whitespace-normal px-3 py-2.5 text-center text-sm leading-snug sm:w-auto sm:min-h-10 sm:max-w-[280px]"
              disabled={publishSaving || selectedId == null}
              onClick={() => void togglePublish(!lineupPublic)}
            >
              {publishSaving ? <Loader2 className="mr-2 inline h-4 w-4 animate-spin align-middle" aria-hidden /> : null}
              <span className="align-middle">{lineupPublic ? "Ukryj przed zawodnikami" : "Udostępnij na stronie głównej"}</span>
            </Button>
          </div>

          <div className="flex flex-col gap-3">
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Mecz</p>
              <Select value={selectedId != null ? String(selectedId) : undefined} onValueChange={onSelectMatch}>
                <SelectTrigger className="h-11 w-full max-w-full min-w-0" aria-label="Wybierz mecz">
                  <SelectValue placeholder="Wybierz mecz" className="truncate text-left" />
                </SelectTrigger>
                <SelectContent position="popper" className="max-h-[min(70vh,320px)] w-[var(--radix-select-trigger-width)]">
                  {matches.map((m) => (
                    <SelectItem key={m.id} value={String(m.id)}>
                      <span className="line-clamp-2">
                        {m.date} · {m.time} — {m.location}
                        {m.lineupPublic ? " · widoczne" : ""}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {matchInfo ? (
              <p className="text-xs leading-relaxed text-zinc-600 sm:text-sm">
                Domyślnie: <strong className="text-zinc-800">najbliższy termin</strong> z terminarza.
              </p>
            ) : null}
          </div>

          <div className="grid min-w-0 gap-4 lg:gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <Card className="min-w-0 border-zinc-200/80 bg-white shadow-sm">
              <CardHeader className="space-y-1 pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <LayoutGrid className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden />
                  Zapisani na mecz
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Przeciągnij chip na boisko. Zawodnicy bez pozycji = rezerwa.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-3 sm:px-6">
                <BenchDropZone disabled={selectedId == null} className="min-h-[100px] sm:min-h-[120px]">
                  {players.length === 0 ? (
                    <p className="text-sm text-zinc-500">Brak zapisów na wybrany mecz.</p>
                  ) : bench.length === 0 ? (
                    <p className="text-sm text-zinc-500">Wszyscy zawodnicy są na boisku.</p>
                  ) : (
                    <ul className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                      {bench.map((p) => (
                        <li key={p.userId} className="min-w-0">
                          <PlayerChip
                            player={p}
                            variant="list"
                            dragBind={() => dragBind(p.userId)}
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </BenchDropZone>
              </CardContent>
            </Card>

            <PitchCard
              lineup={lineup}
              playerById={playerById}
              clearSlot={clearSlot}
              disabled={selectedId == null || players.length === 0 || lineup.home.length === 0}
              dragBind={dragBind}
              pitchSlotTotal={lineup.home.length + lineup.away.length}
              homeSlotCount={lineup.home.length}
              awaySlotCount={lineup.away.length}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function BenchDropZone({
  children,
  disabled,
  className,
}: {
  children: ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div
      data-lineup-bench
      className={cn(
        "rounded-xl border-2 border-dashed border-zinc-200 bg-zinc-50/50 p-2 sm:p-3",
        disabled && "pointer-events-none opacity-50",
        className
      )}
    >
      {children}
      <p className="mt-2 text-[11px] leading-snug text-zinc-500 sm:mt-3 sm:text-xs">
        Upuść tutaj, aby zdjąć zawodnika z boiska (rezerwa). Na telefonie przeciągnij z powrotem na tę ramkę.
      </p>
    </div>
  );
}

function PlayerChip({
  player,
  variant,
  dragBind,
}: {
  player: Player;
  variant: "list" | "slot";
  dragBind?: () => {
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
    onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
    onPointerCancel: (e: React.PointerEvent<HTMLDivElement>) => void;
  };
}) {
  const d = dragBind?.();

  return (
    <div
      {...(d ?? {})}
      style={{ touchAction: d ? "none" : undefined }}
      className={cn(
        "flex cursor-grab select-none items-center gap-1.5 rounded-lg border bg-white text-left shadow-sm active:cursor-grabbing dark:bg-zinc-800 sm:gap-2",
        variant === "list"
          ? "max-w-full min-h-[44px] px-2 py-1.5 text-xs touch-manipulation sm:max-w-[200px] sm:min-h-0 sm:px-2.5"
          : "max-w-[4.25rem] flex-col gap-0.5 px-1 py-1 text-[10px] touch-manipulation sm:max-w-[5.25rem]",
        variant === "slot"
          ? "border-emerald-200/90 text-emerald-950 dark:border-emerald-700/80 dark:text-emerald-100"
          : "border-zinc-200 text-zinc-800 hover:border-emerald-300 dark:border-zinc-600 dark:text-zinc-200 dark:hover:border-emerald-500/70"
      )}
      title={`${player.displayName}${player.zawodnik ? ` (${player.zawodnik})` : ""}`}
    >
      <PlayerAvatar
        photoPath={player.profilePhotoPath}
        firstName={player.firstName}
        lastName={player.lastName}
        size={variant === "slot" ? "xs" : "xs"}
        ringClassName={variant === "slot" ? "ring-2 ring-emerald-200" : "ring-2 ring-zinc-200"}
        className={variant === "slot" ? "h-6 w-6 shrink-0 text-[9px] sm:h-7 sm:w-7" : undefined}
      />
      <div className={cn("min-w-0 flex-1", variant === "slot" && "w-full text-center")}>
        <PlayerNameStack
          firstName={player.firstName}
          lastName={player.lastName}
          nick={player.zawodnik}
          primaryClassName={cn(
            "font-semibold leading-tight",
            variant === "list" ? "text-[11px] sm:text-[11px]" : "line-clamp-2 text-[9px] sm:text-[10px]"
          )}
          secondaryClassName={cn(variant === "slot" ? "hidden sm:block text-[9px]" : "text-[10px] text-zinc-500 dark:text-zinc-400")}
        />
      </div>
    </div>
  );
}

function PitchCard({
  lineup,
  playerById,
  clearSlot,
  disabled,
  dragBind,
  pitchSlotTotal,
  homeSlotCount,
  awaySlotCount,
}: {
  lineup: LineupState;
  playerById: Map<number, Player>;
  clearSlot: (team: "home" | "away", slotIndex: number) => void;
  disabled?: boolean;
  pitchSlotTotal: number;
  homeSlotCount: number;
  awaySlotCount: number;
  dragBind: (userId: number) => {
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
    onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
    onPointerCancel: (e: React.PointerEvent<HTMLDivElement>) => void;
  };
}) {
  return (
    <Card className="min-w-0 overflow-hidden border-zinc-200/80 bg-white shadow-sm">
      <CardHeader className="space-y-1 pb-2">
        <CardTitle className="text-base">
          Boisko ({pitchSlotTotal} pól: A {homeSlotCount} · B {awaySlotCount})
        </CardTitle>
        <CardDescription className="text-xs leading-relaxed sm:text-sm">
          Drużyna B — góra, drużyna A — dół. Przeciągnij z listy lub między polami. Dwuklik na polu (mysz) =
          opróżnij.
        </CardDescription>
      </CardHeader>
      <CardContent className="min-w-0 px-2 pb-3 pt-0 sm:px-4 sm:pb-4">
        <div
          className={cn(
            "relative mx-auto aspect-[3/4] w-full max-w-[min(100%,24rem)] overflow-hidden rounded-2xl border-2 border-white/40 shadow-inner sm:max-w-lg",
            disabled && "pointer-events-none opacity-60"
          )}
          style={{
            background:
              "linear-gradient(180deg, #14532d 0%, #166534 18%, #15803d 50%, #166534 82%, #14532d 100%)",
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12)",
          }}
        >
          <div className="pointer-events-none absolute inset-[4%] rounded-xl border border-white/35" />
          <div className="pointer-events-none absolute left-[4%] right-[4%] top-1/2 h-0 -translate-y-1/2 border-t-2 border-white/45" />
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[18%] w-[18%] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/40" />
          <div className="pointer-events-none absolute bottom-[4%] left-1/2 h-[3px] w-[3px] -translate-x-1/2 rounded-full bg-white/70" />

          <div className="absolute inset-[4%] flex flex-col">
            <div className="relative min-h-0 flex-[1_1_50%] min-h-[112px] sm:min-h-[140px]">
              <TeamHalf
                label="Drużyna B"
                team="away"
                slots={lineup.away}
                slotStyles={getSlotStylesAway(lineup.away.length)}
                playerById={playerById}
                clearSlot={clearSlot}
                disabled={disabled}
                dragBind={dragBind}
              />
            </div>
            <div className="relative min-h-0 flex-[1_1_50%] min-h-[112px] sm:min-h-[140px]">
              <TeamHalf
                label="Drużyna A"
                team="home"
                slots={lineup.home}
                slotStyles={getSlotStylesHome(lineup.home.length)}
                playerById={playerById}
                clearSlot={clearSlot}
                disabled={disabled}
                dragBind={dragBind}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TeamHalf({
  label,
  team,
  slots,
  slotStyles,
  playerById,
  clearSlot,
  disabled,
  dragBind,
}: {
  label: string;
  team: "home" | "away";
  slots: (number | null)[];
  slotStyles: { top: string; left: string }[];
  playerById: Map<number, Player>;
  clearSlot: (team: "home" | "away", slotIndex: number) => void;
  disabled?: boolean;
  dragBind: (userId: number) => {
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
    onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
    onPointerCancel: (e: React.PointerEvent<HTMLDivElement>) => void;
  };
}) {
  return (
    <div className="relative h-full min-h-[112px] sm:min-h-[140px]">
      <p
        className={cn(
          "pointer-events-none absolute left-1 z-10 max-w-[calc(100%-8px)] truncate rounded bg-black/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white/95 sm:left-2 sm:px-2 sm:text-[10px]",
          team === "away" ? "top-1 sm:top-2" : "bottom-1 sm:bottom-2"
        )}
      >
        {label}
      </p>
      {slots.map((uid, i) => {
        const pos = slotStyles[i] ?? { top: "50%", left: "50%" };
        const p = uid != null ? playerById.get(uid) : undefined;
        return (
          <div
            key={`${team}-${i}`}
            data-lineup-slot
            data-slot-team={team}
            data-slot-index={String(i)}
            className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
            style={{ top: pos.top, left: pos.left }}
          >
            <div
              className={cn(
                "relative flex min-h-[40px] min-w-[40px] items-center justify-center rounded-full border-2 border-dashed transition-colors sm:min-h-[52px] sm:min-w-[52px]",
                p ? "border-white/50 bg-white/10 p-0.5 sm:p-1.5" : "border-white/35 bg-black/15"
              )}
              onDoubleClick={() => {
                if (disabled || uid == null) return;
                clearSlot(team, i);
              }}
            >
              {p ? (
                <>
                  <PlayerChip player={p} variant="slot" dragBind={() => dragBind(p.userId)} />
                  <button
                    type="button"
                    className="absolute -right-0.5 -top-0.5 z-30 flex h-7 w-7 touch-manipulation items-center justify-center rounded-full border border-white/40 bg-zinc-900/90 text-white shadow-md active:bg-black sm:h-6 sm:w-6"
                    aria-label="Opróżnij pole"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (disabled) return;
                      clearSlot(team, i);
                    }}
                  >
                    <X className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </>
              ) : (
                <span className="pointer-events-none px-0.5 text-center text-[9px] font-semibold text-white/85 sm:text-[10px]">
                  {i + 1}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
