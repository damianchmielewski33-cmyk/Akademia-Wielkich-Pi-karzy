"use client";

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
import { AdminChannelToggle } from "@/components/admin-channel-toggle";
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
import {
  BLOCKABLE_MOBILE_SCREENS,
  emptyMobileScreenBlocksMap,
  type BlockableMobileScreenKey,
} from "@/lib/screen-blocks-mobile";
import { screenBlockPreviewHref, storeScreenBlocksPreviewDraft } from "@/lib/screen-block-preview";
import type { AppSettingsApiResponse } from "@/app/api/admin/app-settings/route";
import type { ClientChannel } from "@/lib/mobile-channel-settings";

type Props = {
  loading: boolean;
  onReload: () => void;
};

export function AdminScreenBlocksTab({ loading, onReload }: Props) {
  const [channel, setChannel] = useState<ClientChannel>("web");
  const [webBlocks, setWebBlocks] = useState(() => emptyScreenBlocksMap());
  const [mobileBlocks, setMobileBlocks] = useState(() => emptyMobileScreenBlocksMap());
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setFetching(true);
    try {
      const res = await fetch("/api/admin/app-settings");
      if (!res.ok) throw new Error("Nie udało się wczytać ustawień");
      const data = (await res.json()) as AppSettingsApiResponse;
      setWebBlocks(data.screen_blocks);
      setMobileBlocks(data.screen_blocks_mobile);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Błąd wczytywania");
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const updateEntry = (key: BlockableScreenKey | BlockableMobileScreenKey, patch: Partial<ScreenBlockEntry>) => {
    if (channel === "web") {
      setWebBlocks((prev) => ({
        ...prev,
        [key as BlockableScreenKey]: { ...prev[key as BlockableScreenKey], ...patch },
      }));
    } else {
      setMobileBlocks((prev) => ({
        ...prev,
        [key as BlockableMobileScreenKey]: { ...prev[key as BlockableMobileScreenKey], ...patch },
      }));
    }
  };

  const setAllDisabled = (disabled: boolean) => {
    if (channel === "web") {
      setWebBlocks((prev) => {
        const next = { ...prev };
        for (const screen of BLOCKABLE_SCREENS) {
          next[screen.key] = { ...next[screen.key], disabled };
        }
        return next;
      });
    } else {
      setMobileBlocks((prev) => {
        const next = { ...prev };
        for (const screen of BLOCKABLE_MOBILE_SCREENS) {
          next[screen.key] = { ...next[screen.key], disabled };
        }
        return next;
      });
    }
  };

  const save = async (): Promise<boolean> => {
    setSaving(true);
    try {
      const body =
        channel === "web"
          ? { screen_blocks: webBlocks }
          : { screen_blocks_mobile: mobileBlocks };
      const res = await fetch("/api/admin/app-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as AppSettingsApiResponse & { error?: string };
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Nie udało się zapisać");
        return false;
      }
      setWebBlocks(data.screen_blocks);
      setMobileBlocks(data.screen_blocks_mobile);
      toast.success(
        channel === "web" ? "Zaślepki strony zapisane" : "Zaślepki aplikacji zapisane"
      );
      onReload();
      return true;
    } catch {
      toast.error("Nie udało się zapisać");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const openPreview = async (href: string) => {
    if (channel !== "web") {
      toast.message("Podgląd w przeglądarce dotyczy tylko zaślepek strony WWW.");
      return;
    }
    const ok = await save();
    if (!ok) return;
    storeScreenBlocksPreviewDraft(webBlocks);
    window.open(screenBlockPreviewHref(href), "_blank", "noopener,noreferrer");
  };

  const busy = loading || fetching || saving;
  const disabledCount =
    channel === "web"
      ? BLOCKABLE_SCREENS.filter((s) => webBlocks[s.key]?.disabled).length
      : BLOCKABLE_MOBILE_SCREENS.filter((s) => mobileBlocks[s.key]?.disabled).length;

  return (
    <div>
      <AdminToolbar
        title="Zaślepki ekranów"
        description="Jeden panel admina — osobno konfigurujesz zaślepki strony WWW i aplikacji Android."
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

      <AdminChannelToggle channel={channel} onChange={setChannel} className="mb-4" />

      <AdminCard className="mb-6" title="Jak to działa">
        <ul className="list-inside list-disc space-y-1 text-sm pitch-muted">
          <li>
            <strong>Strona WWW</strong> — menu i strony akademii w przeglądarce.
          </li>
          <li>
            <strong>Aplikacja Android</strong> — zakładki natywne i ekrany WebView w APK.
          </li>
          <li>Administratorzy nadal widzą pełną zawartość.</li>
          <li>Pusty komunikat = domyślny tekst: „{DEFAULT_SCREEN_BLOCK_MESSAGE}”</li>
        </ul>
        {disabledCount > 0 ? (
          <p className="mt-3 text-sm font-medium text-amber-100">
            Aktywnych zaślepek ({channel === "web" ? "strona" : "aplikacja"}): {disabledCount} /{" "}
            {channel === "web" ? BLOCKABLE_SCREENS.length : BLOCKABLE_MOBILE_SCREENS.length}
          </p>
        ) : null}
      </AdminCard>

      {fetching && !loading ? (
        <div className={cn(adminEmptyStateClass, "flex items-center justify-center gap-2 py-16")}>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Wczytywanie…
        </div>
      ) : channel === "web" ? (
        <div className="space-y-4">
          {BLOCKABLE_SCREENS.map((screen) => {
            const entry = webBlocks[screen.key];
            return (
              <BlockCard
                key={screen.key}
                label={screen.label}
                pathHint={screen.href}
                entry={entry}
                busy={busy}
                showPreview
                onPreview={() => void openPreview(screen.href)}
                onPatch={(patch) => updateEntry(screen.key, patch)}
              />
            );
          })}
        </div>
      ) : (
        <div className="space-y-4">
          {BLOCKABLE_MOBILE_SCREENS.map((screen) => {
            const entry = mobileBlocks[screen.key];
            return (
              <BlockCard
                key={screen.key}
                label={screen.label}
                pathHint={screen.route}
                entry={entry}
                busy={busy}
                showPreview={false}
                onPreview={() => undefined}
                onPatch={(patch) => updateEntry(screen.key, patch)}
              />
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

function BlockCard({
  label,
  pathHint,
  entry,
  busy,
  showPreview,
  onPreview,
  onPatch,
}: {
  label: string;
  pathHint: string;
  entry: ScreenBlockEntry;
  busy: boolean;
  showPreview: boolean;
  onPreview: () => void;
  onPatch: (patch: Partial<ScreenBlockEntry>) => void;
}) {
  return (
    <AdminCard>
      <div className="space-y-4">
        <label className={adminToggleRowClass}>
          <span className="min-w-0">
            <span className="flex items-center gap-2 text-sm font-semibold text-white">
              <Construction className="h-4 w-4 shrink-0 text-amber-300/90" aria-hidden />
              {label}
            </span>
            <span className="mt-1 block font-mono text-xs text-emerald-100/60">{pathHint}</span>
          </span>
          <span className="flex flex-wrap items-center gap-2">
            {showPreview && entry.disabled ? (
              <Button type="button" variant="outline" size="sm" disabled={busy} onClick={onPreview}>
                <Eye className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                Podgląd
              </Button>
            ) : null}
            <YesNoSwitch
              checked={entry.disabled}
              disabled={busy}
              onCheckedChange={(v) => onPatch({ disabled: v })}
              tone="admin"
              size="sm"
              aria-label={`Zaślepka ekranu ${label}`}
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
                  onChange={(e) => onPatch({ active_from: e.target.value || undefined })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-sm font-semibold text-white">Aktywna do (opcjonalnie)</Label>
                <input
                  type="date"
                  className={adminFieldClass}
                  disabled={busy}
                  value={entry.active_until ?? ""}
                  onChange={(e) => onPatch({ active_until: e.target.value || undefined })}
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
                onChange={(e) => onPatch({ message: e.target.value })}
              />
            </div>
          </>
        ) : null}
      </div>
    </AdminCard>
  );
}
