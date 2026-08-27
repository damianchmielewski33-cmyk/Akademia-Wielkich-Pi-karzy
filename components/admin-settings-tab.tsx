"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2, Search, Settings2 } from "lucide-react";
import { toast } from "@/lib/app-toast";
import {
  AdminCard,
  AdminToolbar,
  adminEmptyStateClass,
  adminFieldClass,
  adminInnerPanelClass,
  adminStatusChipClass,
  adminTextareaClass,
  adminToggleRowClass,
} from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { YesNoSwitchRow } from "@/components/ui/yes-no-switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useSiteMode } from "@/components/site-mode";
import type { AppSettingsApiResponse } from "@/app/api/admin/app-settings/route";
import type { MatchCancelReasonEntry } from "@/lib/app-settings";
import { AdminSiteAssetField } from "@/components/admin-site-asset-field";
import { AdminMarketplacePitchPhotosSection } from "@/components/marketplace-photo-strip";
import { AdminImageSpecsTable, ImageUploadSpecDetails } from "@/components/admin-image-specs";
import { ALL_ADMIN_IMAGE_SPECS, PROFILE_PHOTO_SPEC } from "@/lib/image-upload-specs";
import { SITE_ASSET_KEYS } from "@/lib/site-assets";
import { AdminChannelToggle } from "@/components/admin-channel-toggle";
import {
  mobileSettingsFromWeb,
  type ClientChannel,
  type MobileChannelSettings,
} from "@/lib/mobile-channel-settings";

type Props = {
  loading: boolean;
  onReload: () => void;
  settingsRealm?: "academy" | "pzu_cup";
  focusSectionId?: string | null;
  onFocusSectionConsumed?: () => void;
};

function settingsApiUrl(realm: "academy" | "pzu_cup") {
  return realm === "pzu_cup" ? "/api/admin/app-settings?realm=pzu_cup" : "/api/admin/app-settings";
}

type SettingsTocItem = { id: string; label: string; keywords?: string };

type SettingsTocGroup = { label: string; items: SettingsTocItem[]; hint?: string };

const WEB_SETTINGS_TOC: SettingsTocGroup[] = [
  {
    label: "System",
    hint: "Tryb testowy, wersja V1/V2, status serwera",
    items: [
      { id: "settings-test-mode", label: "Tryb testowy", keywords: "sandbox test" },
      { id: "settings-marketplace", label: "Wersja aplikacji", keywords: "v1 v2 wersja marketplace hale rezerwacje" },
      { id: "settings-system", label: "Co działa na serwerze", keywords: "smtp produkcja rejestracja status" },
    ],
  },
  {
    label: "Marka i treści",
    hint: "Nazwa, logo, film, zdjęcia marketplace",
    items: [
      { id: "settings-brand", label: "Nazwa i opis", keywords: "nazwa branding seo opis" },
      { id: "settings-assets", label: "Logo i tła", keywords: "logo tło grafika asset zdjęcia boiska gramy razem" },
      { id: "settings-home-video", label: "Film na stronie głównej", keywords: "youtube film video" },
    ],
  },
  {
    label: "Kontakt",
    hint: "E-mail, telefon, organizatorzy",
    items: [{ id: "settings-contact", label: "Kontakt i organizatorzy", keywords: "email telefon blik facebook" }],
  },
  {
    label: "Reklamy i rejestracja",
    hint: "AdSense i konta graczy",
    items: [
      { id: "settings-adsense", label: "Google AdSense", keywords: "reklamy adsense" },
      { id: "settings-registration", label: "Rejestracja i powiadomienia", keywords: "rejestracja mail hasło kod uwierzytelniający powiadomienia" },
    ],
  },
  {
    label: "Mecze i rankingi",
    hint: "Domyślne mecze, punkty, plan boiska",
    items: [
      { id: "settings-match-defaults", label: "Domyślne mecze", keywords: "miejsca lokalizacja mecz" },
      { id: "settings-ranking-points", label: "Punkty rankingowe", keywords: "ranking punkty gol asysta" },
      { id: "settings-pitch-plan", label: "Plan boiska", keywords: "składy boisko" },
      { id: "settings-cancel-reasons", label: "Powody anulowania", keywords: "anuluj powód" },
    ],
  },
];

const MOBILE_SETTINGS_TOC: SettingsTocGroup[] = [
  {
    label: "Aplikacja",
    hint: "Nazwa i kontakt w aplikacji",
    items: [
      { id: "settings-m-name", label: "Nazwa w aplikacji", keywords: "nazwa app android" },
      { id: "settings-m-contact", label: "Kontakt", keywords: "email telefon blik" },
    ],
  },
  {
    label: "Mecze i rankingi",
    hint: "Domyślne wartości w aplikacji",
    items: [
      { id: "settings-m-matches", label: "Domyślne mecze", keywords: "miejsca lokalizacja" },
      { id: "settings-m-ranking", label: "Punkty rankingowe", keywords: "ranking punkty" },
      { id: "settings-m-cancel", label: "Powody anulowania", keywords: "anuluj powód" },
    ],
  },
];

function scrollToSettingsSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function categoryForSectionId(sectionId: string, groups: SettingsTocGroup[]): string | null {
  for (const g of groups) {
    if (g.items.some((i) => i.id === sectionId)) return g.label;
  }
  return null;
}

function SettingsSearchBar({
  value,
  onChange,
  marketplace,
}: {
  value: string;
  onChange: (v: string) => void;
  marketplace: boolean;
}) {
  return (
    <div
      className={cn(
        "relative mb-4",
        marketplace
          ? "rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
          : "rounded-2xl border border-white/20 bg-black/20"
      )}
    >
      <Search
        className={cn(
          "pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2",
          marketplace ? "text-[var(--mp-teal-dark)]" : "text-white/70"
        )}
        aria-hidden
      />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Szukaj ustawienia (np. logo, V2, AdSense, ranking…)"
        className={cn(
          "w-full rounded-2xl bg-transparent py-3.5 pl-11 pr-4 text-base outline-none",
          marketplace
            ? "text-zinc-950 placeholder:text-zinc-400 dark:text-white dark:placeholder:text-zinc-500"
            : "text-white placeholder:text-white/50"
        )}
        aria-label="Szukaj w ustawieniach"
      />
    </div>
  );
}

