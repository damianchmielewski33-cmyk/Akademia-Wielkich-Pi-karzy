"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AppSettingsApiResponse } from "@/app/api/admin/app-settings/route";
import type { MatchCancelReasonEntry } from "@/lib/app-settings";

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
    <Card className="border-zinc-200/80 bg-white shadow-sm dark:border-zinc-700/80 dark:bg-zinc-900/90">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function FieldRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{label}</Label>
      {hint ? <p className="text-xs text-zinc-500 dark:text-zinc-400">{hint}</p> : null}
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
    <label className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-zinc-200 bg-zinc-50/60 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/40">
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100">{label}</span>
        {hint ? <span className="mt-1 block text-sm text-zinc-600 dark:text-zinc-400">{hint}</span> : null}
      </span>
      <span className="flex items-center gap-2">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-zinc-300 text-emerald-700 focus:ring-emerald-600"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {checked ? "Włączony" : "Wyłączony"}
        </span>
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
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-zinc-600">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
        Wczytywanie ustawień…
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 px-4 py-12 text-center text-sm text-zinc-600">
        Nie udało się wczytać ustawień.{" "}
        <button type="button" className="font-semibold text-emerald-700 underline" onClick={() => void load()}>
          Spróbuj ponownie
        </button>
      </div>
    );
  }

  const regModeLabel =
    settings.allow_self_registration === null
      ? "Automatycznie (env / środowisko dev)"
      : settings.allow_self_registration
        ? "Wymuszone: otwarta"
        : "Wymuszone: zamknięta";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-zinc-900 dark:text-zinc-100">
            <Settings2 className="h-5 w-5 text-emerald-700" aria-hidden />
            Konfiguracja aplikacji
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Pełna konfiguracja strony, kontaktów, meczów, rankingów i powiadomień — bez zmiany kodu.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => { onReload(); void load(); }}>
          Odśwież
        </Button>
      </div>

      <SettingsSection
        title="Status systemu"
        description="Informacje tylko do odczytu — wymagają zmiennych środowiskowych na serwerze."
      >
        <ul className="grid gap-2 text-sm sm:grid-cols-2">
          <li className="rounded-lg border border-zinc-200 bg-zinc-50/80 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800/50">
            <span className="text-zinc-500">SMTP (e-mail):</span>{" "}
            <strong className={settings.system.smtp_configured ? "text-emerald-700" : "text-amber-700"}>
              {settings.system.smtp_configured ? "Skonfigurowany" : "Brak — powiadomienia e-mail nie wyjdą"}
            </strong>
          </li>
          <li className="rounded-lg border border-zinc-200 bg-zinc-50/80 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800/50">
            <span className="text-zinc-500">Środowisko:</span>{" "}
            <strong>{settings.system.is_production ? "Produkcja" : "Development"}</strong>
          </li>
          <li className="rounded-lg border border-zinc-200 bg-zinc-50/80 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800/50">
            <span className="text-zinc-500">Env ALLOW_SELF_REGISTRATION:</span>{" "}
            <strong>{settings.system.self_registration_env_override ? "włączone (=1)" : "nie ustawione"}</strong>
          </li>
          <li className="rounded-lg border border-zinc-200 bg-zinc-50/80 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800/50">
            <span className="text-zinc-500">Rejestracja (panel):</span> <strong>{regModeLabel}</strong>
          </li>
        </ul>
      </SettingsSection>

      <SettingsSection title="Strona i branding" description="Nazwa i opis widoczne w nagłówku, SEO i meta tagach.">
        <FieldRow label="Nazwa strony">
          <Input
            defaultValue={settings.site_name}
            disabled={busy}
            key={`site_name-${settings.site_name}`}
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v && v !== settings.site_name) void save({ site_name: v });
            }}
          />
        </FieldRow>
        <FieldRow label="Opis strony (SEO)">
          <textarea
            className="min-h-[80px] w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
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

      <SettingsSection title="Kontakt i organizatorzy" description="Dane na stronie Kontakt i w stopce.">
        <FieldRow label="Główny e-mail kontaktowy">
          <Input
            type="email"
            defaultValue={settings.contact_email}
            disabled={busy}
            key={`contact-${settings.contact_email}`}
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v && v !== settings.contact_email) void save({ contact_email: v });
            }}
          />
        </FieldRow>
        <FieldRow label="Numer BLIK (wpisowe)" hint="Wyświetlany przy płatnościach.">
          <Input
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
          <div className="space-y-3 rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Organizator 1</p>
            {(["organizer_damian_name", "organizer_damian_phone", "organizer_damian_email"] as const).map((key) => (
              <FieldRow key={key} label={key.includes("name") ? "Imię i nazwisko" : key.includes("phone") ? "Telefon" : "E-mail"}>
                <Input
                  type={key.includes("email") ? "email" : "text"}
                  defaultValue={settings[key]}
                  disabled={busy}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v && v !== settings[key]) void save({ [key]: v });
                  }}
                />
              </FieldRow>
            ))}
            <FieldRow label="Facebook">
              <Input
                type="url"
                defaultValue={settings.facebook_damian_url}
                disabled={busy}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v !== settings.facebook_damian_url) void save({ facebook_damian_url: v });
                }}
              />
            </FieldRow>
          </div>
          <div className="space-y-3 rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Organizator 2</p>
            {(["organizer_mateusz_name", "organizer_mateusz_phone", "organizer_mateusz_email"] as const).map((key) => (
              <FieldRow key={key} label={key.includes("name") ? "Imię i nazwisko" : key.includes("phone") ? "Telefon" : "E-mail"}>
                <Input
                  type={key.includes("email") ? "email" : "text"}
                  defaultValue={settings[key]}
                  disabled={busy}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v && v !== settings[key]) void save({ [key]: v });
                  }}
                />
              </FieldRow>
            ))}
            <FieldRow label="Facebook">
              <Input
                type="url"
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

      <SettingsSection title="Transmisja YouTube" description="Film lub transmisja na stronie głównej.">
        <FieldRow label="Link lub ID YouTube" hint="Wyczyść pole i zapisz, aby usunąć.">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              type="url"
              placeholder="https://www.youtube.com/watch?v=…"
              defaultValue={settings.home_youtube_url ?? ""}
              disabled={busy}
              key={`yt-${settings.home_youtube_url ?? ""}`}
              className="font-mono text-sm"
              onBlur={(e) => {
                const v = e.target.value.trim();
                const cur = settings.home_youtube_url ?? "";
                if (v !== cur) void save({ home_youtube_url: v });
              }}
            />
          </div>
        </FieldRow>
      </SettingsSection>

      <SettingsSection title="Rejestracja i powiadomienia">
        <FieldRow
          label="Tryb rejestracji samoobsługowej"
          hint="„Automatycznie” = pierwszy użytkownik zawsze może się zarejestrować; potem env/dev. Wymuszenie omija env."
        >
          <select
            className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-600 dark:bg-zinc-900"
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
            <option value="auto">Automatycznie (domyślne)</option>
            <option value="open">Wymuś: otwarta rejestracja</option>
            <option value="closed">Wymuś: zamknięta rejestracja</option>
          </select>
        </FieldRow>
        <ToggleRow
          label="Pop-up: zgoda na powiadomienia e-mail"
          hint="Okno z adresem e-mail przy logowaniu."
          checked={settings.match_notification_prompt_enabled}
          disabled={busy}
          onChange={(v) => void save({ match_notification_prompt_enabled: v })}
        />
        <ToggleRow
          label="E-maile o nowych meczach"
          hint="Wysyłka do użytkowników ze zgodą po dodaniu terminu (wymaga SMTP)."
          checked={settings.match_email_notifications_enabled}
          disabled={busy}
          onChange={(v) => void save({ match_email_notifications_enabled: v })}
        />
      </SettingsSection>

      <SettingsSection title="Domyślne parametry meczów" description="Wartości startowe przy dodawaniu nowego terminu.">
        <div className="grid gap-4 sm:grid-cols-3">
          <FieldRow label="Miejsca (max_slots)">
            <Input
              type="number"
              min={1}
              max={99}
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
          <FieldRow label="Wpisowe (zł)" hint="Puste = brak domyślnej kwoty.">
            <Input
              type="number"
              min={0}
              step={0.01}
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
          <FieldRow label="Domyślna lokalizacja">
            <Input
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

      <SettingsSection title="Rankingi — punkty za statystyki">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              ["ranking_pt_goal", "Gol"],
              ["ranking_pt_assist", "Asysta"],
              ["ranking_pt_km", "Kilometr"],
              ["ranking_pt_save", "Obrona"],
            ] as const
          ).map(([key, label]) => (
            <FieldRow key={key} label={label}>
              <Input
                type="number"
                min={0}
                step={0.1}
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

      <SettingsSection title="Składy na boisku" description="Liczba pól zależna od zapisów (min–max).">
        <div className="grid gap-4 sm:grid-cols-2">
          <FieldRow label="Minimum pól">
            <Input
              type="number"
              min={1}
              max={32}
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
          <FieldRow label="Maksimum pól">
            <Input
              type="number"
              min={1}
              max={32}
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

      <SettingsSection title="Powody anulowania meczu">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Lista opcji w dialogu anulowania. Wartość (klucz) — bez spacji; etykieta — tekst widoczny dla admina.
        </p>
        <div className="space-y-2">
          {cancelReasonsDraft.map((r, i) => (
            <div key={i} className="flex flex-wrap gap-2">
              <Input
                className="min-w-[8rem] flex-1 font-mono text-xs"
                value={r.value}
                disabled={busy}
                placeholder="klucz"
                onChange={(e) => {
                  const next = [...cancelReasonsDraft];
                  next[i] = { ...next[i], value: e.target.value };
                  setCancelReasonsDraft(next);
                }}
              />
              <Input
                className="min-w-[10rem] flex-[2]"
                value={r.label}
                disabled={busy}
                placeholder="Etykieta"
                onChange={(e) => {
                  const next = [...cancelReasonsDraft];
                  next[i] = { ...next[i], label: e.target.value };
                  setCancelReasonsDraft(next);
                }}
              />
              <Button
                type="button"
                variant="outline"
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
            variant="outline"
            size="sm"
            disabled={busy || cancelReasonsDraft.length >= 20}
            onClick={() =>
              setCancelReasonsDraft([...cancelReasonsDraft, { value: `reason-${Date.now()}`, label: "Nowy powód" }])
            }
          >
            Dodaj powód
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={busy}
            onClick={() => void save({ match_cancel_reasons: cancelReasonsDraft })}
          >
            Zapisz powody
          </Button>
        </div>
      </SettingsSection>

      <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
        Ustawienia zapisują się automatycznie po opuszczeniu pola (onBlur) lub po kliknięciu przycisku Zapisz.
        Sekrety (AUTH_SECRET, Turso, SMTP) pozostają w zmiennych środowiskowych serwera.
      </p>
    </div>
  );
}
