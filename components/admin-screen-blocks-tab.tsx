"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Construction, Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  AdminCard,
  AdminToolbar,
  adminEmptyStateClass,
  adminFieldClass,
  adminTextareaClass,
  adminToggleRowClass,
} from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { YesNoSwitch } from "@/components/ui/yes-no-switch";
import { cn } from "@/lib/utils";
import {
  BLOCKABLE_SCREENS,
  DEFAULT_SCREEN_BLOCK_MESSAGE,
  emptyScreenBlocksMap,
  type BlockableScreenKey,
  type ScreenBlockEntry,
} from "@/lib/screen-blocks";
import type { AppSettingsApiResponse } from "@/app/api/admin/app-settings/route";

type Props = {
  loading: boolean;
  onReload: () => void;
};

export function AdminScreenBlocksTab({ loading, onReload }: Props) {
  const [blocks, setBlocks] = useState(() => emptyScreenBlocksMap());
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setFetching(true);
    try {
      const res = await fetch("/api/admin/app-settings");
      if (!res.ok) throw new Error("Nie udało się wczytać ustawień");
      const data = (await res.json()) as AppSettingsApiResponse;
      setBlocks(data.screen_blocks);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Błąd wczytywania");
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const updateEntry = (key: BlockableScreenKey, patch: Partial<ScreenBlockEntry>) => {
    setBlocks((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...patch },
    }));
  };

  const setAllDisabled = (disabled: boolean) => {
    setBlocks((prev) => {
      const next = { ...prev };
      for (const screen of BLOCKABLE_SCREENS) {
        next[screen.key] = { ...next[screen.key], disabled };
      }
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/app-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ screen_blocks: blocks }),
      });
      const data = (await res.json().catch(() => ({}))) as AppSettingsApiResponse & { error?: string };
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Nie udało się zapisać");
        return;
      }
      setBlocks(data.screen_blocks);
      toast.success("Zaślepki ekranów zapisane");
      onReload();
    } catch {
      toast.error("Nie udało się zapisać");
    } finally {
      setSaving(false);
    }
  };

  const busy = loading || fetching || saving;
  const disabledCount = BLOCKABLE_SCREENS.filter((s) => blocks[s.key]?.disabled).length;

  return (
    <div>
      <AdminToolbar
        title="Zaślepki ekranów"
        description="Wyłącz wybrane sekcje strony dla graczy — zamiast treści zobaczą komunikat. Administratorzy nadal widzą pełną zawartość i mogą testować zmiany."
        onReload={() => void load()}
        loading={busy}
      >
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => setAllDisabled(true)}>
          Zaślepkuj wszystkie
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => setAllDisabled(false)}>
          Odkryj wszystkie
        </Button>
        <Button type="button" variant="stadium" size="sm" disabled={busy} onClick={() => void save()}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
          Zapisz zmiany
        </Button>
      </AdminToolbar>

      <AdminCard className="mb-6" title="Jak to działa">
        <ul className="list-inside list-disc space-y-1 text-sm pitch-muted">
          <li>Wyłączony ekran znika z menu nawigacji dla graczy.</li>
          <li>Wejście bezpośrednim linkiem pokazuje zaślepkę z Twoim komunikatem.</li>
          <li>Harmonogram (od–do) pozwala zaplanować zaślepkę na konkretne dni.</li>
          <li>
            Podgląd gracza: dodaj <code className="text-amber-200">?preview_blocked=1</code> do adresu ekranu.
          </li>
          <li>Pusty komunikat = domyślny tekst: „{DEFAULT_SCREEN_BLOCK_MESSAGE}”</li>
          <li>Panel admina, logowanie i rejestracja nie są zaślepiane.</li>
        </ul>
        {disabledCount > 0 ? (
          <p className="mt-3 text-sm font-medium text-amber-100">
            Aktywnych zaślepek: {disabledCount} / {BLOCKABLE_SCREENS.length}
          </p>
        ) : null}
      </AdminCard>

      {fetching && !loading ? (
        <div className={cn(adminEmptyStateClass, "flex items-center justify-center gap-2 py-16")}>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Wczytywanie…
        </div>
      ) : (
        <div className="space-y-4">
          {BLOCKABLE_SCREENS.map((screen) => {
            const entry = blocks[screen.key];
            return (
              <AdminCard key={screen.key}>
                <div className="space-y-4">
                  <label className={adminToggleRowClass}>
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 text-sm font-semibold text-white">
                        <Construction className="h-4 w-4 shrink-0 text-amber-300/90" aria-hidden />
                        {screen.label}
                      </span>
                      <span className="mt-1 block font-mono text-xs text-emerald-100/60">{screen.href}</span>
                    </span>
                    <span className="flex flex-wrap items-center gap-2">
                      {entry.disabled ? (
                        <Button type="button" variant="outline" size="sm" asChild>
                          <Link href={`${screen.href === "/players/*" ? "/pilkarze" : screen.href}?preview_blocked=1`} target="_blank">
                            <Eye className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                            Podgląd
                          </Link>
                        </Button>
                      ) : null}
                      <YesNoSwitch
                        checked={entry.disabled}
                        disabled={busy}
                        onCheckedChange={(v) => updateEntry(screen.key, { disabled: v })}
                        tone="admin"
                        size="sm"
                        aria-label={`Zaślepka ekranu ${screen.label}`}
                      />
                    </span>
                  </label>

                  {entry.disabled ? (
                    <>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="grid gap-1.5">
                          <Label className="text-sm font-semibold text-white">Aktywna od (opcjonalnie)</Label>
                          <input
                            type="date"
                            className={adminFieldClass}
                            disabled={busy}
                            value={entry.active_from ?? ""}
                            onChange={(e) =>
                              updateEntry(screen.key, {
                                active_from: e.target.value || undefined,
                              })
                            }
                          />
                        </div>
                        <div className="grid gap-1.5">
                          <Label className="text-sm font-semibold text-white">Aktywna do (opcjonalnie)</Label>
                          <input
                            type="date"
                            className={adminFieldClass}
                            disabled={busy}
                            value={entry.active_until ?? ""}
                            onChange={(e) =>
                              updateEntry(screen.key, {
                                active_until: e.target.value || undefined,
                              })
                            }
                          />
                        </div>
                      </div>
                      <div className="grid gap-1.5">
                        <Label className="text-sm font-semibold text-white">Komunikat na zaślepce</Label>
                        <textarea
                          className={adminTextareaClass}
                          rows={3}
                          maxLength={500}
                          disabled={busy}
                          placeholder={DEFAULT_SCREEN_BLOCK_MESSAGE}
                          value={entry.message}
                          onChange={(e) => updateEntry(screen.key, { message: e.target.value })}
                        />
                        <p className="text-xs text-emerald-100/60">
                          Zostaw puste, aby użyć domyślnego komunikatu.
                        </p>
                      </div>
                    </>
                  ) : null}
                </div>
              </AdminCard>
            );
          })}
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <Button type="button" variant="stadium" disabled={busy} onClick={() => void save()}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
          Zapisz zmiany
        </Button>
      </div>
    </div>
  );
}
