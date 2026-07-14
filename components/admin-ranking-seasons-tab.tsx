"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Play, Square, Trophy } from "lucide-react";
import { toast } from "sonner";
import {
  AdminCard,
  AdminToolbar,
  adminEmptyStateClass,
  adminFieldClass,
  adminInnerPanelClass,
} from "@/components/admin-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppModal } from "@/components/ui/app-modal";

type SeasonItem = {
  id: number;
  name: string;
  is_active: boolean;
  started_at_display: string;
  ended_at_display: string | null;
};

export function AdminRankingSeasonsTab() {
  const [seasons, setSeasons] = useState<SeasonItem[]>([]);
  const [activeSeasonId, setActiveSeasonId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [newSeasonName, setNewSeasonName] = useState("");
  const [startConfirmOpen, setStartConfirmOpen] = useState(false);
  const [endConfirmId, setEndConfirmId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/ranking-seasons");
      const data = (await res.json().catch(() => ({}))) as {
        seasons?: SeasonItem[];
        active_season_id?: number | null;
        error?: string;
      };
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Nie udało się wczytać sezonów");
        return;
      }
      setSeasons(data.seasons ?? []);
      setActiveSeasonId(data.active_season_id ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function startSeason() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/ranking-seasons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          name: newSeasonName.trim() || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; season?: { name: string } };
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Nie udało się rozpocząć sezonu");
        return;
      }
      toast.success(`Rozpoczęto sezon: ${data.season?.name ?? "nowy"}`);
      setNewSeasonName("");
      setStartConfirmOpen(false);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function endSeason(id: number) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/ranking-seasons/${id}/end`, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { error?: string; season?: { name: string } };
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Nie udało się zakończyć sezonu");
        return;
      }
      toast.success(`Zakończono sezon: ${data.season?.name ?? ""}`);
      setEndConfirmId(null);
      await load();
    } finally {
      setBusy(false);
    }
  }

  const activeSeason = seasons.find((s) => s.id === activeSeasonId) ?? null;

  return (
    <div>
      <AdminToolbar
        title="Sezony rankingu"
        description="Zarządzaj sezonami punktacji. Rozpoczęcie nowego sezonu kończy bieżący i zeruje ranking — statystyki z poprzednich sezonów zostają w archiwum."
        onReload={load}
        loading={loading}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <AdminCard>
          <div className="mb-4 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-[var(--mundial-gold)]" aria-hidden />
            <h3 className="text-base font-bold text-white">Bieżący sezon</h3>
          </div>

          {loading ? (
            <div className="flex justify-center py-10 text-emerald-100/70">
              <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
            </div>
          ) : activeSeason ? (
            <div className={adminInnerPanelClass}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-bold text-white">{activeSeason.name}</p>
                  <p className="mt-1 text-sm text-emerald-100/75">Start: {activeSeason.started_at_display}</p>
                </div>
                <Badge className="bg-emerald-500 text-white hover:bg-emerald-500">Aktywny</Badge>
              </div>
              <Button
                type="button"
                variant="stadium"
                className="mt-4"
                disabled={busy}
                onClick={() => setEndConfirmId(activeSeason.id)}
              >
                <Square className="mr-2 h-4 w-4" aria-hidden />
                Zakończ sezon
              </Button>
            </div>
          ) : (
            <p className={adminEmptyStateClass}>
              Brak aktywnego sezonu. Rozpocznij nowy, aby gracze mogli zbierać punkty w rankingu.
            </p>
          )}

          <div className="mt-5 space-y-3">
            <Label htmlFor="new-season-name" className="text-sm font-semibold text-white">
              Nazwa nowego sezonu (opcjonalnie)
            </Label>
            <Input
              id="new-season-name"
              className={adminFieldClass}
              placeholder="np. PZU Cup 2026 — jesień"
              value={newSeasonName}
              disabled={busy}
              onChange={(e) => setNewSeasonName(e.target.value)}
            />
            <Button type="button" variant="stadium" disabled={busy} onClick={() => setStartConfirmOpen(true)}>
              <Play className="mr-2 h-4 w-4" aria-hidden />
              Rozpocznij nowy sezon (restart rankingu)
            </Button>
            <p className="text-xs leading-relaxed text-emerald-100/65">
              Jeśli trwa aktywny sezon, zostanie automatycznie zakończony. Nowe statystyki będą liczone od zera w nowym
              sezonie.
            </p>
          </div>
        </AdminCard>

        <AdminCard>
          <h3 className="mb-4 text-base font-bold text-white">Historia sezonów</h3>
          {loading ? (
            <div className="flex justify-center py-10 text-emerald-100/70">
              <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
            </div>
          ) : seasons.length === 0 ? (
            <p className={adminEmptyStateClass}>Brak sezonów.</p>
          ) : (
            <ul className="space-y-2" role="list">
              {seasons.map((s) => (
                <li
                  key={s.id}
                  className="rounded-xl border border-white/20 bg-black/10 px-4 py-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-white">{s.name}</p>
                      <p className="mt-1 text-xs text-emerald-100/70">Start: {s.started_at_display}</p>
                      {s.ended_at_display ? (
                        <p className="text-xs text-emerald-100/55">Koniec: {s.ended_at_display}</p>
                      ) : null}
                    </div>
                    {s.is_active ? (
                      <Badge className="bg-emerald-500 text-white hover:bg-emerald-500">Aktywny</Badge>
                    ) : (
                      <Badge variant="outline" className="border-white/25 text-emerald-100/80">
                        Zakończony
                      </Badge>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </AdminCard>
      </div>

      <AppModal
        open={startConfirmOpen}
        onOpenChange={setStartConfirmOpen}
        size="sm"
        title="Rozpocząć nowy sezon?"
        description="Ranking zostanie zresetowany — nowe statystyki trafią do nowego sezonu. Poprzednie wyniki pozostaną w archiwum."
        footer={
          <>
            <Button type="button" variant="outline" disabled={busy} onClick={() => setStartConfirmOpen(false)}>
              Anuluj
            </Button>
            <Button type="button" variant="stadium" disabled={busy} onClick={() => void startSeason()}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
              Rozpocznij sezon
            </Button>
          </>
        }
      />

      <AppModal
        open={endConfirmId != null}
        onOpenChange={(open) => {
          if (!open) setEndConfirmId(null);
        }}
        size="sm"
        title="Zakończyć bieżący sezon?"
        description="Gracze nie będą mogli dodawać statystyk do rankingu, dopóki nie rozpoczniesz nowego sezonu."
        footer={
          <>
            <Button type="button" variant="outline" disabled={busy} onClick={() => setEndConfirmId(null)}>
              Anuluj
            </Button>
            <Button
              type="button"
              variant="stadium"
              disabled={busy || endConfirmId == null}
              onClick={() => endConfirmId != null && void endSeason(endConfirmId)}
            >
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
              Zakończ sezon
            </Button>
          </>
        }
      />
    </div>
  );
}
