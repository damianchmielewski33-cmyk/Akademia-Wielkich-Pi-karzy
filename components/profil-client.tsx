"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ComponentType } from "react";
import { toast } from "@/lib/app-toast";
import {
  Activity,
  Camera,
  Moon,
  Pencil,
  Route,
  Share2,
  Shield,
  Sun,
  Target,
  Trash2,
  Wallet,
} from "lucide-react";
import { AppModal } from "@/components/ui/app-modal";
import { modalPanelClass } from "@/components/ui/modal-shared";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { InlinePreloader } from "@/components/preloaders";
import { PlayerAliasPicker } from "@/components/player-alias-picker";
import { PlayerAvatar, PlayerNameStack } from "@/components/player-avatar";
import { formatWalletPln } from "@/components/player-wallet-panel";
import { MarketplaceSection, mpSectionCardClass } from "@/components/payments-card";
import { MarketplacePitchPhoto } from "@/components/marketplace-pitch-photo";
import { PhotoPanel } from "@/components/photo-panel";
import { useSiteMode } from "@/components/site-mode";
import { PitchPageHero } from "@/components/ui/pitch-card";
import { AndroidAppVersionCard } from "@/components/android-app-version-card";
import type { ProfileDashboard } from "@/lib/profile-data";
import { MARKETPLACE_PITCH_PHOTOS } from "@/lib/marketplace-photos";
import { normalizeUiTheme, type UiTheme } from "@/lib/ui-theme";
import { cn } from "@/lib/utils";
import { useHotpayPayment } from "@/hooks/use-hotpay-payment";
import { PayButton } from "@/components/pay-button";

type Props = {
  initial: ProfileDashboard;
  walletBalancePln: number;
  hotpayEnabled: boolean;
};

