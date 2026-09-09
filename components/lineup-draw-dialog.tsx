"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Dices, Loader2, Save, Sparkles } from "lucide-react";
import { MatchLineupView } from "@/components/match-lineup-view";
import { Button } from "@/components/ui/button";
import { AppModal } from "@/components/ui/app-modal";
import { ModalAlert, ModalMatchSummary, modalListClass, modalPanelClass } from "@/components/ui/modal-shared";
import { toast } from "@/lib/app-toast";
import type { MatchRow } from "@/lib/db";
import type { GeneratedLineupProposal } from "@/lib/lineup-generator";
import { cn } from "@/lib/utils";

type GenerateResponse = {
  match: Pick<MatchRow, "id" | "match_date" | "match_time" | "location">;
  proposal: GeneratedLineupProposal;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  match: MatchRow | null;
  onSaved?: () => void;
};

export function LineupDrawDialog({ open, onOpenChange, match, onSaved }: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [proposal, setProposal] = useState<GeneratedLineupProposal | null>(null);
  const [proposalMatch, setProposalMatch] = useState<GenerateResponse["match"] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchProposal = useCallback(async (seed?: number) => {
    if (!match) return;
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/admin/lineup/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ match_id: match.id, seed }),
      });
      const data = (await res.json().catch(() => ({}))) as Partial<GenerateResponse> & { error?: string };
      if (!res.ok || !data.proposal || !data.match) {
        const error = typeof data.error === "string" ? data.error : "Nie udało się wylosować składów.";
        setLoadError(error);
        setProposal(null);
        setProposalMatch(null);
        return;
      }
      setProposal(data.proposal);
      setProposalMatch(data.match);
    } catch {
      setLoadError("Nie udało się wylosować składów.");
      setProposal(null);
      setProposalMatch(null);
    } finally {
      setLoading(false);
    }
  }, [match]);

  useEffect(() => {
    if (!open || !match) return;
    void fetchProposal(Date.now());
  }, [open, match, fetchProposal]);

  const sortedProfiles = useMemo(
    () => (proposal?.profiles ?? []).slice().sort((a, b) => b.overallMMR - a.overallMMR || a.userId - b.userId),
    [proposal]
  );

  async function saveProposal() {
    if (!match || !proposal) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/lineup", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          match_id: match.id,
          home: proposal.home,
          away: proposal.away,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Nie udało się zapisać składów.");
        return;
      }
      toast.success("Zapisano wylosowane składy");
      onSaved?.();
      onOpenChange(false);
    } catch {
      toast.error("Nie udało się zapisać składów.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      size="full"
      scrollable
      title="Losuj składy"
      headerKicker="Administrator"
      description="Algorytm analizuje statystyki pomeczowe, profil zawodnika i balans całych drużyn. Najpierw widzisz propozycję, potem decydujesz o zapisie."
      icon={<Sparkles className="h-5 w-5" aria-hidden />}
      className="sm:max-w-[min(96vw,72rem)]"
      contentClassName="space-y-4"
      footer={
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          <Button type="button" variant="outline" disabled={loading || saving || !match} onClick={() => void fetchProposal(Date.now())}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Dices className="h-4 w-4" aria-hidden />}
            Losuj ponownie
          </Button>
          <Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>
            Zamknij
          </Button>
          <Button type="button" disabled={loading || saving || !proposal} onClick={() => void saveProposal()}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Save className="h-4 w-4" aria-hidden />}
            Zapisz składy
          </Button>
        </div>
      }
    >
      {match ? <ModalMatchSummary match={match} /> : null}

      {loading ? (
        <div className={cn(modalPanelClass, "flex items-center justify-center py-10 text-sm text-zinc-500")}>
          <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden />
          Analiza statystyk i dobieranie składu...
        </div>
      ) : loadError ? (
        <ModalAlert tone="warning">{loadError}</ModalAlert>
      ) : proposal && proposalMatch ? (
        <div className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)]">
            <div className={cn(modalPanelClass, "space-y-3")}>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--mp-teal-dark)]">
                Ocena dopasowania
              </p>
              <div className="flex flex-wrap gap-2">
                <MetricPill label="Balans" value={`${proposal.diagnostics.balanceScore}%`} accent />
                <MetricPill label="MMR gap" value={proposal.diagnostics.mmrGap.toFixed(2)} />
                <MetricPill label="Rezerwa" value={String(proposal.bench.length)} />
              </div>
              <p className="text-sm text-zinc-700 dark:text-zinc-300">{proposal.diagnostics.summary}</p>
            </div>

            <div className={cn(modalPanelClass, "space-y-3")}>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--mp-teal-dark)]">
                Profile drużyn
              </p>
              <TeamSummaryBlock label="Drużyna A" stats={proposal.diagnostics.home} />
              <TeamSummaryBlock label="Drużyna B" stats={proposal.diagnostics.away} />
            </div>
          </div>

          <MatchLineupView
            matchDate={proposalMatch.match_date}
            matchTime={proposalMatch.match_time}
            location={proposalMatch.location}
            players={proposal.players}
            home={proposal.home}
            away={proposal.away}
          />

          <div className={cn(modalPanelClass, "space-y-3")}>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--mp-teal-dark)]">
              Najmocniejsze profile graczy
            </p>
            <ul className={cn(modalListClass, "space-y-0 divide-y divide-zinc-200/80 dark:divide-zinc-700/55")}>
              {sortedProfiles.slice(0, 8).map((profile) => (
                <li key={profile.userId} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="font-semibold text-zinc-950 dark:text-white">
                      {profile.displayName}
                      {profile.zawodnik ? ` (${profile.zawodnik})` : ""}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                      Archetyp: {profile.archetype} · mecze: {profile.sampleMatches} · confidence: {profile.confidence}
                    </p>
                  </div>
                  <div className="text-right text-xs font-medium text-zinc-600 dark:text-zinc-300">
                    <p>MMR {profile.overallMMR.toFixed(2)}</p>
                    <p>A {profile.attackScore.toFixed(2)} · C {profile.creationScore.toFixed(2)} · E {profile.engineScore.toFixed(2)} · D {profile.defenseScore.toFixed(2)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </AppModal>
  );
}

function MetricPill({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold",
        accent
          ? "border-teal-300 bg-teal-50 text-[var(--mp-teal-dark)] dark:border-teal-700 dark:bg-teal-950/40 dark:text-teal-200"
          : "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-200"
      )}
    >
      <span>{label}</span>
      <strong className="tabular-nums">{value}</strong>
    </span>
  );
}

function TeamSummaryBlock({
  label,
  stats,
}: {
  label: string;
  stats: GeneratedLineupProposal["diagnostics"]["home"];
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-900/70">
      <p className="font-semibold text-zinc-950 dark:text-white">{label}</p>
      <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
        MMR {stats.avgMMR.toFixed(2)} · atak {stats.attack.toFixed(2)} · kreatywnosc {stats.creation.toFixed(2)}
      </p>
      <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
        bieganie {stats.engine.toFixed(2)} · defensywa {stats.defense.toFixed(2)} · confidence {stats.avgConfidence.toFixed(2)}
      </p>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        Archetypy: {stats.archetypes.length > 0 ? stats.archetypes.join(", ") : "brak"}
      </p>
    </div>
  );
}
