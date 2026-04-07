"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ComponentType } from "react";
import { toast } from "sonner";
import {
  Activity,
  Camera,
  Pencil,
  Route,
  Share2,
  Shield,
  Target,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { PhotoDevelopPreloader } from "@/components/preloaders";
import { PlayerAvatar, PlayerNameStack } from "@/components/player-avatar";
import type { ProfileDashboard } from "@/lib/profile-data";
import { cn } from "@/lib/utils";

type Props = { initial: ProfileDashboard };

export function ProfilClient({ initial }: Props) {
  const router = useRouter();
  const [data, setData] = useState<ProfileDashboard>(initial);
  const [firstName, setFirstName] = useState(initial.user.first_name);
  const [lastName, setLastName] = useState(initial.user.last_name);
  const [zawodnik, setZawodnik] = useState(initial.user.zawodnik);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);

  const [statsOpen, setStatsOpen] = useState(false);
  const [statsCtx, setStatsCtx] = useState<{
    match_id: number;
    survey_key?: string;
    label: string;
    goals: string;
    assists: string;
    distance: string;
    saves: string;
  } | null>(null);

  const playerOptions = useMemo(() => {
    const set = new Set([...data.available_players, data.user.zawodnik]);
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pl"));
  }, [data.available_players, data.user.zawodnik]);

  async function reloadDashboard() {
    const res = await fetch("/api/profile");
    if (!res.ok) return;
    const json = (await res.json()) as ProfileDashboard;
    setData(json);
    setFirstName(json.user.first_name);
    setLastName(json.user.last_name);
    setZawodnik(json.user.zawodnik);
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
    opts?: { blankDefaults?: boolean; surveyKey?: string }
  ) {
    const blank = opts?.blankDefaults === true;
    setStatsCtx({
      match_id,
      survey_key: opts?.surveyKey,
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
    if (statsCtx.survey_key) {
      fd.set("survey_key", statsCtx.survey_key);
    } else {
      fd.set("match_id", String(statsCtx.match_id));
    }
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

  return (
    <div className="container mx-auto max-w-5xl flex-1 px-4 py-8 sm:py-10">
      <div className="pitch-rule mx-auto mb-5 w-40 sm:w-48" />
      <h1 className="text-center text-3xl font-bold tracking-tight text-emerald-950 sm:text-4xl">Mój profil</h1>
      <p className="mx-auto mt-3 max-w-2xl text-center text-base text-zinc-600">
        Dane konta, zdjęcie, awatar z listy oraz statystyki z ostatnich meczów (edycja i uzupełnianie przez{" "}
        <strong>7 dni</strong> od daty meczu).
      </p>

      <div className="mx-auto mt-10 grid gap-6 lg:grid-cols-[minmax(0,280px)_1fr]">
        <div className="relative overflow-hidden rounded-2xl border-2 border-white/35 bg-white/95 p-6 shadow-lg shadow-emerald-950/10 ring-1 ring-emerald-950/10">
          <div className="home-pitch-tile pointer-events-none absolute inset-0 opacity-[0.12]" aria-hidden />
          <div className="relative flex flex-col items-center text-center">
            <div className="relative shrink-0 overflow-hidden rounded-full border-4 border-emerald-200/90 shadow-inner ring-2 ring-emerald-900/10">
              <PlayerAvatar
                photoPath={u.profile_photo_path}
                firstName={firstName}
                lastName={lastName}
                size="profile"
                ringClassName="ring-0"
              />
              {uploadingPhoto ? <PhotoDevelopPreloader /> : null}
            </div>
            <div className="mt-3 w-full max-w-[240px]">
              <PlayerNameStack
                className="text-center"
                firstName={firstName}
                lastName={lastName}
                nick={zawodnik}
                primaryClassName="text-base font-semibold text-emerald-950"
                secondaryClassName="text-sm text-zinc-600"
              />
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button type="button" variant="secondary" size="sm" disabled={uploadingPhoto} asChild>
                <label className="cursor-pointer">
                  <Camera className="mr-1.5 h-4 w-4" />
                  {uploadingPhoto ? "Przetwarzanie…" : "Wgraj zdjęcie"}
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={onPhotoChange} />
                </label>
              </Button>
              {u.profile_photo_path ? (
                <Button type="button" variant="outline" size="sm" disabled={uploadingPhoto} onClick={removePhoto}>
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  Usuń
                </Button>
              ) : null}
            </div>
            <p className="mt-3 text-xs text-zinc-500">JPG, PNG, WebP lub GIF, do 2 MB.</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="relative overflow-hidden rounded-2xl border-2 border-white/35 bg-white/95 p-6 shadow-lg shadow-emerald-950/10 ring-1 ring-emerald-950/10">
            <div className="home-pitch-tile pointer-events-none absolute inset-0 opacity-[0.08]" aria-hidden />
            <div className="relative">
              <h2 className="flex items-center gap-2 text-lg font-bold text-emerald-950">
                <Pencil className="h-5 w-5 text-emerald-700" />
                Dane i awatar (lista)
              </h2>
              <p className="mt-1 text-sm text-zinc-600">
                Logowanie odbywa się po imieniu, nazwisku i wybranym piłkarzu — po zmianie tych danych nadal jesteś zalogowany.
              </p>
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
                        !editingProfile && "cursor-default border-emerald-100/90 bg-zinc-50/80 text-emerald-950"
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
                        !editingProfile && "cursor-default border-emerald-100/90 bg-zinc-50/80 text-emerald-950"
                      )}
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label>Piłkarz (postać na stronie)</Label>
                  <Select value={zawodnik} onValueChange={setZawodnik} disabled={!editingProfile}>
                    <SelectTrigger
                      className={cn(
                        "mt-1",
                        !editingProfile && "cursor-default border-emerald-100/90 bg-zinc-50/80 opacity-100"
                      )}
                    >
                      <SelectValue placeholder="Wybierz" />
                    </SelectTrigger>
                    <SelectContent>
                      {playerOptions.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-wrap gap-2">
                  {editingProfile ? (
                    <>
                      <Button type="button" disabled={savingProfile} onClick={() => void saveProfile()}>
                        {savingProfile ? "Zapisywanie…" : "Zapisz edycje"}
                      </Button>
                      <Button type="button" variant="outline" disabled={savingProfile} onClick={cancelProfileEdit}>
                        Anuluj
                      </Button>
                    </>
                  ) : (
                    <Button
                      type="button"
                      onClick={() => {
                        window.setTimeout(() => setEditingProfile(true), 0);
                      }}
                    >
                      Edytuj
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border-2 border-white/35 bg-white/95 p-6 shadow-lg shadow-emerald-950/10 ring-1 ring-emerald-950/10">
            <div className="home-pitch-tile-gold pointer-events-none absolute inset-0 opacity-[0.1]" aria-hidden />
            <div className="relative">
              <h2 className="text-lg font-bold text-emerald-950">Podsumowanie</h2>
              <p className="mt-1 text-sm text-zinc-600">
                Szybki wgląd — pełna tabela jest w{" "}
                <Link href="/statystyki" className="font-semibold text-emerald-800 underline-offset-2 hover:underline">
                  Statystykach
                </Link>
                .
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <MiniStat icon={Activity} label="Mecze ze statystykami" value={data.summary.matches_with_stats} />
                <MiniStat icon={Target} label="Gole" value={data.summary.goals} />
                <MiniStat icon={Share2} label="Asysty" value={data.summary.assists} />
                <MiniStat icon={Route} label="Dystans (km)" value={data.summary.distance_km.toFixed(1)} />
                <MiniStat icon={Shield} label="Obrony" value={data.summary.saves} />
                <MiniStat
                  icon={Activity}
                  label="Brak statystyk"
                  value={data.summary.missing_stats_count}
                  muted={data.summary.missing_stats_count === 0}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="relative mx-auto mt-10 max-w-5xl overflow-hidden rounded-2xl border-2 border-white/35 bg-white/95 p-6 shadow-lg shadow-emerald-950/10 ring-1 ring-emerald-950/10">
        <div className="home-pitch-tile pointer-events-none absolute inset-0 opacity-[0.06]" aria-hidden />
        <div className="relative">
          <h2 className="text-lg font-bold text-emerald-950">Statystyki z meczów</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Możesz dodać lub poprawić wpis do <strong>7 dni po dacie meczu</strong>. Później zmiany wykona wyłącznie admin.
          </p>

          {data.matches_missing_stats.length > 0 ? (
            <div className="mt-5">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-emerald-900/90">Do uzupełnienia</h3>
              <ul className="mt-2 space-y-2">
                {data.matches_missing_stats.map((m) => (
                  <li
                    key={m.match_id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200/80 bg-amber-50/50 px-3 py-2.5"
                  >
                    <span className="text-sm text-emerald-950">
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
                  key={s.survey_key ?? `stat-${s.stat_id}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-100/90 bg-emerald-50/35 px-3 py-2.5"
                >
                  <div className="min-w-0 text-sm text-emerald-950">
                    <span className="font-medium">{s.match_date}</span> · {s.match_time} — {s.location}
                    <span className="mt-0.5 block text-xs text-zinc-600">
                      Gole {s.goals} · Asysty {s.assists} · km {s.distance.toFixed(1)} · Obrony {s.saves ?? 0}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {!s.can_edit ? (
                      <Badge variant="outline" className="font-normal text-zinc-600">
                        Zablokowane (było do {s.edit_deadline})
                      </Badge>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          openStatsEditor(
                            s.match_id,
                            `${s.match_date} · ${s.location}`,
                            s.goals,
                            s.assists,
                            s.distance,
                            s.saves ?? 0,
                            s.survey_key ? { surveyKey: s.survey_key } : undefined
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
            <p className="relative mt-4 text-sm text-zinc-600">Brak rozegranych meczów ze statystykami.</p>
          ) : null}
        </div>
      </section>

      <section className="relative mx-auto mt-10 max-w-5xl overflow-hidden rounded-2xl border-2 border-white/35 bg-white/95 p-6 shadow-lg shadow-emerald-950/10 ring-1 ring-emerald-950/10">
        <div className="home-pitch-tile pointer-events-none absolute inset-0 opacity-[0.05]" aria-hidden />
        <div className="relative">
          <h2 className="text-lg font-bold text-emerald-950">Twoja ostatnia aktywność</h2>
          <p className="mt-1 text-sm text-zinc-600">Chronologia tego, co robiłeś na stronie (np. logowanie, zapisy, mecze).</p>
          {data.recent_activity.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500">Brak wpisów.</p>
          ) : (
            <ul className="mt-4 space-y-2 border-t border-emerald-100/80 pt-4">
              {data.recent_activity.map((a, i) => (
                <li key={i} className="text-sm text-zinc-700">
                  <span className="text-xs tabular-nums text-zinc-400">{a.timestamp}</span>
                  <span className="mt-0.5 block text-emerald-950">{a.action}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="relative mx-auto mt-10 max-w-5xl rounded-2xl border border-dashed border-emerald-300/80 bg-emerald-50/40 p-6">
        <h2 className="text-base font-bold text-emerald-950">Skrót do strony</h2>
        <ul className="mt-3 list-inside list-disc space-y-1.5 text-sm text-zinc-700">
          <li>
            <Link href="/terminarz" className="font-medium text-emerald-800 underline-offset-2 hover:underline">
              Terminarz
            </Link>{" "}
            — zapisy na mecze
          </li>
          <li>
            <Link href="/rankingi" className="font-medium text-emerald-800 underline-offset-2 hover:underline">
              Rankingi
            </Link>
          </li>
          <li>
            <Link href="/pilkarze" className="font-medium text-emerald-800 underline-offset-2 hover:underline">
              Piłkarze
            </Link>{" "}
            — jak widzą Cię inni
          </li>
        </ul>
      </section>

      <Dialog open={statsOpen} onOpenChange={setStatsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Statystyki meczu</DialogTitle>
            <DialogDescription>{statsCtx?.label}</DialogDescription>
          </DialogHeader>
          {statsCtx ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="st_g">Gole</Label>
                <Input
                  id="st_g"
                  type="number"
                  min={0}
                  value={statsCtx.goals}
                  onChange={(e) => setStatsCtx({ ...statsCtx, goals: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="st_a">Asysty</Label>
                <Input
                  id="st_a"
                  type="number"
                  min={0}
                  value={statsCtx.assists}
                  onChange={(e) => setStatsCtx({ ...statsCtx, assists: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="st_d">Dystans (km)</Label>
                <Input
                  id="st_d"
                  type="number"
                  min={0}
                  step="0.1"
                  value={statsCtx.distance}
                  onChange={(e) => setStatsCtx({ ...statsCtx, distance: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="st_s">Obronione strzały</Label>
                <Input
                  id="st_s"
                  type="number"
                  min={0}
                  value={statsCtx.saves}
                  onChange={(e) => setStatsCtx({ ...statsCtx, saves: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
          ) : null}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setStatsOpen(false)}>
              Anuluj
            </Button>
            <Button type="button" onClick={submitStats}>
              Zapisz
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
  muted,
}: {
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  value: string | number;
  muted?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-emerald-100/90 bg-white/90 px-3 py-3 shadow-sm ${muted ? "opacity-70" : ""}`}
    >
      <div className="flex items-center gap-2 text-emerald-800">
        <Icon className="h-4 w-4 shrink-0" strokeWidth={2.2} />
        <span className="text-[0.65rem] font-bold uppercase leading-tight tracking-wide text-emerald-900/85">{label}</span>
      </div>
      <p className="mt-1.5 text-xl font-bold tabular-nums text-emerald-950">{value}</p>
    </div>
  );
}
