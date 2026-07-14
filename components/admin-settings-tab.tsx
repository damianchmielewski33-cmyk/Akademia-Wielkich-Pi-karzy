"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { AppSettingsApiResponse } from "@/app/api/admin/app-settings/route";
import type { MatchCancelReasonEntry } from "@/lib/app-settings";
import { AdminSiteAssetField } from "@/components/admin-site-asset-field";
import { SITE_ASSET_KEYS } from "@/lib/site-assets";

type Props = {
  loading: boolean;
  onReload: () => void;
};

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <AdminCard title={title} description={description}>
      <div className="space-y-4">{children}</div>
    </AdminCard>
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
  return (
    <div className="grid gap-1.5">
      <Label className="text-sm font-semibold text-white">{label}</Label>
      {hint ? <p className="text-sm leading-relaxed pitch-muted">{hint}</p> : null}
      {children}
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className={adminToggleRowClass}>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-white">{label}</span>
        {hint ? <span className="mt-1 block text-sm pitch-muted">{hint}</span> : null}
      </span>
      <span className="flex items-center gap-2">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-white/30 bg-black/20 text-emerald-500 focus:ring-emerald-400"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="text-sm font-medium text-emerald-100/90">{checked ? "Tak" : "Nie"}</span>
      </span>
    </label>
  );
}