export function ProfilClient({
  initial,
  walletBalancePln,
  hotpayEnabled,
}: Props) {
  const { marketplaceEnabled } = useSiteMode();
  const router = useRouter();
  const [data, setData] = useState<ProfileDashboard>(initial);
  const { pay: payDebt, busy: debtBusy } = useHotpayPayment();
  const [firstName, setFirstName] = useState(initial.user.first_name);
  const [lastName, setLastName] = useState(initial.user.last_name);
  const [zawodnik, setZawodnik] = useState(initial.user.zawodnik);
  const [uiTheme, setUiTheme] = useState<UiTheme>(normalizeUiTheme(initial.user.ui_theme));
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);

  const [statsOpen, setStatsOpen] = useState(false);
  const [statsCtx, setStatsCtx] = useState<{
    match_id: number;
    label: string;
    goals: string;
    assists: string;
    distance: string;
    saves: string;
  } | null>(null);

  async function reloadDashboard() {
    const res = await fetch("/api/profile");
    if (!res.ok) return;
    const json = (await res.json()) as ProfileDashboard;
    setData(json);
    setFirstName(json.user.first_name);
    setLastName(json.user.last_name);
    setZawodnik(json.user.zawodnik);
    setUiTheme(normalizeUiTheme(json.user.ui_theme));
  }

  async function saveProfile() {
    if (!editingProfile) return;
    setSavingProfile(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          zawodnik,
          ui_theme: uiTheme,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof body.error === "string" ? body.error : "Nie udało się zapisać profilu");
        return;
      }
      const next = body as ProfileDashboard & { ok?: boolean };
      if (next.user) {
        const { ok, ...dash } = next;
        void ok;
        setData(dash as ProfileDashboard);
        setFirstName(next.user.first_name);
        setLastName(next.user.last_name);
        setZawodnik(next.user.zawodnik);
        setUiTheme(normalizeUiTheme(next.user.ui_theme));
      }
      toast.success("Profil zapisany");
      setEditingProfile(false);
      router.refresh();
    } finally {
      setSavingProfile(false);
    }
  }

  function cancelProfileEdit() {
    setFirstName(data.user.first_name);
    setLastName(data.user.last_name);
    setZawodnik(data.user.zawodnik);
    setUiTheme(normalizeUiTheme(data.user.ui_theme));
    setEditingProfile(false);
  }

  async function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const fd = new FormData();
      fd.set("photo", file);
      const res = await fetch("/api/profile/photo", { method: "POST", body: fd });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof body.error === "string" ? body.error : "Nie udało się wgrać zdjęcia");
        return;
      }
      setData((d) => ({
        ...d,
        user: { ...d.user, profile_photo_path: body.profile_photo_path ?? d.user.profile_photo_path },
      }));
      toast.success("Zdjęcie zaktualizowane");
      router.refresh();
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function removePhoto() {
    setUploadingPhoto(true);
    try {
      const res = await fetch("/api/profile/photo", { method: "DELETE" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof body.error === "string" ? body.error : "Błąd usuwania zdjęcia");
        return;
      }
      setData((d) => ({
        ...d,
        user: { ...d.user, profile_photo_path: null },
      }));
      toast.success("Usunięto zdjęcie profilowe");
      router.refresh();
    } finally {
      setUploadingPhoto(false);
    }
  }

  function openStatsEditor(
    match_id: number,
    label: string,
    goals: number,
    assists: number,
    distance: number,
    saves: number,
    opts?: { blankDefaults?: boolean }
  ) {
    const blank = opts?.blankDefaults === true;
    setStatsCtx({
      match_id,
      label,
      goals: blank ? "" : String(goals),
      assists: blank ? "" : String(assists),
      distance: blank ? "" : String(distance),
      saves: blank ? "" : String(saves),
    });
    setStatsOpen(true);
  }

  async function submitStats() {
    if (!statsCtx) return;
    const nz = (s: string) => (s.trim() === "" ? "0" : s);
    const fd = new FormData();
    fd.set("match_id", String(statsCtx.match_id));
    fd.set("goals", nz(statsCtx.goals));
    fd.set("assists", nz(statsCtx.assists));
    fd.set("distance", nz(statsCtx.distance));
    fd.set("saves", nz(statsCtx.saves));
    const res = await fetch("/api/stats/save", { method: "POST", body: fd });
    const text = await res.text();
    if (text === "OK") {
      setStatsOpen(false);
      setStatsCtx(null);
      toast.success("Statystyki zapisane");
      await reloadDashboard();
      router.refresh();
      return;
    }
    try {
      const j = JSON.parse(text) as { error?: string };
      toast.error(j.error ?? "Błąd zapisu statystyk");
    } catch {
      toast.error("Błąd zapisu statystyk");
    }
  }

  const u = data.user;
  const light = marketplaceEnabled;

  const photoActions = (
    <div className="mt-4 flex flex-wrap justify-center gap-2">
      <Button
        type="button"
        variant={light ? "default" : "secondary"}
        size="sm"
        disabled={uploadingPhoto}
        className={light ? "rounded-full bg-[var(--mp-teal)] hover:bg-[var(--mp-teal-dark)]" : undefined}
        asChild
      >
        <label className="cursor-pointer">
          <Camera className="mr-1.5 h-4 w-4" />
          {uploadingPhoto ? "Przetwarzanie…" : "Wgraj zdjęcie"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={onPhotoChange}
          />
        </label>
      </Button>
      {u.profile_photo_path ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploadingPhoto}
          className={light ? "rounded-full" : undefined}
          onClick={removePhoto}
        >
          <Trash2 className="mr-1.5 h-4 w-4" />
          Usuń
        </Button>
      ) : null}
    </div>
  );

  const profileForm = (
    <div className="mt-5 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="pf_fn">Imię</Label>
          <Input
            id="pf_fn"
            value={firstName}
            readOnly={!editingProfile}
            onChange={(e) => setFirstName(e.target.value)}
            className={cn(
              "mt-1",
              !editingProfile &&
                (light
                  ? "cursor-default border-zinc-200 bg-zinc-50 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  : "cursor-default border-emerald-100/90 bg-zinc-50/80 text-emerald-950 dark:text-emerald-100")
            )}
            required
          />
        </div>
        <div>
          <Label htmlFor="pf_ln">Nazwisko</Label>
          <Input
            id="pf_ln"
            value={lastName}
            readOnly={!editingProfile}
            onChange={(e) => setLastName(e.target.value)}
            className={cn(
              "mt-1",
              !editingProfile &&
                (light
                  ? "cursor-default border-zinc-200 bg-zinc-50 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  : "cursor-default border-emerald-100/90 bg-zinc-50/80 text-emerald-950 dark:text-emerald-100")
            )}
            required
          />
        </div>
      </div>
      <PlayerAliasPicker
        label="Piłkarz (postać na stronie)"
        value={zawodnik}
        onChange={setZawodnik}
        disabled={!editingProfile}
        helperText={
          editingProfile
            ? "Wyszukaj z internetu lub wpisz dowolnego piłkarza — pseudonim musi być unikalny w akademii."
            : ""
        }
        inputClassName={cn(
          !editingProfile &&
            (light
              ? "cursor-default border-zinc-200 bg-zinc-50 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              : "cursor-default border-emerald-100/90 bg-zinc-50/80 text-emerald-950 dark:text-emerald-100")
        )}
      />
      <div>
        <Label>Motyw strony</Label>
        <Select value={uiTheme} onValueChange={(v) => setUiTheme(normalizeUiTheme(v))} disabled={!editingProfile}>
          <SelectTrigger
            className={cn(
              "mt-1",
              !editingProfile &&
                (light
                  ? "cursor-default border-zinc-200 bg-zinc-50 opacity-100 dark:border-zinc-700 dark:bg-zinc-900"
                  : "cursor-default border-emerald-100/90 bg-zinc-50/80 opacity-100")
            )}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="light">
              <span className="flex items-center gap-2">
                <Sun className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                Jasny
              </span>
            </SelectItem>
            <SelectItem value="dark">
              <span className="flex items-center gap-2">
                <Moon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                Ciemny
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
        <p className="mt-1.5 text-xs text-zinc-500">
          Po zapisaniu stosuje się do całej aplikacji (nagłówek, treść, stopka).
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {editingProfile ? (
          <>
            <Button
              type="button"
              disabled={savingProfile}
              className={light ? "rounded-full" : undefined}
              onClick={() => void saveProfile()}
            >
              {savingProfile ? "Zapisywanie…" : "Zapisz edycje"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={savingProfile}
              className={light ? "rounded-full" : undefined}
              onClick={cancelProfileEdit}
            >
              Anuluj
            </Button>
          </>
        ) : (
          <Button
            type="button"
            className={light ? "rounded-full" : undefined}
            onClick={() => {
              window.setTimeout(() => setEditingProfile(true), 0);
            }}
          >
            Edytuj
          </Button>
        )}
      </div>
    </div>
  );

  const walletBlock = (
    <div
      className={cn(
        "mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4",
        light
          ? "border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/80"
          : "border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80",
        walletBalancePln < 0 && "border-red-200 dark:border-red-800/50",
        walletBalancePln > 0 &&
          (light ? "border-teal-200 dark:border-teal-900" : "border-emerald-200 dark:border-emerald-800/50")
      )}
    >
      <div>
        <p
          className={cn(
            "text-xs font-semibold uppercase tracking-wide",
            light ? "text-[var(--mp-teal-dark)]" : "text-zinc-500"
          )}
        >
          Saldo
        </p>
        <p
          className={cn(
            "mt-1 text-3xl font-bold tabular-nums",
            light ? "text-zinc-950 dark:text-white" : "text-emerald-950 dark:text-emerald-100",
            walletBalancePln < 0 && "text-red-600 dark:text-red-300",
            walletBalancePln > 0 && light && "text-[var(--mp-teal-dark)]"
          )}
        >
          {formatWalletPln(walletBalancePln)}
        </p>
        {walletBalancePln < 0 ? (
          <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-300">Niedopłata do uregulowania</p>
        ) : null}
      </div>
      {hotpayEnabled && walletBalancePln < 0 ? (
        <PayButton
          variant="default"
          amountPln={walletBalancePln}
          busy={debtBusy}
          onClick={() => void payDebt(Math.abs(walletBalancePln))}
        />
      ) : (
        <Button asChild variant={light ? "default" : "pitch"} className={light ? "rounded-full" : undefined}>
          <Link href="/platnosci">Zapłać kartą lub Blikiem</Link>
        </Button>
      )}
    </div>
  );

  const summaryGrid = (
    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
      <MiniStat light={light} icon={Activity} label="Mecze ze statystykami" value={data.summary.matches_with_stats} />
      <MiniStat light={light} icon={Target} label="Gole" value={data.summary.goals} />
      <MiniStat light={light} icon={Share2} label="Asysty" value={data.summary.assists} />
      <MiniStat light={light} icon={Route} label="Dystans (km)" value={data.summary.distance_km.toFixed(1)} />
      <MiniStat light={light} icon={Shield} label="Obrony" value={data.summary.saves} />
      <MiniStat
        light={light}
        icon={Activity}
        label="Brak statystyk"
        value={data.summary.missing_stats_count}
        muted={data.summary.missing_stats_count === 0}
      />
    </div>
  );

  const matchStatsSection = (
    <>
      {data.matches_missing_stats.length > 0 ? (
        <div className="mt-5">
          <h3
            className={cn(
              "text-sm font-semibold uppercase tracking-wide",
              light ? "text-[var(--mp-teal-dark)]" : "text-emerald-900/90 dark:text-emerald-200/90"
            )}
          >
            Do uzupełnienia
          </h3>
          <ul className="mt-2 space-y-2">
            {data.matches_missing_stats.map((m) => (
              <li
                key={m.match_id}
                className={cn(
                  "flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2.5",
                  light
                    ? "border-amber-200 bg-amber-50/70 dark:border-amber-900/50 dark:bg-amber-950/25"
                    : "border-amber-200/80 bg-amber-50/50"
                )}
              >
                <span
                  className={cn(
                    "text-sm",
                    light ? "text-zinc-900 dark:text-zinc-100" : "text-emerald-950 dark:text-emerald-100"
                  )}
                >
                  {m.match_date} · {m.match_time} — {m.location}
                </span>
                <div className="flex items-center gap-2">
                  {!m.can_add ? (
                    <Badge variant="secondary" className="font-normal">
                      Termin minął ({m.edit_deadline})
                    </Badge>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      className={light ? "rounded-full" : undefined}
                      onClick={() =>
                        openStatsEditor(m.match_id, `${m.match_date} · ${m.location}`, 0, 0, 0, 0, {
                          blankDefaults: true,
                        })
                      }
                    >
                      Dodaj statystyki
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {data.match_stats.length > 0 ? (
        <ul className="mt-5 space-y-2">
          {data.match_stats.map((s) => (
            <li
              key={`stat-${s.stat_id}`}
              className={cn(
                "flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2.5",
                light
                  ? "border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/60"
                  : "border-emerald-100/90 bg-emerald-50/35"
              )}
            >
              <div
                className={cn(
                  "min-w-0 text-sm",
                  light ? "text-zinc-900 dark:text-zinc-100" : "text-emerald-950 dark:text-emerald-100"
                )}
              >
                <span className="font-medium">{s.match_date}</span> · {s.match_time} — {s.location}
                <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
                  Gole {s.goals} · Asysty {s.assists} · km {s.distance.toFixed(1)} · Obrony {s.saves ?? 0}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {!s.can_edit ? (
                  <Badge variant="outline" className="font-normal text-zinc-600 dark:text-zinc-400">
                    Zablokowane (było do {s.edit_deadline})
                  </Badge>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant={light ? "outline" : "secondary"}
                    className={light ? "rounded-full" : undefined}
                    onClick={() =>
                      openStatsEditor(
                        s.match_id,
                        `${s.match_date} · ${s.location}`,
                        s.goals,
                        s.assists,
                        s.distance,
                        s.saves ?? 0
                      )
                    }
                  >
                    Edytuj
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : data.matches_missing_stats.length === 0 ? (
        <p className="relative mt-4 text-sm text-zinc-500 dark:text-zinc-400">
          Brak rozegranych meczów ze statystykami.
        </p>
      ) : null}
    </>
  );

  const activitySection = (
    <>
      {data.recent_activity.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">Brak wpisów.</p>
      ) : (
        <ul
          className={cn(
            "mt-4 space-y-2 border-t pt-4",
            light ? "border-zinc-200 dark:border-zinc-800" : "border-emerald-100/80"
          )}
        >
          {data.recent_activity.map((a, i) => (
            <li key={i} className="text-sm text-zinc-700 dark:text-zinc-300">
              <span className="text-xs tabular-nums text-zinc-400">{a.timestamp}</span>
              <span
                className={cn(
                  "mt-0.5 block",
                  light ? "text-zinc-900 dark:text-zinc-100" : "text-emerald-950 dark:text-emerald-100"
                )}
              >
                {a.action}
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );

  const shortcuts = (
    <ul className="mt-3 list-inside list-disc space-y-1.5 text-sm text-zinc-600 dark:text-zinc-300">
      <li>
        <Link
          href="/terminarz"
          className={cn(
            "font-medium underline-offset-2 hover:underline",
            light ? "text-[var(--mp-teal-dark)]" : "text-emerald-800"
          )}
        >
          Terminarz
        </Link>{" "}
        — zapisy na mecze
      </li>
      <li>
        <Link
          href="/rankingi"
          className={cn(
            "font-medium underline-offset-2 hover:underline",
            light ? "text-[var(--mp-teal-dark)]" : "text-emerald-800"
          )}
        >
          Rankingi
        </Link>
      </li>
      <li>
        <Link
          href="/pilkarze"
          className={cn(
            "font-medium underline-offset-2 hover:underline",
            light ? "text-[var(--mp-teal-dark)]" : "text-emerald-800"
          )}
        >
          Piłkarze
        </Link>{" "}
        — jak widzą Cię inni
      </li>
    </ul>
  );

  const statsModal = (
    <AppModal
      open={statsOpen}
      onOpenChange={setStatsOpen}
      size="lg"
      title="Statystyki meczu"
      description={statsCtx?.label}
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => setStatsOpen(false)}>
            Anuluj
          </Button>
          <Button type="button" variant={light ? "default" : "pitch"} onClick={submitStats}>
            Zapisz
          </Button>
        </>
      }
    >
      {statsCtx ? (
        <div className={cn(modalPanelClass, "grid gap-3 sm:grid-cols-2")}>
          <FormInput
            id="st_g"
            label="Gole"
            type="number"
            min={0}
            value={statsCtx.goals}
            onChange={(e) => setStatsCtx({ ...statsCtx, goals: e.target.value })}
          />
          <FormInput
            id="st_a"
            label="Asysty"
            type="number"
            min={0}
            value={statsCtx.assists}
            onChange={(e) => setStatsCtx({ ...statsCtx, assists: e.target.value })}
          />
          <FormInput
            id="st_d"
            label="Dystans (km)"
            type="number"
            min={0}
            step="0.1"
            value={statsCtx.distance}
            onChange={(e) => setStatsCtx({ ...statsCtx, distance: e.target.value })}
          />
          <FormInput
            id="st_s"
            label="Obronione strzały"
            type="number"
            min={0}
            value={statsCtx.saves}
            onChange={(e) => setStatsCtx({ ...statsCtx, saves: e.target.value })}
          />
        </div>
      ) : null}
    </AppModal>
  );

  if (light) {
    return (
      <div className="relative flex flex-1 flex-col text-zinc-900 dark:text-zinc-50">
        <section className="mp-hero mp-hero--photo relative z-10 flex flex-col justify-end overflow-hidden pb-10 pt-12 sm:pb-16 sm:pt-20">
          <MarketplacePitchPhoto src={MARKETPLACE_PITCH_PHOTOS[5]} priority className="z-0" />
          <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black/80 via-black/45 to-black/25" />
          <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center px-3 text-center xs:px-4 sm:flex-row sm:items-end sm:gap-8 sm:text-left">
            <div className="relative shrink-0">
              <div className="overflow-hidden rounded-full border-4 border-white/90 shadow-xl ring-4 ring-[var(--mp-teal)]/40">
                <PlayerAvatar
                  photoPath={u.profile_photo_path}
                  firstName={firstName}
                  lastName={lastName}
                  size="profile"
                  ringClassName="ring-0"
                />
              </div>
              {uploadingPhoto ? (
                <InlinePreloader layout="overlay" immediate label="Zapisywanie zdjęcia…" />
              ) : null}
            </div>
            <div className="mt-4 min-w-0 flex-1 sm:mt-0 sm:pb-2">
              <p className="text-[0.65rem] font-black uppercase tracking-[0.22em] text-white/80 sm:text-xs">
                Akademia
              </p>
              <h1 className="mt-1 text-[1.85rem] font-black leading-tight tracking-tight text-white xs:text-4xl sm:text-5xl">
                {firstName} {lastName}
              </h1>
              {zawodnik ? (
                <p className="mt-2 text-sm font-semibold text-white/90 sm:text-base">@{zawodnik}</p>
              ) : null}
              <p className="mt-2 max-w-xl text-sm text-white/80 sm:text-base">
                Dane konta, portfel, zdjęcie i statystyki z ostatnich meczów.
              </p>
              {photoActions}
              <p className="mt-2 text-xs text-white/65">JPG, PNG, WebP lub GIF, do 2 MB.</p>
            </div>
          </div>
        </section>

        <div className="relative z-10 mx-auto w-full min-w-0 max-w-6xl space-y-6 px-3 py-8 xs:px-4 sm:py-10">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
            <MarketplaceSection
              icon={Pencil}
              title="Dane i awatar"
              description="Logowanie odbywa się po imieniu, nazwisku i wybranym piłkarzu — po zmianie nadal jesteś zalogowany."
            >
              {profileForm}
            </MarketplaceSection>

            <div className="space-y-6">
              <MarketplaceSection
                icon={Wallet}
                title="Portfel"
                description="Podgląd salda — doładowania i opłaty meczów są na stronie Płatności."
              >
                {walletBlock}
              </MarketplaceSection>
              <AndroidAppVersionCard />
            </div>
          </div>

          <PhotoPanel
            src={MARKETPLACE_PITCH_PHOTOS[0]}
            className="min-h-[8rem] rounded-3xl"
            contentClassName="flex min-h-[8rem] flex-col justify-end p-5 sm:p-6"
            sizes="(max-width: 768px) 100vw, 1152px"
          >
            <p className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-white/80">Podsumowanie</p>
            <h2 className="mt-1 text-2xl font-black text-white">Twoje liczby</h2>
            <p className="mt-1 max-w-lg text-sm text-white/85">
              Szybki wgląd — pełna tabela jest w{" "}
              <Link href="/statystyki" className="font-bold text-white underline underline-offset-2">
                Statystykach
              </Link>
              .
            </p>
          </PhotoPanel>
          <div className={mpSectionCardClass}>{summaryGrid}</div>

          <MarketplaceSection
            title="Statystyki z meczów"
            description="Możesz dodać lub poprawić wpis do 7 dni po dacie meczu. Później zmiany wykona wyłącznie admin."
          >
            {matchStatsSection}
          </MarketplaceSection>

          <MarketplaceSection
            title="Twoja ostatnia aktywność"
            description="Chronologia tego, co robiłeś na stronie (np. logowanie, zapisy, mecze)."
          >
            {activitySection}
          </MarketplaceSection>

          <section className="rounded-3xl border border-dashed border-zinc-300 bg-zinc-50 p-6 dark:border-zinc-700 dark:bg-zinc-900/40">
            <h2 className="text-lg font-black tracking-tight text-zinc-950 dark:text-white sm:text-xl">Skrót do strony</h2>
            {shortcuts}
          </section>
        </div>

        {statsModal}
      </div>
    );
  }

  return (
    <div className="awp-page awp-page--default">
      <PitchPageHero
        title="Mój profil"
        subtitle="Dane konta, portfel, zdjęcie, awatar z listy oraz statystyki z ostatnich meczów (edycja i uzupełnianie przez 7 dni od daty meczu)."
      />

      <div className="mx-auto mt-10 grid gap-6 lg:grid-cols-[minmax(0,280px)_1fr]">
        <div className="awp-card-surface">
          <div className="flex flex-col items-center text-center">
            <div className="relative shrink-0 overflow-hidden rounded-full border-4 border-emerald-200/90 shadow-inner ring-2 ring-emerald-900/10">
              <PlayerAvatar
                photoPath={u.profile_photo_path}
                firstName={firstName}
                lastName={lastName}
                size="profile"
                ringClassName="ring-0"
              />
              {uploadingPhoto ? (
                <InlinePreloader layout="overlay" immediate label="Zapisywanie zdjęcia…" />
              ) : null}
            </div>
            <div className="mt-3 w-full max-w-[240px]">
              <PlayerNameStack
                className="text-center"
                firstName={firstName}
                lastName={lastName}
                nick={zawodnik}
                primaryClassName="text-base font-semibold text-white"
                secondaryClassName="text-sm text-emerald-100/85"
              />
            </div>
            {photoActions}
            <p className="mt-3 text-xs text-emerald-100/75">JPG, PNG, WebP lub GIF, do 2 MB.</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="awp-card-surface">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                <Pencil className="h-5 w-5 text-[var(--mundial-gold,#f5c518)]" />
                Dane i awatar (lista)
              </h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Logowanie odbywa się po imieniu, nazwisku i wybranym piłkarzu — po zmianie tych danych nadal jesteś
                zalogowany.
              </p>
              {profileForm}
            </div>
          </div>

          <AndroidAppVersionCard />

          <div className="awp-card-surface">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                <Wallet className="h-5 w-5 text-[var(--mundial-gold,#f5c518)]" />
                Portfel
              </h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Podgląd salda — doładowania i opłaty meczów są na stronie Płatności.
              </p>
              {walletBlock}
            </div>
          </div>

          <div className="pitch-card home-pitch-tile-gold p-5 sm:p-6">
            <div>
              <h2 className="text-lg font-bold text-white">Podsumowanie</h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Szybki wgląd — pełna tabela jest w{" "}
                <Link href="/statystyki" className="font-semibold text-emerald-800 underline-offset-2 hover:underline">
                  Statystykach
                </Link>
                .
              </p>
              {summaryGrid}
            </div>
          </div>
        </div>
      </div>

      <section className="awp-card-surface mx-auto mt-10 max-w-5xl">
        <div>
          <h2 className="text-lg font-bold text-white">Statystyki z meczów</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Możesz dodać lub poprawić wpis do <strong>7 dni po dacie meczu</strong>. Później zmiany wykona wyłącznie
            admin.
          </p>
          {matchStatsSection}
        </div>
      </section>

      <section className="awp-card-surface mx-auto mt-10 max-w-5xl">
        <div>
          <h2 className="text-lg font-bold text-white">Twoja ostatnia aktywność</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Chronologia tego, co robiłeś na stronie (np. logowanie, zapisy, mecze).
          </p>
          {activitySection}
        </div>
      </section>

      <section className="relative mx-auto mt-10 max-w-5xl rounded-2xl border border-dashed border-emerald-300/80 bg-emerald-50/40 p-6 dark:border-emerald-700/50 dark:bg-emerald-950/25">
        <h2 className="text-base font-bold text-emerald-950 dark:text-emerald-100">Skrót do strony</h2>
        {shortcuts}
      </section>

      {statsModal}
    </div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
  muted,
  light,
}: {
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  value: string | number;
  muted?: boolean;
  light?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-3 shadow-sm",
        light
          ? "border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/70"
          : "border-emerald-100/90 bg-white/90 dark:border-emerald-800/50 dark:bg-zinc-800/60",
        muted && "opacity-70"
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2",
          light ? "text-[var(--mp-teal-dark)]" : "text-emerald-800 dark:text-emerald-300"
        )}
      >
        <Icon className="h-4 w-4 shrink-0" strokeWidth={2.2} />
        <span
          className={cn(
            "text-[0.65rem] font-bold uppercase leading-tight tracking-wide",
            light ? "text-zinc-600 dark:text-zinc-300" : "text-emerald-900/85 dark:text-emerald-200/90"
          )}
        >
          {label}
        </span>
      </div>
      <p
        className={cn(
          "mt-1.5 text-xl font-bold tabular-nums",
          light ? "text-zinc-950 dark:text-white" : "text-emerald-950 dark:text-emerald-100"
        )}
      >
        {value}
      </p>
    </div>
  );
}
