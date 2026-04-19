"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
import { SLOT_STYLE_AWAY, SLOT_STYLE_HOME } from "@/lib/match-lineup-layout";

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

const MIME = "application/x-awp-user";

/** HTML5 DnD na wielu telefonach nie działa z dotykiem — osobny tryb „wybierz → dotknij cel”. */
function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(pointer: coarse)");
    const apply = () => setCoarse(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return coarse;
}

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
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">{title}</h1>
        {description ? <p className="mt-1 text-sm text-zinc-600">{description}</p> : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {children}
        <Button type="button" variant="outline" size="sm" onClick={onReload} disabled={loading}>
          Odśwież
        </Button>
      </div>
    </div>
  );
}

export function MatchLineupAdmin() {
  const [matches, setMatches] = useState<MatchOpt[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [matchInfo, setMatchInfo] = useState<MatchOpt | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [lineup, setLineup] = useState<LineupState>({
    home: Array(7).fill(null),
    away: Array(7).fill(null),
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lineupPublic, setLineupPublic] = useState(false);
  const [publishSaving, setPublishSaving] = useState(false);
  const everLoaded = useRef(false);
  const coarsePointer = useCoarsePointer();
  const [pickedUserId, setPickedUserId] = useState<number | null>(null);

  const playerById = useMemo(() => {
    const m = new Map<number, Player>();
    for (const p of players) m.set(p.userId, p);
    return m;
  }, [players]);

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

  useEffect(() => {
    setPickedUserId(null);
  }, [selectedId]);

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

  const assignToSlot = useCallback((team: "home" | "away", slotIndex: number, userId: number) => {
    setLineup((prev) => {
      const home = [...prev.home];
      const away = [...prev.away];
      for (let i = 0; i < 7; i++) {
        if (home[i] === userId) home[i] = null;
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
    // Od razu czyścimy boisko — inaczej przy szybkim „Zapisz” w API leci nowy match_id ze starymi user_id z poprzedniego meczu.
    setLineup({ home: Array(7).fill(null), away: Array(7).fill(null) });
    void load(id);
  };

  const bench = useMemo(() => {
    const onPitch = new Set<number>();
    for (const u of lineup.home) if (u != null) onPitch.add(u);
    for (const u of lineup.away) if (u != null) onPitch.add(u);
    return players.filter((p) => !onPitch.has(p.userId));
  }, [players, lineup.home, lineup.away]);

  const showInitialSpinner = loading && !everLoaded.current;

  return (
    <div>
      <Toolbar
        title="Składy na mecz"
        description="Wybierz termin, ułóż zapisanych zawodników na jedną z 7 pozycji w każdej drużynie (przeciąganie na komputerze; na telefonie: wybór dotykiem). Pusto = rezerwa."
        onReload={() => void load(selectedId)}
        loading={loading}
      >
        <Button
          type="button"
          size="sm"
          onClick={() => void save()}
          disabled={saving || selectedId == null || loading}
        >
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Zapisz składy
        </Button>
      </Toolbar>

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
        <div className="space-y-6">
          <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-zinc-900">Widoczność na stronie głównej</p>
              <p className="mt-0.5 text-xs text-zinc-600">
                Przycisk „Zobacz składy na mecz” jest aktywny dopiero po udostępnieniu.
              </p>
            </div>
            <Button
              type="button"
              variant={lineupPublic ? "outline" : "default"}
              className="shrink-0"
              disabled={publishSaving || selectedId == null}
              onClick={() => void togglePublish(!lineupPublic)}
            >
              {publishSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
              {lineupPublic ? "Ukryj przed zawodnikami" : "Udostępnij na stronie głównej"}
            </Button>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Mecz</p>
              <Select value={selectedId != null ? String(selectedId) : undefined} onValueChange={onSelectMatch}>
                <SelectTrigger className="w-full min-w-[240px] sm:w-80" aria-label="Wybierz mecz">
                  <SelectValue placeholder="Wybierz mecz" />
                </SelectTrigger>
                <SelectContent>
                  {matches.map((m) => (
                    <SelectItem key={m.id} value={String(m.id)}>
                      {m.date} · {m.time} — {m.location}
                      {m.lineupPublic ? " · widoczne" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {matchInfo ? (
              <p className="text-sm text-zinc-600">
                Domyślnie: <strong className="text-zinc-800">najbliższy termin</strong> z terminarza.
              </p>
            ) : null}
          </div>

          {coarsePointer ? (
            <p className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-950">
              <strong>Telefon / dotyk:</strong> dotknij zawodnika, żeby go wybrać (zielona ramka), potem{" "}
              <strong>puste lub zajęte pole</strong> na boisku — aby ustawić w tym miejscu. Ramka „Zapisani”:
              dotknij, aby zdjąć wybranego z boiska do rezerwy.{" "}
              <button
                type="button"
                className="font-semibold text-sky-800 underline decoration-sky-400 underline-offset-2"
                onClick={() => setPickedUserId(null)}
                disabled={pickedUserId == null}
              >
                Anuluj wybór
              </button>
            </p>
          ) : null}

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <Card className="border-zinc-200/80 bg-white shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <LayoutGrid className="h-4 w-4 text-emerald-700" aria-hidden />
                  Zapisani na mecz
                </CardTitle>
                <CardDescription>
                  {coarsePointer
                    ? "Dotknij zawodnika, potem pole na boisku. Zawodnicy bez pozycji = rezerwa."
                    : "Przeciągnij na boisko. Zawodnicy bez pozycji pozostają poza składem startowym."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BenchDropZone
                  onDropUser={clearUserEverywhere}
                  disabled={selectedId == null}
                  touchMode={coarsePointer}
                  pickedUserId={pickedUserId}
                  onTouchZoneClick={() => {
                    if (pickedUserId != null) {
                      clearUserEverywhere(pickedUserId);
                      setPickedUserId(null);
                    }
                  }}
                  className="min-h-[120px]"
                >
                  {players.length === 0 ? (
                    <p className="text-sm text-zinc-500">Brak zapisów na wybrany mecz.</p>
                  ) : bench.length === 0 ? (
                    <p className="text-sm text-zinc-500">Wszyscy zawodnicy są na boisku.</p>
                  ) : (
                    <ul className="flex flex-wrap gap-2">
                      {bench.map((p) => (
                        <li key={p.userId}>
                          <PlayerChip
                            player={p}
                            variant="list"
                            touchMode={coarsePointer}
                            selected={pickedUserId === p.userId}
                            onToggleTouchPick={() =>
                              setPickedUserId((cur) => (cur === p.userId ? null : p.userId))
                            }
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
              assignToSlot={assignToSlot}
              clearSlot={clearSlot}
              disabled={selectedId == null || players.length === 0}
              touchMode={coarsePointer}
              pickedUserId={pickedUserId}
              onPickForTouch={setPickedUserId}
              onAfterTouchPlace={() => setPickedUserId(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function BenchDropZone({
  children,
  onDropUser,
  disabled,
  touchMode,
  pickedUserId,
  onTouchZoneClick,
  className,
}: {
  children: ReactNode;
  onDropUser: (userId: number) => void;
  disabled?: boolean;
  touchMode?: boolean;
  pickedUserId?: number | null;
  onTouchZoneClick?: () => void;
  className?: string;
}) {
  const [over, setOver] = useState(false);
  return (
    <div
      className={cn(
        "rounded-xl border-2 border-dashed p-3 transition-colors",
        over ? "border-emerald-500 bg-emerald-50/60" : "border-zinc-200 bg-zinc-50/50",
        disabled && "pointer-events-none opacity-50",
        touchMode && pickedUserId != null && !disabled && "ring-2 ring-sky-400 ring-offset-2",
        touchMode && !disabled && "cursor-pointer",
        className
      )}
      role={touchMode ? "button" : undefined}
      tabIndex={touchMode && !disabled ? 0 : undefined}
      onClick={() => {
        if (!touchMode || disabled) return;
        onTouchZoneClick?.();
      }}
      onKeyDown={(e) => {
        if (!touchMode || disabled) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onTouchZoneClick?.();
        }
      }}
      onDragOver={(e) => {
        if (disabled || touchMode) return;
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        if (disabled || touchMode) return;
        const raw = e.dataTransfer.getData(MIME);
        const userId = Number(raw);
        if (Number.isFinite(userId)) onDropUser(userId);
      }}
    >
      {children}
      <p className="mt-3 text-xs text-zinc-500">
        {touchMode
          ? pickedUserId != null
            ? "Dotknij ten obszar, aby zdjąć wybranego zawodnika z boiska (rezerwa)."
            : "Najpierw wybierz zawodnika na boisku lub liście, potem użyj pola poniżej."
          : "Upuść tutaj, aby zdjąć zawodnika z boiska (rezerwa)."}
      </p>
    </div>
  );
}

function PlayerChip({
  player,
  variant,
  touchMode,
  selected,
  onToggleTouchPick,
}: {
  player: Player;
  variant: "list" | "slot";
  touchMode?: boolean;
  selected?: boolean;
  onToggleTouchPick?: () => void;
}) {
  return (
    <div
      draggable={!touchMode}
      onClick={(e) => {
        if (!touchMode || !onToggleTouchPick) return;
        e.stopPropagation();
        onToggleTouchPick();
      }}
      onDragStart={(e) => {
        if (touchMode) {
          e.preventDefault();
          return;
        }
        e.dataTransfer.setData(MIME, String(player.userId));
        e.dataTransfer.effectAllowed = "move";
      }}
      className={cn(
        "flex max-w-[200px] select-none items-center gap-2 rounded-lg border bg-white px-2.5 py-1.5 text-left text-xs shadow-sm dark:bg-zinc-800",
        touchMode ? "touch-manipulation cursor-pointer" : "cursor-grab active:cursor-grabbing",
        variant === "slot"
          ? "border-emerald-200/90 text-emerald-950 dark:border-emerald-700/80 dark:text-emerald-100"
          : "border-zinc-200 text-zinc-800 hover:border-emerald-300 dark:border-zinc-600 dark:text-zinc-200 dark:hover:border-emerald-500/70",
        selected && "ring-2 ring-emerald-500 ring-offset-2 ring-offset-white dark:ring-offset-zinc-900"
      )}
      title={`${player.displayName}${player.zawodnik ? ` (${player.zawodnik})` : ""}`}
    >
      <PlayerAvatar
        photoPath={player.profilePhotoPath}
        firstName={player.firstName}
        lastName={player.lastName}
        size="xs"
        ringClassName={variant === "slot" ? "ring-2 ring-emerald-200" : "ring-2 ring-zinc-200"}
      />
      <div className="min-w-0 flex-1">
        <PlayerNameStack
          firstName={player.firstName}
          lastName={player.lastName}
          nick={player.zawodnik}
          primaryClassName="text-[11px] font-semibold leading-tight"
          secondaryClassName="text-[10px] text-zinc-500 dark:text-zinc-400"
        />
      </div>
    </div>
  );
}

function PitchCard({
  lineup,
  playerById,
  assignToSlot,
  clearSlot,
  disabled,
  touchMode,
  pickedUserId,
  onPickForTouch,
  onAfterTouchPlace,
}: {
  lineup: LineupState;
  playerById: Map<number, Player>;
  assignToSlot: (team: "home" | "away", slotIndex: number, userId: number) => void;
  clearSlot: (team: "home" | "away", slotIndex: number) => void;
  disabled?: boolean;
  touchMode?: boolean;
  pickedUserId: number | null;
  onPickForTouch: (userId: number | null) => void;
  onAfterTouchPlace: () => void;
}) {
  return (
    <Card className="overflow-hidden border-zinc-200/80 bg-white shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Boisko (7 na drużynę)</CardTitle>
        <CardDescription>
          Drużyna B — górna połowa, drużyna A — dolna.{" "}
          {touchMode
            ? "Dotknij wybranego zawodnika, potem pole; krzyżyk opróżnia pozycję. Przeciąganie działa na komputerze."
            : "Klik dwukrotnie zajęte pole, aby je opróżnić."}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-2 pb-4 sm:px-4">
        <div
          className={cn(
            "relative mx-auto aspect-[3/4] w-full max-w-lg overflow-hidden rounded-2xl border-2 border-white/40 shadow-inner",
            disabled && "pointer-events-none opacity-60"
          )}
          style={{
            background:
              "linear-gradient(180deg, #14532d 0%, #166534 18%, #15803d 50%, #166534 82%, #14532d 100%)",
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12)",
          }}
        >
          {/* linie boiska */}
          <div className="pointer-events-none absolute inset-[4%] rounded-xl border border-white/35" />
          <div className="pointer-events-none absolute left-[4%] right-[4%] top-1/2 h-0 -translate-y-1/2 border-t-2 border-white/45" />
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[18%] w-[18%] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/40" />
          <div className="pointer-events-none absolute bottom-[4%] left-1/2 h-[3px] w-[3px] -translate-x-1/2 rounded-full bg-white/70" />

          <div className="absolute inset-[4%] flex flex-col">
            <div className="relative min-h-0 flex-[1_1_50%]">
              <TeamHalf
                label="Drużyna B"
                team="away"
                slots={lineup.away}
                slotStyles={SLOT_STYLE_AWAY}
                playerById={playerById}
                assignToSlot={assignToSlot}
                clearSlot={clearSlot}
                disabled={disabled}
                touchMode={touchMode}
                pickedUserId={pickedUserId}
                onPickForTouch={onPickForTouch}
                onAfterTouchPlace={onAfterTouchPlace}
              />
            </div>
            <div className="relative min-h-0 flex-[1_1_50%]">
              <TeamHalf
                label="Drużyna A"
                team="home"
                slots={lineup.home}
                slotStyles={SLOT_STYLE_HOME}
                playerById={playerById}
                assignToSlot={assignToSlot}
                clearSlot={clearSlot}
                disabled={disabled}
                touchMode={touchMode}
                pickedUserId={pickedUserId}
                onPickForTouch={onPickForTouch}
                onAfterTouchPlace={onAfterTouchPlace}
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
  assignToSlot,
  clearSlot,
  disabled,
  touchMode,
  pickedUserId,
  onPickForTouch,
  onAfterTouchPlace,
}: {
  label: string;
  team: "home" | "away";
  slots: (number | null)[];
  slotStyles: { top: string; left: string }[];
  playerById: Map<number, Player>;
  assignToSlot: (team: "home" | "away", slotIndex: number, userId: number) => void;
  clearSlot: (team: "home" | "away", slotIndex: number) => void;
  disabled?: boolean;
  touchMode?: boolean;
  pickedUserId: number | null;
  onPickForTouch: (userId: number | null) => void;
  onAfterTouchPlace: () => void;
}) {
  return (
    <div className="relative h-full min-h-[140px]">
      <p
        className={cn(
          "pointer-events-none absolute left-2 z-10 rounded bg-black/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white/95",
          team === "away" ? "top-2" : "bottom-2"
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
            className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
            style={{ top: pos.top, left: pos.left }}
          >
            <div
              className={cn(
                "relative flex min-h-[52px] min-w-[52px] items-center justify-center rounded-full border-2 border-dashed transition-colors",
                p ? "border-white/50 bg-white/10 p-1.5" : "border-white/35 bg-black/15",
                touchMode && pickedUserId != null && "ring-2 ring-amber-200/90 ring-offset-1 ring-offset-transparent"
              )}
              onClick={() => {
                if (!touchMode || disabled || pickedUserId == null) return;
                assignToSlot(team, i, pickedUserId);
                onAfterTouchPlace();
              }}
              onDragOver={(e) => {
                if (disabled || touchMode) return;
                e.preventDefault();
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (disabled || touchMode) return;
                const raw = e.dataTransfer.getData(MIME);
                const userId = Number(raw);
                if (Number.isFinite(userId)) assignToSlot(team, i, userId);
              }}
              onDoubleClick={() => {
                if (disabled || uid == null || touchMode) return;
                clearSlot(team, i);
              }}
            >
              {p ? (
                <>
                  <PlayerChip
                    player={p}
                    variant="slot"
                    touchMode={touchMode}
                    selected={pickedUserId === p.userId}
                    onToggleTouchPick={() =>
                      onPickForTouch(pickedUserId === p.userId ? null : p.userId)
                    }
                  />
                  {touchMode ? (
                    <button
                      type="button"
                      className="absolute -right-0.5 -top-0.5 flex h-6 w-6 items-center justify-center rounded-full border border-white/40 bg-zinc-900/85 text-white shadow-md hover:bg-black/90"
                      aria-label="Opróżnij pole"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (disabled) return;
                        clearSlot(team, i);
                      }}
                    >
                      <X className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  ) : null}
                </>
              ) : (
                <span className="pointer-events-none px-1 text-center text-[10px] font-semibold text-white/80">
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