export function AdminSettingsTab({ loading, onReload }: Props) {
  const [settings, setSettings] = useState<AppSettingsApiResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [cancelReasonsDraft, setCancelReasonsDraft] = useState<MatchCancelReasonEntry[]>([]);

  const load = useCallback(async () => {
    setFetching(true);
    try {
      const res = await fetch("/api/admin/app-settings");
      if (!res.ok) throw new Error("Nie udało się wczytać ustawień");
      const data = (await res.json()) as AppSettingsApiResponse;
      setSettings(data);
      setCancelReasonsDraft(data.match_cancel_reasons);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Błąd wczytywania ustawień");
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = useCallback(
    async (patch: Record<string, unknown>) => {
      setSaving(true);
      try {
        const res = await fetch("/api/admin/app-settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        const j = (await res.json().catch(() => ({}))) as AppSettingsApiResponse & { error?: string };
        if (!res.ok) {
          toast.error(typeof j.error === "string" ? j.error : "Nie udało się zapisać");
          return;
        }
        setSettings(j);
        setCancelReasonsDraft(j.match_cancel_reasons);
        toast.success("Zapisano ustawienia");
      } catch {
        toast.error("Błąd połączenia");
      } finally {
        setSaving(false);
      }
    },
    []
  );

  const busy = loading || fetching || saving;

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

  const registrationStatusLabel = (() => {
    if (settings.allow_self_registration === true) {
      return "Włączona — każdy może założyć konto";
    }
    if (settings.allow_self_registration === false) {
      return "Wyłączona — nowe konta zakłada administrator";
    }
    if (settings.system.self_registration_env_override) {
      return "Włączona dodatkowo na serwerze";
    }
    if (!settings.system.is_production) {
      return "Włączona (serwer testowy)";
    }
    return "Domyślnie wyłączona po utworzeniu pierwszego konta";
  })();

  return (
    <div className="space-y-6">
      <AdminToolbar
        title="Ustawienia strony"
        description="Zmieniasz treści, kontakty, mecze i powiadomienia — bez edycji kodu. Po wyjściu z pola zmiany zapisują się same."
        onReload={() => {
          onReload();
          void load();
        }}
        loading={busy}
      />

      <SettingsSection
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
        title="Logo i tła"
        description="Wgraj własne grafiki albo zostaw domyślne. Zalecane formaty podane przy każdym polu."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {SITE_ASSET_KEYS.map((key) => {
            const customMap: Record<(typeof SITE_ASSET_KEYS)[number], string | null> = {
              logo_header: settings.asset_logo_header_url,
              logo_crest: settings.asset_logo_crest_url,
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
      </SettingsSection>

      <SettingsSection
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
        title="Rejestracja i powiadomienia"
        description="Kto może założyć konto samodzielnie oraz czy gracze dostają e-maile o nowych terminach."
      >
        <FieldRow
          label="Czy nowi gracze mogą sami zakładać konta?"
          hint="Standardowo: pierwszy użytkownik może się zarejestrować, potem rejestracja jest zamknięta. Możesz to wymusić włączeniem lub wyłączeniem poniżej."
        >
          <select
            className={cn("awp-native-select h-10 w-full rounded-xl px-3 text-sm", adminFieldClass)}
            value={
              settings.allow_self_registration === null
                ? "auto"
                : settings.allow_self_registration
                  ? "open"
                  : "closed"
            }
            disabled={busy}
            onChange={(e) => {
              const v = e.target.value;
              void save({
                allow_self_registration: v === "auto" ? null : v === "open",
              });
            }}
          >
            <option value="auto">Standardowo (zalecane)</option>
            <option value="open">Tak — zawsze pozwól na rejestrację</option>
            <option value="closed">Nie — tylko administrator dodaje graczy</option>
          </select>
        </FieldRow>
        <ToggleRow
          label="Pytaj gracza o e-mail po logowaniu"
          hint="Okno z prośbą o adres i zgodę na powiadomienia o nowych meczach."
          checked={settings.match_notification_prompt_enabled}
          disabled={busy}
          onChange={(v) => void save({ match_notification_prompt_enabled: v })}
        />
        <ToggleRow
          label="Wysyłaj e-maile o nowych meczach"
          hint="Do graczy, którzy zgodzili się na powiadomienia. Wymaga skonfigurowanej wysyłki e-mail na serwerze."
          checked={settings.match_email_notifications_enabled}
          disabled={busy}
          onChange={(v) => void save({ match_email_notifications_enabled: v })}
        />
      </SettingsSection>

      <SettingsSection
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
          <FieldRow label="Wpisowe (zł)" hint="Zostaw puste, jeśli kwota ustalana jest osobno dla każdego meczu.">
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
        title="Rankingi — punkty za statystyki"
        description="Ile punktów do rankingu dostaje zawodnik za gol, asystę, kilometr biegu lub obroniony strzał."
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
        title="Powody anulowania meczu"
        description="Lista wyboru, gdy anulujesz termin w terminarzu."
      >
        <p className="text-sm leading-relaxed pitch-muted">
          W pierwszej kolumnie krótki kod (bez spacji, tylko dla systemu). W drugiej — tekst, który zobaczysz na liście
          przy anulowaniu.
        </p>
        <div className="flex flex-wrap gap-2 px-0.5 text-xs font-semibold uppercase tracking-wide text-emerald-100/55">
          <span className="min-w-[8rem] flex-1">Kod</span>
          <span className="min-w-[10rem] flex-[2]">Opis powodu</span>
        </div>
        <div className="space-y-2">
          {cancelReasonsDraft.map((r, i) => (
            <div key={i} className="flex flex-wrap gap-2">
              <Input
                className={cn(adminFieldClass, "min-w-[8rem] flex-1 font-mono text-xs")}
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
                className={cn(adminFieldClass, "min-w-[10rem] flex-[2]")}
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
                variant="stadium"
                size="sm"
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
            variant="stadium"
            size="sm"
            disabled={busy || cancelReasonsDraft.length >= 20}
            onClick={() =>
              setCancelReasonsDraft([...cancelReasonsDraft, { value: `reason-${Date.now()}`, label: "Nowy powód" }])
            }
          >
            Dodaj powód
          </Button>
          <Button type="button" variant="pitch" size="sm" disabled={busy} onClick={() => void save({ match_cancel_reasons: cancelReasonsDraft })}>
            Zapisz powody
          </Button>
        </div>
      </SettingsSection>

      <p className="text-center text-sm leading-relaxed text-emerald-100/75">
        Większość pól zapisuje się sama po kliknięciu poza pole. Powody anulowania zapisz przyciskiem „Zapisz powody”.
        Hasła do bazy i serwera e-mail ustawia się u hostingu — nie w tym panelu.
      </p>
    </div>
  );
}