function SettingsHub({
  groups,
  onOpenGroup,
  marketplace,
}: {
  groups: SettingsTocGroup[];
  onOpenGroup: (label: string) => void;
  marketplace: boolean;
}) {
  return (
    <div className="mb-2 grid gap-2 sm:grid-cols-2">
      {groups.map((g) => (
        <button
          key={g.label}
          type="button"
          onClick={() => onOpenGroup(g.label)}
          className={cn(
            "awp-focus-ring rounded-2xl border p-4 text-left transition hover:-translate-y-0.5",
            marketplace
              ? "border-zinc-200 bg-white shadow-sm hover:border-[var(--mp-teal)] dark:border-zinc-700 dark:bg-zinc-900"
              : "border-white/20 bg-black/15 hover:bg-white/10"
          )}
        >
          <span className="flex items-start gap-3">
            <span
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                marketplace ? "bg-[var(--mp-teal)] text-white" : "bg-white/15 text-white"
              )}
            >
              <Settings2 className="h-4 w-4" aria-hidden />
            </span>
            <span className="min-w-0">
              <span
                className={cn(
                  "block text-base font-bold",
                  marketplace ? "text-zinc-950 dark:text-white" : "text-white"
                )}
              >
                {g.label}
              </span>
              <span
                className={cn(
                  "mt-0.5 block text-sm",
                  marketplace ? "text-zinc-500" : "text-emerald-100/80"
                )}
              >
                {g.hint ?? `${g.items.length} sekcje`}
              </span>
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}

function SettingsSectionNav({
  items,
  marketplace,
}: {
  items: SettingsTocItem[];
  marketplace?: boolean;
}) {
  if (items.length <= 1) return null;
  return (
    <nav className="mb-4 flex flex-wrap gap-1.5" aria-label="Sekcje w kategorii">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => scrollToSettingsSection(item.id)}
          className={cn(
            "awp-focus-ring rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors",
            marketplace
              ? "border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-[var(--mp-teal)] hover:text-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
              : "border-white/15 bg-black/10 text-emerald-100/85 hover:bg-white/10 hover:text-white"
          )}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}

function SettingsSection({
  id,
  title,
  description,
  children,
  hidden,
}: {
  id?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  hidden?: boolean;
}) {
  if (hidden) return null;
  return (
    <div id={id} className={id ? "scroll-mt-6" : undefined}>
      <AdminCard title={title} description={description}>
        <div className="space-y-4">{children}</div>
      </AdminCard>
    </div>
  );
}

function FieldRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  const { marketplaceEnabled } = useSiteMode();
  return (
    <div className="grid gap-1.5">
      <Label
        className={cn(
          "text-sm font-semibold",
          marketplaceEnabled ? "text-zinc-900 dark:text-zinc-50" : "text-white"
        )}
      >
        {label}
      </Label>
      {hint ? <p className="text-sm leading-relaxed pitch-muted">{hint}</p> : null}
      {children}
    </div>
  );
}

export function AdminSettingsTab({
  loading,
  onReload,
  settingsRealm = "academy",
  focusSectionId,
  onFocusSectionConsumed,
}: Props) {
  const { marketplaceEnabled } = useSiteMode();
  const [channel, setChannel] = useState<ClientChannel>("web");
  const [settingsCategory, setSettingsCategory] = useState(WEB_SETTINGS_TOC[0]?.label ?? "System");
  const [settingsBrowse, setSettingsBrowse] = useState<"hub" | "category">("hub");
  const [settingsQuery, setSettingsQuery] = useState("");
  const [settings, setSettings] = useState<AppSettingsApiResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [cancelReasonsDraft, setCancelReasonsDraft] = useState<MatchCancelReasonEntry[]>([]);
  const [saveFlash, setSaveFlash] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [testMode, setTestMode] = useState<{ enabled: boolean; configured: boolean } | null>(null);
  const [testModeBusy, setTestModeBusy] = useState(false);

  const activeTocGroups = channel === "mobile" ? MOBILE_SETTINGS_TOC : WEB_SETTINGS_TOC;

  useEffect(() => {
    setSettingsCategory(activeTocGroups[0]?.label ?? "System");
    setSettingsBrowse("hub");
    setSettingsQuery("");
  }, [channel, activeTocGroups]);

  useEffect(() => {
    if (!focusSectionId) return;
    const webCat = categoryForSectionId(focusSectionId, WEB_SETTINGS_TOC);
    const mobileCat = categoryForSectionId(focusSectionId, MOBILE_SETTINGS_TOC);
    if (webCat) {
      setChannel("web");
      setSettingsCategory(webCat);
      setSettingsBrowse("category");
      setSettingsQuery("");
      window.setTimeout(() => scrollToSettingsSection(focusSectionId), 120);
    } else if (mobileCat) {
      setChannel("mobile");
      setSettingsCategory(mobileCat);
      setSettingsBrowse("category");
      setSettingsQuery("");
      window.setTimeout(() => scrollToSettingsSection(focusSectionId), 160);
    }
    onFocusSectionConsumed?.();
  }, [focusSectionId, onFocusSectionConsumed]);

  useEffect(() => {
    function onMarketplaceChanged(ev: Event) {
      const enabled = (ev as CustomEvent<{ enabled?: boolean }>).detail?.enabled;
      if (typeof enabled !== "boolean") return;
      setSettings((prev) => (prev ? { ...prev, booking_marketplace_enabled: enabled } : prev));
    }
    window.addEventListener("awp-marketplace-settings-changed", onMarketplaceChanged);
    return () => window.removeEventListener("awp-marketplace-settings-changed", onMarketplaceChanged);
  }, []);

  const load = useCallback(async () => {
    setFetching(true);
    try {
      const res = await fetch(settingsApiUrl(settingsRealm));
      if (!res.ok) throw new Error("Nie udało się wczytać ustawień");
      const data = (await res.json()) as AppSettingsApiResponse;
      setSettings(data);
      setCancelReasonsDraft(
        channel === "mobile" ? data.mobile_settings.match_cancel_reasons : data.match_cancel_reasons
      );
      if (settingsRealm === "academy") {
        try {
          const tmRes = await fetch("/api/admin/test-mode");
          if (tmRes.ok) {
            const tm = (await tmRes.json()) as { enabled?: boolean; configured?: boolean };
            setTestMode({
              enabled: Boolean(tm.enabled),
              configured: Boolean(tm.configured),
            });
          }
        } catch {
          /* ignore */
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Błąd wczytywania ustawień");
    } finally {
      setFetching(false);
    }
  }, [settingsRealm, channel]);

  const setTestModeEnabled = useCallback(
    async (enabled: boolean) => {
      setTestModeBusy(true);
      const toastId = toast.loading(enabled ? "Włączanie sandboxu…" : "Wyłączanie — czyszczenie testów…");
      try {
        const res = await fetch("/api/admin/test-mode", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enabled }),
        });
        const j = (await res.json().catch(() => ({}))) as {
          error?: string;
          enabled?: boolean;
          configured?: boolean;
        };
        if (!res.ok) {
          toast.error(typeof j.error === "string" ? j.error : "Nie udało się przełączyć", {
            id: toastId,
          });
          return;
        }
        setTestMode({
          enabled: Boolean(j.enabled),
          configured: j.configured !== false,
        });
        toast.success(
          enabled ? "Sandbox włączony — gracze bez zmian" : "Sandbox wyłączony — testy skasowane",
          { id: toastId }
        );
        // Pełne odświeżenie, żeby RSC / dane przeszły na właściwą bazę.
        window.location.reload();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Błąd sandboxu", { id: toastId });
      } finally {
        setTestModeBusy(false);
      }
    },
    []
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!settings) return;
    setCancelReasonsDraft(
      channel === "mobile" ? settings.mobile_settings.match_cancel_reasons : settings.match_cancel_reasons
    );
  }, [channel, settings]);

  const save = useCallback(
    async (patch: Record<string, unknown>) => {
      setSaving(true);
      setSaveFlash("saving");
      const toastId = toast.loading("Zapisywanie…");
      try {
        const res = await fetch(settingsApiUrl(settingsRealm), {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        const j = (await res.json().catch(() => ({}))) as AppSettingsApiResponse & { error?: string };
        if (!res.ok) {
          toast.error(typeof j.error === "string" ? j.error : "Nie udało się zapisać", { id: toastId });
          setSaveFlash("error");
          return;
        }
        setSettings(j);
        setCancelReasonsDraft(
          channel === "mobile" ? j.mobile_settings.match_cancel_reasons : j.match_cancel_reasons
        );
        if (typeof patch.booking_marketplace_enabled === "boolean" || typeof patch.email_password_auth_enabled === "boolean") {
          if (typeof patch.booking_marketplace_enabled === "boolean") {
            window.dispatchEvent(
              new CustomEvent("awp-marketplace-settings-changed", {
                detail: { enabled: j.booking_marketplace_enabled === true },
              })
            );
          }
          toast.success("Zapisano — odświeżanie…", { id: toastId });
          setSaveFlash("saved");
          window.location.reload();
          return;
        }
        toast.success("Zapisano", { id: toastId });
        setSaveFlash("saved");
        window.setTimeout(() => setSaveFlash("idle"), 1800);
      } catch {
        toast.error("Błąd połączenia", { id: toastId });
        setSaveFlash("error");
      } finally {
        setSaving(false);
      }
    },
    [settingsRealm, channel]
  );

  const saveMobilePatch = useCallback(
    async (patch: Partial<MobileChannelSettings>) => {
      if (!settings) return;
      await save({ mobile_settings: { ...settings.mobile_settings, ...patch } });
    },
    [save, settings]
  );

  const copyWebToMobile = useCallback(async () => {
    if (!settings) return;
    await save({ mobile_settings: mobileSettingsFromWeb(settings) });
    toast.message("Skopiowano ustawienia strony do aplikacji — możesz je dalej zmieniać osobno.");
  }, [save, settings]);

  const busy = loading || fetching || saving;
  const mobile = settings?.mobile_settings;
  const activeGroup = activeTocGroups.find((g) => g.label === settingsCategory) ?? activeTocGroups[0];
  const searchQ = settingsQuery.trim().toLowerCase();
  const searchHits = useMemo(() => {
    if (!searchQ) return [] as SettingsTocItem[];
    const hits: SettingsTocItem[] = [];
    for (const g of activeTocGroups) {
      for (const item of g.items) {
        const hay = `${item.label} ${item.keywords ?? ""} ${g.label}`.toLowerCase();
        if (hay.includes(searchQ)) hits.push(item);
      }
    }
    return hits;
  }, [activeTocGroups, searchQ]);

  const visibleSectionIds = useMemo(() => {
    if (searchQ) return new Set(searchHits.map((i) => i.id));
    if (settingsBrowse === "hub") return new Set<string>();
    return new Set(activeGroup?.items.map((i) => i.id) ?? []);
  }, [searchQ, searchHits, settingsBrowse, activeGroup]);

  const sectionVisible = (id: string) => visibleSectionIds.has(id);

  if (fetching && !settings) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm pitch-muted">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
        Wczytywanie ustawień…
      </div>
    );
  }

  if (!settings) {
    return (
      <div className={adminEmptyStateClass}>
        Nie udało się wczytać ustawień.{" "}
        <button type="button" className="font-semibold text-[var(--mundial-gold)] underline" onClick={() => void load()}>
          Spróbuj ponownie
        </button>
      </div>
    );
  }

  const registrationStatusLabel = "Włączona — gracze mogą zakładać konta samodzielnie";

  return (
    <div className="space-y-6">
      {settingsRealm === "pzu_cup" ? (
        <div className="rounded-xl border border-amber-400/40 bg-amber-500/15 px-4 py-3 text-sm text-amber-50">
          <p className="font-semibold">Realm: PZU Cup</p>
          <p className="mt-1 text-amber-100/85">
            Edytujesz ustawienia turnieju — osobne od Akademii. Zmiany tutaj nie wpływają na stronę główną akademii.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-emerald-400/30 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-50">
          <p className="font-semibold">Realm: Akademia</p>
          <p className="mt-1 text-emerald-100/80">
            Ustawienia strony akademii i aplikacji. Turniej PZU Cup ma osobną zakładkę z własną konfiguracją.
          </p>
        </div>
      )}

      <AdminToolbar
        title={
          settingsRealm === "pzu_cup"
            ? channel === "web"
              ? "Ustawienia PZU Cup (WWW)"
              : "Ustawienia PZU Cup (aplikacja)"
            : channel === "web"
              ? "Ustawienia strony"
              : "Ustawienia aplikacji"
        }
        description={
          channel === "web"
            ? "Konfiguracja WWW — treści, kontakty, mecze. Po wyjściu z pola zmiany zapisują się same."
            : "Osobna konfiguracja aplikacji Android — niezależna od WWW."
        }
        onReload={() => {
          onReload();
          void load();
        }}
        loading={busy}
      >
        {saveFlash === "saving" ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-200">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            Zapisywanie…
          </span>
        ) : saveFlash === "saved" ? (
          <span className="text-xs font-semibold text-emerald-300">Zapisano</span>
        ) : saveFlash === "error" ? (
          <span className="text-xs font-semibold text-red-300">Błąd zapisu</span>
        ) : null}
        {channel === "mobile" ? (
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void copyWebToMobile()}>
            Kopiuj ze strony → aplikacja
          </Button>
        ) : null}
      </AdminToolbar>

      <AdminChannelToggle channel={channel} onChange={setChannel} />

      <SettingsSearchBar
        value={settingsQuery}
        onChange={(v) => {
          setSettingsQuery(v);
          if (v.trim()) setSettingsBrowse("category");
        }}
        marketplace={marketplaceEnabled}
      />

      {!searchQ && settingsBrowse === "hub" ? (
        <SettingsHub
          groups={activeTocGroups}
          marketplace={marketplaceEnabled}
          onOpenGroup={(label) => {
            setSettingsCategory(label);
            setSettingsBrowse("category");
          }}
        />
      ) : null}

      {!searchQ && settingsBrowse === "category" ? (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setSettingsBrowse("hub");
              setSettingsQuery("");
            }}
            className={cn(
              "awp-focus-ring inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold",
              marketplaceEnabled
                ? "border border-zinc-200 bg-white text-zinc-800 hover:border-[var(--mp-teal)] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                : "border border-white/20 bg-black/15 text-white hover:bg-white/10"
            )}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Wszystkie kategorie
          </button>
          <p
            className={cn(
              "text-sm font-bold",
              marketplaceEnabled ? "text-zinc-950 dark:text-white" : "text-white"
            )}
          >
            {activeGroup?.label}
          </p>
        </div>
      ) : null}

      {searchQ ? (
        <div className="mb-4 space-y-2">
          <p
            className={cn(
              "text-sm",
              marketplaceEnabled ? "text-zinc-500" : "text-emerald-100/80"
            )}
          >
            {searchHits.length === 0
              ? "Brak ustawień pasujących do frazy."
              : `Znaleziono ${searchHits.length} ${searchHits.length === 1 ? "ustawienie" : "ustawienia"}:`}
          </p>
          {searchHits.length > 0 ? (
            <ul className="flex flex-wrap gap-1.5">
              {searchHits.map((hit) => (
                <li key={hit.id}>
                  <button
                    type="button"
                    onClick={() => scrollToSettingsSection(hit.id)}
                    className={cn(
                      "awp-focus-ring rounded-lg border px-2.5 py-1.5 text-xs font-semibold",
                      marketplaceEnabled
                        ? "border-[var(--mp-teal)]/40 bg-teal-50 text-[var(--mp-teal-dark)] dark:border-teal-700 dark:bg-teal-950/40 dark:text-teal-200"
                        : "border-white/20 bg-black/15 text-white"
                    )}
                  >
                    {hit.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {!searchQ && settingsBrowse === "category" ? (
        <SettingsSectionNav items={activeGroup?.items ?? []} marketplace={marketplaceEnabled} />
      ) : null}

      {searchQ || settingsBrowse === "category" ? (
        <>
      {channel === "mobile" && mobile ? (
        <MobileSettingsEditor
          mobile={mobile}
          busy={busy}
          cancelReasonsDraft={cancelReasonsDraft}
          setCancelReasonsDraft={setCancelReasonsDraft}
          onSavePatch={(patch) => void saveMobilePatch(patch)}
          visibleSectionIds={visibleSectionIds}
        />
      ) : (
        <>
      <SettingsSection
        id="settings-system"
        hidden={!sectionVisible("settings-system")}
        title="Co działa na serwerze"
        description="Tylko podgląd — tych rzeczy nie zmienisz tutaj. Gdy coś jest wyłączone, poproś osobę od hostingu o konfigurację."
      >
        <ul className="grid gap-2 text-sm sm:grid-cols-2">
          <li className={adminStatusChipClass}>
            <span className="text-emerald-100/70">Wysyłka e-maili:</span>{" "}
            <strong className={settings.system.smtp_configured ? "text-emerald-300" : "text-amber-300"}>
              {settings.system.smtp_configured
                ? "Gotowa — maile o meczach mogą wychodzić"
                : "Nieskonfigurowana — maile nie wyjdą"}
            </strong>
          </li>
          <li className={adminStatusChipClass}>
            <span className="text-emerald-100/70">Serwer:</span>{" "}
            <strong className="text-white">
              {settings.system.is_production ? "Produkcyjny (prawdziwa strona)" : "Testowy (developerski)"}
            </strong>
          </li>
          <li className={cn(adminStatusChipClass, "sm:col-span-2")}>
            <span className="text-emerald-100/70">Rejestracja nowych graczy:</span>{" "}
            <strong className="text-white">{registrationStatusLabel}</strong>
          </li>
        </ul>
      </SettingsSection>

      <SettingsSection
        id="settings-test-mode"
        hidden={channel !== "web" || settingsRealm !== "academy" || !sectionVisible("settings-test-mode")}
        title="Tryb testowy"
        description="Ćwicz mecze i płatności bez wpływu na graczy. Po wyłączeniu testy są kasowane."
      >
        <ul className="mb-4 grid gap-2 text-sm sm:grid-cols-2">
          <li className={adminStatusChipClass}>
            <span className="text-emerald-100/70">Sandbox:</span>{" "}
            <strong className="text-emerald-300">
              {testMode == null ? "…" : testMode.configured ? "Gotowy" : "Niedostępny"}
            </strong>
          </li>
        </ul>
        <YesNoSwitchRow
          className={adminToggleRowClass}
          label="Włącz sandbox"
          hint="Tylko Ty widzisz testy. Gracze nadal na produkcji. Wyłączenie kasuje dane testowe."
          checked={Boolean(testMode?.enabled)}
          disabled={busy || testModeBusy || !testMode?.configured}
          onCheckedChange={(v) => void setTestModeEnabled(v)}
        />
      </SettingsSection>

      <SettingsSection
        id="settings-marketplace"
        hidden={channel !== "web" || settingsRealm !== "academy" || !sectionVisible("settings-marketplace")}
        title="Wersja aplikacji"
        description="V1 = akademia bez rezerwacji boisk. V2 = akademia z rezerwacjami boisk (katalog hal, nowy wygląd). Działanie poza nazwą zostaje takie jak dotychczas."
      >
        <YesNoSwitchRow
          className={adminToggleRowClass}
          label="Wersja aplikacji V2"
          hint="Wyłączone = Wersja V1 (sam terminarz akademii, bez marketplace’u i pytania „Szukam boiska”). Włączone = Wersja V2 (katalog hal i rezerwacje online). W panelu admina nadal przygotujesz hale (zakładka Rezerwacje)."
          checked={Boolean(settings.booking_marketplace_enabled)}
          disabled={busy}
          onCheckedChange={(v) => void save({ booking_marketplace_enabled: v })}
        />
      </SettingsSection>

      <SettingsSection
        id="settings-brand"
        hidden={!sectionVisible("settings-brand")}
        title="Nazwa i opis strony"
        description="Widoczne w nagłówku, w wynikach Google i przy udostępnianiu linku."
      >
        <FieldRow label="Nazwa strony" hint="Np. Akademia Wielkich Piłkarzy — pojawia się obok logo.">
          <Input
            className={adminFieldClass}
            defaultValue={settings.site_name}
            disabled={busy}
            key={`site_name-${settings.site_name}`}
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v && v !== settings.site_name) void save({ site_name: v });
            }}
          />
        </FieldRow>
        <FieldRow
          label="Krótki opis strony"
          hint="1–2 zdania o akademii — trafiają też do wyszukiwarek (SEO)."
        >
          <textarea
            className={adminTextareaClass}
            defaultValue={settings.site_description}
            disabled={busy}
            key={`site_desc-${settings.site_description}`}
            onBlur={(e) => {
              if (e.target.value.trim() !== settings.site_description) {
                void save({ site_description: e.target.value.trim() });
              }
            }}
          />
        </FieldRow>
      </SettingsSection>

      <SettingsSection
        id="settings-assets"
        hidden={!sectionVisible("settings-assets")}
        title="Logo i tła"
        description="Wgraj własne grafiki albo zostaw domyślne."
      >
        <div className="space-y-6">
          <div className="rounded-xl border border-white/20 bg-black/10 p-4">
            <p className="text-sm font-semibold text-white">Zalecane wymiary</p>
            <p className="mt-1 text-sm leading-relaxed text-emerald-100/80">
              Aby grafika dobrze wypełniła miejsce na stronie, trzymaj się podanych wymiarów. Zbyt mały plik będzie
              rozmyty; zły kadr może zostać przycięty.
            </p>
            <div className="mt-3">
              <AdminImageSpecsTable specs={ALL_ADMIN_IMAGE_SPECS} />
            </div>
          </div>

          <div className="rounded-xl border border-white/20 bg-black/10 p-4">
            <p className="mb-3 text-sm font-semibold text-white">Grafiki witryny</p>
            <div className="grid gap-4 lg:grid-cols-2">
              {SITE_ASSET_KEYS.map((key) => {
                const customMap: Record<(typeof SITE_ASSET_KEYS)[number], string | null> = {
                  logo_header: settings.asset_logo_header_url,
                  logo_crest: settings.asset_logo_crest_url,
                  logo_login: settings.asset_logo_login_url,
                  logo_favicon: settings.asset_logo_favicon_url,
                  bg_soccer_ball: settings.asset_bg_soccer_ball_url,
                  bg_stadium: settings.asset_bg_stadium_url,
                  bg_pitch_lines: settings.asset_bg_pitch_lines_url,
                };
                return (
                  <AdminSiteAssetField
                    key={key}
                    assetKey={key}
                    currentUrl={settings.site_assets[key]}
                    customUrl={customMap[key]}
                    disabled={busy}
                    onUpdated={(next) => setSettings((prev) => (prev ? { ...next, system: prev.system } : prev))}
                  />
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-white/20 bg-black/10 p-4">
            <p className="mb-3 text-sm font-semibold text-white">Zdjęcia V2 — pasek „Gramy razem”</p>
            <AdminMarketplacePitchPhotosSection
              disabled={busy}
              onUpdated={(next) => setSettings((prev) => (prev ? { ...next, system: prev.system } : prev))}
            />
          </div>

          <div className="rounded-xl border border-white/20 bg-black/10 p-4">
            <p className="mb-2 text-sm font-semibold text-white">Zdjęcia profilowe graczy</p>
            <ImageUploadSpecDetails spec={PROFILE_PHOTO_SPEC} />
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        id="settings-contact"
        hidden={!sectionVisible("settings-contact")}
        title="Kontakt i organizatorzy"
        description="Dane na stronie Kontakt, w stopce i przy płatnościach BLIK."
      >
        <FieldRow
          label="Główny adres e-mail"
          hint="Do ogólnych wiadomości od graczy i odwiedzających stronę."
        >
          <Input
            type="email"
            className={adminFieldClass}
            defaultValue={settings.contact_email}
            disabled={busy}
            key={`contact-${settings.contact_email}`}
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v && v !== settings.contact_email) void save({ contact_email: v });
            }}
          />
        </FieldRow>
        <FieldRow
          label="Numer telefonu do wpłat BLIK"
          hint="Gracze widzą go przy płatności za mecz — przelew BLIK na ten numer."
        >
          <Input
            className={adminFieldClass}
            defaultValue={settings.blik_phone}
            disabled={busy}
            key={`blik-${settings.blik_phone}`}
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v && v !== settings.blik_phone) void save({ blik_phone: v });
            }}
          />
        </FieldRow>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className={cn(adminInnerPanelClass, "space-y-3")}>
            <p className="text-sm font-semibold text-white">Organizator — Damian</p>
            <p className="text-xs pitch-muted">Dane osoby kontaktowej wyświetlane na stronie Kontakt.</p>
            {(["organizer_damian_name", "organizer_damian_phone", "organizer_damian_email"] as const).map((key) => (
              <FieldRow key={key} label={key.includes("name") ? "Imię i nazwisko" : key.includes("phone") ? "Telefon" : "E-mail"}>
                <Input
                  type={key.includes("email") ? "email" : "text"}
                  className={adminFieldClass}
                  defaultValue={settings[key]}
                  disabled={busy}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v && v !== settings[key]) void save({ [key]: v });
                  }}
                />
              </FieldRow>
            ))}
            <FieldRow label="Profil Facebook">
              <Input
                type="url"
                className={adminFieldClass}
                defaultValue={settings.facebook_damian_url}
                disabled={busy}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v !== settings.facebook_damian_url) void save({ facebook_damian_url: v });
                }}
              />
            </FieldRow>
          </div>
          <div className={cn(adminInnerPanelClass, "space-y-3")}>
            <p className="text-sm font-semibold text-white">Organizator — Mateusz</p>
            <p className="text-xs pitch-muted">Druga osoba kontaktowa na stronie Kontakt.</p>
            {(["organizer_mateusz_name", "organizer_mateusz_phone", "organizer_mateusz_email"] as const).map((key) => (
              <FieldRow key={key} label={key.includes("name") ? "Imię i nazwisko" : key.includes("phone") ? "Telefon" : "E-mail"}>
                <Input
                  type={key.includes("email") ? "email" : "text"}
                  className={adminFieldClass}
                  defaultValue={settings[key]}
                  disabled={busy}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v && v !== settings[key]) void save({ [key]: v });
                  }}
                />
              </FieldRow>
            ))}
            <FieldRow label="Profil Facebook">
              <Input
                type="url"
                className={adminFieldClass}
                defaultValue={settings.facebook_mateusz_url}
                disabled={busy}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v !== settings.facebook_mateusz_url) void save({ facebook_mateusz_url: v });
                }}
              />
            </FieldRow>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        id="settings-home-video"
        hidden={!sectionVisible("settings-home-video")}
        title="Film na stronie głównej"
        description="Opcjonalny embed YouTube — np. skrót meczu lub zapowiedź."
      >
        <FieldRow
          label="Link do filmu YouTube"
          hint="Wklej pełny adres lub samo ID filmu. Wyczyść pole i kliknij poza nim, aby usunąć film ze strony głównej."
        >
          <Input
            type="url"
            placeholder="https://www.youtube.com/watch?v=…"
            className={cn(adminFieldClass, "font-mono text-sm")}
            defaultValue={settings.home_youtube_url ?? ""}
            disabled={busy}
            key={`yt-${settings.home_youtube_url ?? ""}`}
            onBlur={(e) => {
              const v = e.target.value.trim();
              const cur = settings.home_youtube_url ?? "";
              if (v !== cur) void save({ home_youtube_url: v });
            }}
          />
        </FieldRow>
      </SettingsSection>

      <SettingsSection
        id="settings-adsense"
        hidden={!sectionVisible("settings-adsense")}
        title="Google AdSense"
        description="Reklamy wyświetlane po zgodzie użytkownika na cookies marketingowe. Nie pokazujemy ich na logowaniu, płatnościach ani w panelu admina."
      >
        <YesNoSwitchRow
          className={adminToggleRowClass}
          label="Włącz AdSense"
          hint="Po włączeniu i podaniu Publisher ID załadujemy skrypt Google (Auto ads + opcjonalny slot nad stopką)."
          checked={settings.adsense_enabled}
          disabled={busy}
          onCheckedChange={(v) => void save({ adsense_enabled: v })}
        />
        <FieldRow
          label="Publisher ID"
          hint="Z panelu AdSense, format ca-pub-XXXXXXXXXX. Możesz też ustawić NEXT_PUBLIC_ADSENSE_CLIENT_ID w środowisku."
        >
          <Input
            type="text"
            placeholder="ca-pub-…"
            className={cn(adminFieldClass, "font-mono text-sm")}
            defaultValue={settings.adsense_client_id ?? ""}
            disabled={busy}
            key={`adsense-${settings.adsense_client_id ?? ""}`}
            onBlur={(e) => {
              const v = e.target.value.trim();
              const cur = settings.adsense_client_id ?? "";
              if (v !== cur) void save({ adsense_client_id: v });
            }}
          />
        </FieldRow>
        <FieldRow
          label="ID jednostki nad stopką (opcjonalnie)"
          hint="Utwórz jednostkę Display w AdSense i wklej numer slotu. Bez tego działają tylko Auto ads (włącz je w panelu Google)."
        >
          <Input
            type="text"
            inputMode="numeric"
            placeholder="np. 1234567890"
            className={cn(adminFieldClass, "font-mono text-sm")}
            defaultValue={settings.adsense_slot_footer ?? ""}
            disabled={busy}
            key={`adsense-slot-${settings.adsense_slot_footer ?? ""}`}
            onBlur={(e) => {
              const v = e.target.value.trim();
              const cur = settings.adsense_slot_footer ?? "";
              if (v !== cur) void save({ adsense_slot_footer: v });
            }}
          />
        </FieldRow>
        <FieldRow
          label="ID jednostki w treści (opcjonalnie)"
          hint="Dodatkowy slot na Start, Terminarz i Galeria — osobna jednostka Display w AdSense."
        >
          <Input
            type="text"
            inputMode="numeric"
            placeholder="np. 1234567890"
            className={cn(adminFieldClass, "font-mono text-sm")}
            defaultValue={settings.adsense_slot_inline ?? ""}
            disabled={busy}
            key={`adsense-inline-${settings.adsense_slot_inline ?? ""}`}
            onBlur={(e) => {
              const v = e.target.value.trim();
              const cur = settings.adsense_slot_inline ?? "";
              if (v !== cur) void save({ adsense_slot_inline: v });
            }}
          />
        </FieldRow>
        <YesNoSwitchRow
          className={adminToggleRowClass}
          label="Popup z reklamą"
          hint="Po ~10 s na stronie ładuje reklamę i pokazuje okno dopiero gdy Google ją wypełni. Max. raz na 12 godzin na urządzenie."
          checked={settings.adsense_popup_enabled}
          disabled={busy}
          onCheckedChange={(v) => void save({ adsense_popup_enabled: v })}
        />
        <FieldRow
          label="ID jednostki popup (opcjonalnie)"
          hint="Osobna jednostka Display (np. prostokąt 300×250). Wymagana, gdy popup jest włączony."
        >
          <Input
            type="text"
            inputMode="numeric"
            placeholder="np. 1234567890"
            className={cn(adminFieldClass, "font-mono text-sm")}
            defaultValue={settings.adsense_slot_popup ?? ""}
            disabled={busy}
            key={`adsense-popup-${settings.adsense_slot_popup ?? ""}`}
            onBlur={(e) => {
              const v = e.target.value.trim();
              const cur = settings.adsense_slot_popup ?? "";
              if (v !== cur) void save({ adsense_slot_popup: v });
            }}
          />
        </FieldRow>
        <p className="text-xs leading-relaxed pitch-muted">
          Auto ads włączysz w panelu Google AdSense (Witryny → optymalizacja). Po akceptacji konta sprawdź też plik{" "}
          <a className="underline underline-offset-2" href="/ads.txt" target="_blank" rel="noreferrer">
            /ads.txt
          </a>
          . Statystyki wyświetleń: Analityka w panelu admina. Strony prawne:{" "}
          <a className="underline underline-offset-2" href="/regulamin" target="_blank" rel="noreferrer">
            regulamin
          </a>
          ,{" "}
          <a className="underline underline-offset-2" href="/polityka-prywatnosci" target="_blank" rel="noreferrer">
            polityka prywatności
          </a>
          ,{" "}
          <a className="underline underline-offset-2" href="/cookies" target="_blank" rel="noreferrer">
            cookies
          </a>
          .
        </p>
      </SettingsSection>

      <SettingsSection
        id="settings-registration"
        hidden={!sectionVisible("settings-registration")}
        title="Rejestracja i powiadomienia"
        description="Rejestracja nowych graczy jest zawsze otwarta. Tutaj włączasz logowanie e-mailem i hasłem oraz powiadomienia o meczach."
      >
        <YesNoSwitchRow
          className={adminToggleRowClass}
          label="Logowanie e-mailem i hasłem"
          hint="Włączone = na logowaniu główne są e-mail i hasło. Gracze ze starym kontem (bez e-maila) logują się PIN-em, a potem muszą uzupełnić e-mail, hasło i kod z wiadomości — dopiero wtedy PIN przestaje działać. Wymaga działającej wysyłki SMTP."
          checked={Boolean(settings.email_password_auth_enabled)}
          disabled={busy}
          onCheckedChange={(v) => void save({ email_password_auth_enabled: v })}
        />
        {!settings.system.smtp_configured ? (
          <p className="mb-3 text-sm text-amber-200/90">
            Wysyłka e-mail (SMTP) nie jest skonfigurowana — kody uwierzytelniające nie dojdą, dopóki nie ustawisz SMTP na
            serwerze.
          </p>
        ) : null}
        <div className={cn(adminStatusChipClass, "mb-2")}>
          <span className="text-emerald-100/70">Rejestracja nowych graczy:</span>{" "}
          <strong className="text-emerald-300">Zawsze włączona</strong>
          <p className="mt-1 text-sm text-emerald-100/75">
            Gracze mogą sami zakładać konta — tej opcji nie da się wyłączyć.
          </p>
        </div>
        <YesNoSwitchRow
          className={adminToggleRowClass}
          label="Pytaj gracza o e-mail po logowaniu"
          hint="Okno z prośbą o adres i zgodę na powiadomienia o nowych meczach."
          checked={settings.match_notification_prompt_enabled}
          disabled={busy}
          onCheckedChange={(v) => void save({ match_notification_prompt_enabled: v })}
        />
        <YesNoSwitchRow
          className={adminToggleRowClass}
          label="Wysyłaj e-maile o nowych meczach"
          hint="Do graczy, którzy zgodzili się na powiadomienia. Wymaga skonfigurowanej wysyłki e-mail na serwerze."
          checked={settings.match_email_notifications_enabled}
          disabled={busy}
          onCheckedChange={(v) => void save({ match_email_notifications_enabled: v })}
        />
      </SettingsSection>

      <SettingsSection
        id="settings-match-defaults"
        hidden={!sectionVisible("settings-match-defaults")}
        title="Domyślne ustawienia nowego meczu"
        description="Te wartości podpowiadają się przy dodawaniu terminu — dla każdego meczu możesz je nadpisać."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <FieldRow label="Liczba miejsc na liście" hint="Ile osób może się zapisać na mecz.">
            <Input
              type="number"
              min={1}
              max={99}
              className={adminFieldClass}
              defaultValue={settings.default_match_max_slots}
              disabled={busy}
              onBlur={(e) => {
                const n = Number(e.target.value);
                if (Number.isFinite(n) && n >= 1 && n !== settings.default_match_max_slots) {
                  void save({ default_match_max_slots: n });
                }
              }}
            />
          </FieldRow>
          <FieldRow label="Wynajem boiska (zł)" hint="Domyślna kwota wynajmu przy dodawaniu meczu. Zostaw puste, jeśli ustalana osobno.">
            <Input
              type="number"
              min={0}
              step={0.01}
              className={adminFieldClass}
              defaultValue={settings.default_match_fee_pln ?? ""}
              disabled={busy}
              placeholder="—"
              onBlur={(e) => {
                const raw = e.target.value.trim();
                const next = raw === "" ? null : Number(raw);
                if (raw !== "" && !Number.isFinite(next)) return;
                if (next !== settings.default_match_fee_pln) void save({ default_match_fee_pln: next });
              }}
            />
          </FieldRow>
          <FieldRow label="Miejsce rozgrywki" hint="Np. boisko przy szkole — podpowie się w formularzu dodawania meczu.">
            <Input
              className={adminFieldClass}
              defaultValue={settings.default_match_location}
              disabled={busy}
              placeholder="np. boisko przy szkole"
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v !== settings.default_match_location) void save({ default_match_location: v });
              }}
            />
          </FieldRow>
        </div>
      </SettingsSection>

      <SettingsSection
        id="settings-ranking-points"
        hidden={!sectionVisible("settings-ranking-points")}
        title="Rankingi — punkty za statystyki"
        description="Wagi akcji do średniej na mecz. Pozycja w rankingu zależy od średniej punktów na mecz, nie od liczby rozegranych spotkań."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              ["ranking_pt_goal", "Gol"],
              ["ranking_pt_assist", "Asysta"],
              ["ranking_pt_km", "1 km biegu"],
              ["ranking_pt_save", "Obroniony strzał"],
            ] as const
          ).map(([key, label]) => (
            <FieldRow key={key} label={`Punkty za: ${label}`}>
              <Input
                type="number"
                min={0}
                step={0.1}
                className={adminFieldClass}
                defaultValue={settings[key]}
                disabled={busy}
                onBlur={(e) => {
                  const n = Number(e.target.value);
                  if (Number.isFinite(n) && n >= 0 && n !== settings[key]) void save({ [key]: n });
                }}
              />
            </FieldRow>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection
        id="settings-pitch-plan"
        hidden={!sectionVisible("settings-pitch-plan")}
        title="Plan boiska (składy)"
        description="Przy układaniu składu na boisku pokazujemy kafelki zawodników — liczba kafelków zależy od zapisanych, w podanym zakresie."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FieldRow label="Minimum kafelków na boisku" hint="Gdy zapisanych jest mało osób.">
            <Input
              type="number"
              min={1}
              max={32}
              className={adminFieldClass}
              defaultValue={settings.lineup_pitch_slots_min}
              disabled={busy}
              onBlur={(e) => {
                const n = Number(e.target.value);
                if (Number.isFinite(n) && n >= 1 && n !== settings.lineup_pitch_slots_min) {
                  void save({ lineup_pitch_slots_min: n });
                }
              }}
            />
          </FieldRow>
          <FieldRow label="Maksimum kafelków na boisku" hint="Górny limit niezależnie od liczby zapisanych.">
            <Input
              type="number"
              min={1}
              max={32}
              className={adminFieldClass}
              defaultValue={settings.lineup_pitch_slots_max}
              disabled={busy}
              onBlur={(e) => {
                const n = Number(e.target.value);
                if (Number.isFinite(n) && n >= 1 && n !== settings.lineup_pitch_slots_max) {
                  void save({ lineup_pitch_slots_max: n });
                }
              }}
            />
          </FieldRow>
        </div>
      </SettingsSection>

      <SettingsSection
        id="settings-cancel-reasons"
        hidden={!sectionVisible("settings-cancel-reasons")}
        title="Powody anulowania meczu"
        description="Lista wyboru, gdy anulujesz termin w terminarzu."
      >
        <p className="text-sm leading-relaxed pitch-muted">
          W pierwszej kolumnie krótki kod (bez spacji, tylko dla systemu). W drugiej — tekst, który zobaczysz na liście
          przy anulowaniu.
        </p>
        <div className="hidden grid-cols-[minmax(8rem,1fr)_minmax(12rem,2fr)_auto] gap-2 px-0.5 text-xs font-semibold uppercase tracking-wide text-emerald-100/55 sm:grid">
          <span>Kod</span>
          <span>Opis powodu</span>
          <span className="sr-only">Akcja</span>
        </div>
        <div className="space-y-2">
          {cancelReasonsDraft.map((r, i) => (
            <div
              key={i}
              className="grid grid-cols-1 gap-2 rounded-xl border border-white/15 bg-black/10 p-3 sm:grid-cols-[minmax(8rem,1fr)_minmax(12rem,2fr)_auto] sm:items-center sm:border-0 sm:bg-transparent sm:p-0"
            >
              <Input
                className={cn(adminFieldClass, "font-mono text-xs")}
                value={r.value}
                disabled={busy}
                placeholder="np. pogoda"
                aria-label={`Kod powodu ${i + 1}`}
                onChange={(e) => {
                  const next = [...cancelReasonsDraft];
                  next[i] = { ...next[i], value: e.target.value };
                  setCancelReasonsDraft(next);
                }}
              />
              <Input
                className={adminFieldClass}
                value={r.label}
                disabled={busy}
                placeholder="np. Zła pogoda"
                aria-label={`Opis powodu ${i + 1}`}
                onChange={(e) => {
                  const next = [...cancelReasonsDraft];
                  next[i] = { ...next[i], label: e.target.value };
                  setCancelReasonsDraft(next);
                }}
              />
              <Button
                type="button"
                variant="gold"
                size="sm"
                className="sm:justify-self-end"
                disabled={busy || cancelReasonsDraft.length <= 1}
                onClick={() => setCancelReasonsDraft(cancelReasonsDraft.filter((_, j) => j !== i))}
              >
                Usuń
              </Button>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          <Button
            type="button"
            variant="gold"
            size="sm"
            disabled={busy || cancelReasonsDraft.length >= 20}
            onClick={() =>
              setCancelReasonsDraft([...cancelReasonsDraft, { value: `reason-${Date.now()}`, label: "Nowy powód" }])
            }
          >
            Dodaj powód
          </Button>
          <Button type="button" variant="gold" size="sm" disabled={busy} onClick={() => void save({ match_cancel_reasons: cancelReasonsDraft })}>
            Zapisz powody
          </Button>
        </div>
      </SettingsSection>

      <p className="text-center text-sm leading-relaxed text-emerald-100/75">
        Większość pól zapisuje się sama po kliknięciu poza pole. Powody anulowania zapisz przyciskiem „Zapisz powody”.
        Hasła do bazy i serwera e-mail ustawia się u hostingu — nie w tym panelu.
      </p>
        </>
      )}
        </>
      ) : null}
    </div>
  );
}

function MobileSettingsEditor({
  mobile,
  busy,
  cancelReasonsDraft,
  setCancelReasonsDraft,
  onSavePatch,
  visibleSectionIds,
}: {
  mobile: MobileChannelSettings;
  busy: boolean;
  cancelReasonsDraft: MatchCancelReasonEntry[];
  setCancelReasonsDraft: (v: MatchCancelReasonEntry[]) => void;
  onSavePatch: (patch: Partial<MobileChannelSettings>) => void;
  visibleSectionIds: Set<string>;
}) {
  const show = (id: string) => visibleSectionIds.has(id);
  return (
    <div className="space-y-6">
      <SettingsSection
        id="settings-m-name"
        hidden={!show("settings-m-name")}
        title="Nazwa w aplikacji"
        description="Wyświetlana w aplikacji Android (nie musi być identyczna ze stroną)."
      >
        <FieldRow label="Nazwa">
          <Input
            className={adminFieldClass}
            defaultValue={mobile.site_name}
            disabled={busy}
            key={`m-site_name-${mobile.site_name}`}
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v && v !== mobile.site_name) onSavePatch({ site_name: v });
            }}
          />
        </FieldRow>
        <FieldRow label="Opis">
          <textarea
            className={adminTextareaClass}
            defaultValue={mobile.site_description}
            disabled={busy}
            key={`m-site_desc-${mobile.site_description}`}
            onBlur={(e) => {
              if (e.target.value.trim() !== mobile.site_description) {
                onSavePatch({ site_description: e.target.value.trim() });
              }
            }}
          />
        </FieldRow>
        <FieldRow label="Baner na ekranie logowania" hint="Opcjonalny komunikat pod formularzem PIN.">
          <Input
            className={adminFieldClass}
            defaultValue={mobile.login_banner}
            disabled={busy}
            key={`m-banner-${mobile.login_banner}`}
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v !== mobile.login_banner) onSavePatch({ login_banner: v });
            }}
          />
        </FieldRow>
        <YesNoSwitchRow
          label="Pokaż PZU Cup w menu aplikacji"
          checked={mobile.show_pzu_cup}
          disabled={busy}
          onCheckedChange={(v) => onSavePatch({ show_pzu_cup: v })}
        />
        <FieldRow
          label="Wygląd aplikacji Android"
          hint="Cała aplikacja natywna (Compose) albo cała w WebView (jak strona WWW). Zmiana działa po odświeżeniu / ponownym otwarciu aplikacji."
        >
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={mobile.android_ui_mode !== "webview" ? "pitch" : "outline"}
              disabled={busy}
              onClick={() => {
                if (mobile.android_ui_mode !== "native") onSavePatch({ android_ui_mode: "native" });
              }}
            >
              Natywna
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mobile.android_ui_mode === "webview" ? "pitch" : "outline"}
              disabled={busy}
              onClick={() => {
                if (mobile.android_ui_mode !== "webview") onSavePatch({ android_ui_mode: "webview" });
              }}
            >
              WebView
            </Button>
          </div>
        </FieldRow>
        <div className={cn(adminStatusChipClass)}>
          <span className="text-emerald-100/70">Rejestracja z aplikacji:</span>{" "}
          <strong className="text-emerald-300">Zawsze włączona</strong>
        </div>
      </SettingsSection>

      <SettingsSection id="settings-m-contact" hidden={!show("settings-m-contact")} title="Kontakt w aplikacji">
        <FieldRow label="E-mail">
          <Input
            type="email"
            className={adminFieldClass}
            defaultValue={mobile.contact_email}
            disabled={busy}
            key={`m-contact-${mobile.contact_email}`}
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v && v !== mobile.contact_email) onSavePatch({ contact_email: v });
            }}
          />
        </FieldRow>
        <FieldRow label="Telefon BLIK">
          <Input
            className={adminFieldClass}
            defaultValue={mobile.blik_phone}
            disabled={busy}
            key={`m-blik-${mobile.blik_phone}`}
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v && v !== mobile.blik_phone) onSavePatch({ blik_phone: v });
            }}
          />
        </FieldRow>
      </SettingsSection>

      <SettingsSection id="settings-m-matches" hidden={!show("settings-m-matches")} title="Domyślne mecze (aplikacja)">
        <FieldRow label="Domyślna liczba miejsc">
          <Input
            type="number"
            className={adminFieldClass}
            defaultValue={mobile.default_match_max_slots}
            disabled={busy}
            key={`m-slots-${mobile.default_match_max_slots}`}
            onBlur={(e) => {
              const n = Number(e.target.value);
              if (Number.isFinite(n) && n >= 1 && n !== mobile.default_match_max_slots) {
                onSavePatch({ default_match_max_slots: n });
              }
            }}
          />
        </FieldRow>
        <FieldRow label="Domyślna lokalizacja">
          <Input
            className={adminFieldClass}
            defaultValue={mobile.default_match_location}
            disabled={busy}
            key={`m-loc-${mobile.default_match_location}`}
            onBlur={(e) => {
              if (e.target.value.trim() !== mobile.default_match_location) {
                onSavePatch({ default_match_location: e.target.value.trim() });
              }
            }}
          />
        </FieldRow>
      </SettingsSection>

      <SettingsSection id="settings-m-ranking" hidden={!show("settings-m-ranking")} title="Punkty rankingowe (aplikacja)">
        {(
          [
            ["ranking_pt_goal", "Gol", mobile.ranking_pt_goal],
            ["ranking_pt_assist", "Asysta", mobile.ranking_pt_assist],
            ["ranking_pt_km", "Km", mobile.ranking_pt_km],
            ["ranking_pt_save", "Obrona", mobile.ranking_pt_save],
          ] as const
        ).map(([key, label, value]) => (
          <FieldRow key={key} label={label}>
            <Input
              type="number"
              step="0.1"
              className={adminFieldClass}
              defaultValue={value}
              disabled={busy}
              key={`m-${key}-${value}`}
              onBlur={(e) => {
                const n = Number(e.target.value);
                if (Number.isFinite(n) && n >= 0 && n !== value) onSavePatch({ [key]: n });
              }}
            />
          </FieldRow>
        ))}
      </SettingsSection>

      <SettingsSection id="settings-m-cancel" hidden={!show("settings-m-cancel")} title="Powody anulowania (aplikacja)">
        <div className="space-y-2">
          {cancelReasonsDraft.map((r, i) => (
            <div key={i} className="flex flex-wrap gap-2">
              <Input
                className={cn(adminFieldClass, "min-w-[8rem] flex-1 font-mono text-xs")}
                value={r.value}
                disabled={busy}
                onChange={(e) => {
                  const next = [...cancelReasonsDraft];
                  next[i] = { ...next[i], value: e.target.value };
                  setCancelReasonsDraft(next);
                }}
              />
              <Input
                className={cn(adminFieldClass, "min-w-[10rem] flex-[2]")}
                value={r.label}
                disabled={busy}
                onChange={(e) => {
                  const next = [...cancelReasonsDraft];
                  next[i] = { ...next[i], label: e.target.value };
                  setCancelReasonsDraft(next);
                }}
              />
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="gold"
          size="sm"
          className="mt-3"
          disabled={busy}
          onClick={() => onSavePatch({ match_cancel_reasons: cancelReasonsDraft })}
        >
          Zapisz powody (aplikacja)
        </Button>
      </SettingsSection>
    </div>
  );
}
