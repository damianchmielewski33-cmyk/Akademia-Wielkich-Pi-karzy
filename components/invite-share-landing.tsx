"use client";

import { useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import Link from "next/link";
import {
  Calendar,
  CalendarDays,
  Clock,
  HelpCircle,
  KeyRound,
  Loader2,
  LogIn,
  MapPin,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "@/lib/app-toast";
import { z } from "zod";
import type { MatchRow } from "@/lib/db";
import type { PlayersDataEntry } from "@/lib/terminarz-shared";
import { LoginForm } from "@/components/login-form";
import { MarketplacePitchPhoto } from "@/components/marketplace-pitch-photo";
import { MatchLocationWeather } from "@/components/match-location-weather";
import { MatchSignupsRosterModal } from "@/components/match-signups-roster-modal";
import { MatchSignupCountsBlock } from "@/components/terminarz-match-counts";
import { PayButton } from "@/components/pay-button";
import { PhotoPanel } from "@/components/photo-panel";
import { SiteAssetImage } from "@/components/site-asset-image";
import { SiteSectionHero } from "@/components/site-section-hero";
import { useSiteMode } from "@/components/site-mode";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/ui/form-field";
import { formSchemas, useValidatedForm } from "@/lib/form-validation";
import { MARKETPLACE_PITCH_PHOTOS, pitchPhotoAt } from "@/lib/marketplace-photos";
import { terminarzInviteRelativePath } from "@/lib/share-link";
import { cn } from "@/lib/utils";

const guestSchema = z.object({
  guestFirst: formSchemas.requiredName("Imię"),
  guestLast: formSchemas.requiredName("Nazwisko"),
  guestAlias: formSchemas.playerAlias,
});

function formatMatchWhen(isoDate: string, time: string) {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) {
    return { label: `${isoDate} · ${time}`, weekday: "" };
  }
  const dt = new Date(y, m - 1, d);
  const weekday = dt.toLocaleDateString("pl-PL", { weekday: "long" });
  const label = `${String(d).padStart(2, "0")}.${String(m).padStart(2, "0")}.${y}`;
  return { label, weekday, time };
}

function slotMeta(signed: number, max: number) {
  const pct = max > 0 ? Math.min(100, (signed / max) * 100) : 0;
  const free = Math.max(0, max - signed);
  if (max <= 0) return { pct, free, tone: "ok" as const };
  if (signed >= max) return { pct, free, tone: "full" as const };
  if (pct >= 80) return { pct, free, tone: "warn" as const };
  return { pct, free, tone: "ok" as const };
}

function InvitePhotoAction({
  src,
  title,
  desc,
  icon: Icon,
  onClick,
  href,
  disabled,
  busy,
}: {
  src: string;
  title: string;
  desc?: string;
  icon?: ComponentType<{ className?: string }>;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  busy?: boolean;
}) {
  const inner = (
    <PhotoPanel
      src={src}
      className={cn(
        "min-h-[12rem] transition",
        !disabled && "hover:-translate-y-0.5 hover:shadow-xl",
        disabled && "opacity-60"
      )}
      contentClassName="flex min-h-[12rem] items-end justify-between gap-3 p-5"
      overlayClassName="bg-gradient-to-t from-black/75 via-black/30 to-black/10"
      sizes="(max-width: 768px) 100vw, 400px"
    >
      <div className="min-w-0">
        <p className="font-black text-white drop-shadow-sm">{title}</p>
        {desc ? <p className="mt-1 text-sm text-white/85">{desc}</p> : null}
      </div>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/30">
        {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : Icon ? <Icon className="h-5 w-5" /> : null}
      </span>
    </PhotoPanel>
  );

  if (href && !disabled) {
    return (
      <Link href={href} className="block">
        {inner}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className="w-full text-left disabled:cursor-not-allowed"
      disabled={disabled || busy}
      onClick={onClick}
    >
      {inner}
    </button>
  );
}

function InviteFormPanel({
  src,
  kicker,
  title,
  subtitle,
  onBack,
  children,
}: {
  src: string;
  kicker: string;
  title: string;
  subtitle: string;
  onBack: () => void;
  children: ReactNode;
}) {
  return (
    <PhotoPanel
      src={src}
      className="min-h-[18rem]"
      contentClassName="p-5 sm:p-6"
      overlayClassName="bg-gradient-to-t from-black/80 via-black/50 to-black/20"
      sizes="(max-width: 768px) 100vw, 720px"
    >
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/80">{kicker}</p>
      <h2 className="mt-2 text-2xl font-black tracking-tight text-white drop-shadow-sm sm:text-3xl">{title}</h2>
      <p className="mt-2 text-sm text-white/85">{subtitle}</p>
      <button
        type="button"
        className="mt-3 text-left text-sm font-semibold text-white underline-offset-2 hover:underline"
        onClick={onBack}
      >
        ← Wróć
      </button>
      <div className="mt-4 rounded-2xl bg-white/95 p-4 text-zinc-900 shadow-lg">{children}</div>
    </PhotoPanel>
  );
}

export function InviteMatchCard({
  match,
  playersData,
  showGatePin = false,
  onViewRoster,
}: {
  match: MatchRow;
  playersData: Record<number, PlayersDataEntry>;
  showGatePin?: boolean;
  onViewRoster?: () => void;
}) {
  const when = formatMatchWhen(match.match_date, match.match_time);
  const slots = slotMeta(match.signed_up, match.max_slots);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(match.location)}`;
  const gatePin = match.gate_pin?.trim() ?? "";
  const src = pitchPhotoAt(match.id);
  const barClass =
    slots.tone === "full" ? "bg-red-400/90" : slots.tone === "warn" ? "bg-amber-400/90" : "bg-emerald-100";

  return (
    <PhotoPanel
      src={src}
      className="min-h-[22rem]"
      contentClassName="flex h-full flex-col p-5 sm:p-6"
      overlayClassName="bg-gradient-to-t from-black/80 via-black/50 to-black/25"
      sizes="(max-width: 768px) 100vw, 720px"
      priority
    >
      <section aria-labelledby="invite-match-heading">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/80">Zaproszenie na mecz</p>
        <div className="mt-3 flex items-start justify-between gap-3">
          <div>
            <h2 id="invite-match-heading" className="text-2xl font-black tracking-tight text-white drop-shadow-sm sm:text-3xl">
              {when.weekday ? <span className="capitalize">{when.weekday}</span> : "Najbliższy mecz"}
            </h2>
            <p className="mt-1 text-sm text-white/85">
              {when.label} · {match.match_time}
            </p>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/90 ring-2 ring-white/40">
            <SiteAssetImage
              asset="logo_crest"
              alt=""
              width={128}
              height={128}
              className="h-10 w-10 drop-shadow"
              sizes="40px"
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-100 px-3 py-2 text-sm font-semibold tabular-nums text-emerald-950 shadow-md shadow-emerald-950/20">
            <Calendar className="h-3.5 w-3.5 text-emerald-800" aria-hidden />
            {when.label}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-100 px-3 py-2 text-sm font-semibold tabular-nums text-emerald-950 shadow-md shadow-emerald-950/20">
            <Clock className="h-3.5 w-3.5 text-emerald-800" aria-hidden />
            {match.match_time}
          </span>
        </div>

        <div className="mt-4 flex items-start gap-2 text-sm text-white">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--mundial-gold,#f5c518)]" aria-hidden />
          <div className="min-w-0">
            <p className="font-medium leading-snug drop-shadow-sm">{match.location}</p>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block text-xs font-semibold text-white/80 underline decoration-white/30 underline-offset-2 hover:text-white"
            >
              Otwórz miejsce w Mapach Google
            </a>
          </div>
        </div>

        <div className="mt-5 rounded-xl bg-black/25 p-3.5 ring-1 ring-white/15">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/80">Skład</p>
          <div className="mt-2 flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wider text-white/80">
            <span>
              {match.signed_up}/{match.max_slots} zapisanych
            </span>
            {slots.tone === "full" ? (
              <span className="text-red-200">Pełny skład</span>
            ) : slots.free > 0 ? (
              <span className="normal-case tracking-normal text-white/80">
                {slots.free} {slots.free === 1 ? "miejsce" : slots.free < 5 ? "miejsca" : "miejsc"}
              </span>
            ) : null}
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/20">
            <div
              className={cn("h-full rounded-full transition-[width] duration-500", barClass)}
              style={{ width: `${slots.pct}%` }}
              role="progressbar"
              aria-valuenow={match.signed_up}
              aria-valuemin={0}
              aria-valuemax={match.max_slots}
              aria-label={`Zapełnienie składu: ${match.signed_up} z ${match.max_slots}`}
            />
          </div>
          <div className="mt-3">
            <MatchSignupCountsBlock
              matchId={match.id}
              signedUp={match.signed_up}
              maxSlots={match.max_slots}
              playersData={playersData}
              variant="card"
              tone="zinc"
            />
          </div>
          {onViewRoster ? (
            <Button type="button" variant="gold" className="mt-3 w-full gap-2" onClick={onViewRoster}>
              <Users className="h-4 w-4 shrink-0" aria-hidden />
              Zobacz kto jest zapisany
            </Button>
          ) : null}
        </div>

        <div className="mt-4">
          <MatchLocationWeather
            location={match.location}
            matchDate={match.match_date}
            className="mx-auto mt-0 max-w-none border-t-0 pt-0 text-white"
          />
        </div>

        {gatePin && showGatePin ? (
          <div className="mt-4 flex items-center gap-3 rounded-xl bg-black/25 p-3.5 ring-1 ring-white/15">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 ring-2 ring-white/35">
              <KeyRound className="h-5 w-5 text-[var(--mundial-gold,#f5c518)]" strokeWidth={2.25} aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-white/75">Wejście na boisko</p>
              <p className="font-mono text-2xl font-bold tabular-nums tracking-[0.2em] text-white drop-shadow-sm">
                {gatePin}
              </p>
              <p className="mt-1 text-xs text-white/80">PIN do bramy przy tym meczu.</p>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-white/85">Zapisz się, żeby potwierdzić udział i ogarnąć transport.</p>
        )}
      </section>
    </PhotoPanel>
  );
}

type InviteShareLandingProps = {
  highlightMatchId: number;
  match: MatchRow | null;
  playersData: Record<number, PlayersDataEntry>;
  isLoggedIn: boolean;
  userSignupKind: Record<number, "tentative" | "confirmed" | "declined">;
  inviteLoginInline: boolean;
  setInviteLoginInline: (v: boolean) => void;
  inviteGuestInline: boolean;
  setInviteGuestInline: (v: boolean) => void;
  onGuestSignedUp?: () => void;
  tentativeBusy: boolean;
  onParticipationTak: () => void;
  onParticipationTentative: () => void | Promise<void>;
  onParticipationNie: () => void | Promise<void>;
  onAuthenticated: () => void;
  hotpayEnabled?: boolean;
  walletBalancePln?: number | null;
  debtBusy?: boolean;
  onPayDebt?: () => void;
};

export function InviteShareLanding({
  highlightMatchId,
  match,
  playersData,
  isLoggedIn,
  userSignupKind,
  inviteLoginInline,
  setInviteLoginInline,
  inviteGuestInline,
  setInviteGuestInline,
  onGuestSignedUp,
  tentativeBusy,
  onParticipationTak,
  onParticipationTentative,
  onParticipationNie,
  onAuthenticated,
  hotpayEnabled = false,
  walletBalancePln = null,
  debtBusy = false,
  onPayDebt,
}: InviteShareLandingProps) {
  const { marketplaceEnabled } = useSiteMode();
  const signupToastShownRef = useRef(false);
  const [rosterOpen, setRosterOpen] = useState(false);
  const [guestBusy, setGuestBusy] = useState(false);
  const guestForm = useValidatedForm({
    initialValues: { guestFirst: "", guestLast: "", guestAlias: "" },
    schema: guestSchema,
  });
  const today = new Date().toISOString().slice(0, 10);
  const matchFuture = match != null && match.match_date >= today;
  const signupKind = userSignupKind[highlightMatchId];
  const matchFull = match != null && match.signed_up >= match.max_slots;
  const heroPhoto = pitchPhotoAt(match?.id ?? highlightMatchId);

  function resetGuestForm() {
    guestForm.reset({ guestFirst: "", guestLast: "", guestAlias: "" });
  }

  function showLoginInline() {
    setInviteGuestInline(false);
    resetGuestForm();
    setInviteLoginInline(true);
  }

  function showGuestInline() {
    setInviteLoginInline(false);
    setInviteGuestInline(true);
  }

  function backToAuthChoices() {
    setInviteLoginInline(false);
    setInviteGuestInline(false);
    resetGuestForm();
  }

  function openGuestPayPrompt() {
    if (!match || !guestForm.validate()) return;
    void submitGuestSignup();
  }

  async function submitGuestSignup() {
    if (!match || !guestForm.validate()) return;
    const { guestFirst, guestLast, guestAlias } = guestForm.values;
    setGuestBusy(true);
    try {
      const res = await fetch(`/api/zaproszenie/${highlightMatchId}/guest-signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: guestFirst.trim(),
          last_name: guestLast.trim(),
          player_alias: guestAlias.trim(),
          pay: false,
          return_path: `/zaproszenie/${highlightMatchId}`,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Nie udało się zapisać gościa");
        return;
      }

      toast.success("Gość zapisany na mecz");
      resetGuestForm();
      setInviteGuestInline(false);
      onGuestSignedUp?.();
    } finally {
      setGuestBusy(false);
    }
  }

  useEffect(() => {
    if (!isLoggedIn || signupToastShownRef.current || !matchFuture) return;
    signupToastShownRef.current = true;
    if (signupKind === "confirmed") {
      toast.info("Jesteś już zapisany na ten mecz.");
    } else if (signupKind === "tentative") {
      toast.info("Masz już status «jeszcze nie wiem». Potwierdź udział poniżej lub w terminarzu.");
    } else if (signupKind === "declined") {
      toast.info("Masz już zaznaczone «nie biorę udziału». Zmień to poniżej, jeśli chcesz grać.");
    }
  }, [isLoggedIn, matchFuture, signupKind]);

  const registerHref =
    highlightMatchId != null
      ? `/register?next=${encodeURIComponent(terminarzInviteRelativePath(highlightMatchId))}`
      : "/register";

  return (
    <div
      className={
        marketplaceEnabled
          ? "relative flex flex-1 flex-col text-zinc-900 dark:text-zinc-50"
          : "awp-page awp-page--default"
      }
    >
      {marketplaceEnabled ? (
        <>
      <section className="mp-hero mp-hero--photo relative flex flex-col justify-end overflow-hidden pb-16 pt-16 sm:pb-20 sm:pt-24">
        <MarketplacePitchPhoto src={heroPhoto} priority className="z-0" />
        <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black/75 via-black/40 to-black/20" />
        <div className="relative z-10 mx-auto w-full max-w-6xl px-4">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-white/80">Zaproszenie</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-black tracking-tight text-white sm:text-6xl">Gramy razem.</h1>
          <p className="mt-4 max-w-xl text-base text-white/85 sm:text-lg">
            Potwierdź udział, zaloguj się albo zapisz się jednorazowo jako gość.
          </p>
        </div>
      </section>

      <div className="-mx-4 mt-0 flex gap-4 overflow-x-auto bg-zinc-100 px-4 py-4 [scrollbar-width:thin] dark:bg-zinc-900">
        {MARKETPLACE_PITCH_PHOTOS.slice(0, 8).map((src) => (
          <div key={src} className="relative h-48 w-72 shrink-0 overflow-hidden rounded-3xl bg-zinc-200">
            <MarketplacePitchPhoto src={src} sizes="288px" />
          </div>
        ))}
        </div>
          </>
        ) : (
          <SiteSectionHero
            variant="stadium"
            kicker="Zaproszenie"
            title="Zapis na mecz"
            subtitle="Potwierdź udział, zaloguj się albo zapisz się jednorazowo jako gość."
            align="center"
          />
        )}

      <div
        className={
          marketplaceEnabled
            ? "relative z-10 mx-auto w-full min-w-0 max-w-6xl px-4 py-10 sm:py-12"
            : "relative z-10 mt-6 space-y-4"
        }
      >
        {!match ? (
          <PhotoPanel
            src={pitchPhotoAt(3)}
            className="min-h-[12rem]"
            contentClassName="flex min-h-[12rem] flex-col justify-end p-6"
          >
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/80">Zaproszenie</p>
            <h2 className="mt-2 text-2xl font-black text-white drop-shadow-sm">Nie znaleziono meczu</h2>
            <p className="mt-2 text-sm text-white/85">
              Nie znaleziono meczu o tym numerze — mógł zostać usunięty z terminarza.
            </p>
          </PhotoPanel>
        ) : !matchFuture ? (
          <PhotoPanel
            src={pitchPhotoAt(match.id)}
            className="min-h-[12rem]"
            contentClassName="flex min-h-[12rem] flex-col justify-end p-6"
          >
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/80">Terminarz</p>
            <h2 className="mt-2 text-2xl font-black text-white drop-shadow-sm">Ten termin już minął</h2>
            <p className="mt-2 text-sm text-white/85">
              Sprawdź aktualny terminarz, aby zapisać się na kolejne mecze.
            </p>
          </PhotoPanel>
        ) : (
          <>
            <div className="flex items-end justify-between gap-4">
              {marketplaceEnabled ? (
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--mp-teal-dark)]">Terminarz</p>
                  <h2 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Zapis na mecz</h2>
                </div>
              ) : (
                <div />
              )}
              <Button asChild variant={marketplaceEnabled ? "outline" : "pitch"}>
                <Link href="/terminarz">Pełny terminarz</Link>
              </Button>
            </div>

            <div className="mt-6">
              <InviteMatchCard
                match={match}
                playersData={playersData}
                showGatePin={signupKind === "confirmed"}
                onViewRoster={() => setRosterOpen(true)}
              />
            </div>

            <MatchSignupsRosterModal
              open={rosterOpen}
              onOpenChange={setRosterOpen}
              match={match}
              matchId={highlightMatchId}
              playersData={playersData}
            />

            <div className="mt-8 space-y-4">
              {!isLoggedIn ? (
                inviteLoginInline ? (
                  <InviteFormPanel
                    src={pitchPhotoAt(match.id + 2)}
                    kicker="Akademia"
                    title="Logowanie"
                    subtitle="Wpisz imię, nazwisko i PIN (4–6 cyfr) — tak jak na stronie logowania."
                    onBack={backToAuthChoices}
                  >
                    <LoginForm
                      nextPath={terminarzInviteRelativePath(highlightMatchId)}
                      embedMode
                      onAuthenticated={onAuthenticated}
                    />
                  </InviteFormPanel>
                ) : inviteGuestInline ? (
                  <InviteFormPanel
                    src={pitchPhotoAt(match.id + 3)}
                    kicker="Zapis"
                    title="Zapis gościa na mecz"
                    subtitle="Gram jednorazowo — podaj dane i unikalny pseudonim. Gość nie loguje się do systemu; zapis dotyczy tylko tego terminu."
                    onBack={backToAuthChoices}
                  >
                    <div className="space-y-3">
                      <FormInput
                        id="invite-gfirst"
                        label="Imię"
                        required
                        value={guestForm.values.guestFirst}
                        onChange={(e) => guestForm.setValue("guestFirst", e.target.value)}
                        onBlur={() => guestForm.setFieldTouched("guestFirst")}
                        error={guestForm.errors.guestFirst}
                        disabled={guestBusy}
                      />
                      <FormInput
                        id="invite-glast"
                        label="Nazwisko"
                        required
                        value={guestForm.values.guestLast}
                        onChange={(e) => guestForm.setValue("guestLast", e.target.value)}
                        onBlur={() => guestForm.setFieldTouched("guestLast")}
                        error={guestForm.errors.guestLast}
                        disabled={guestBusy}
                      />
                      <FormInput
                        id="invite-galias"
                        label="Pseudonim (unikalny)"
                        required
                        value={guestForm.values.guestAlias}
                        onChange={(e) => guestForm.setValue("guestAlias", e.target.value)}
                        onBlur={() => guestForm.setFieldTouched("guestAlias")}
                        error={guestForm.errors.guestAlias}
                        disabled={guestBusy}
                      />
                      <Button
                        type="button"
                        variant="gold"
                        className="w-full gap-2"
                        disabled={guestBusy || matchFull}
                        onClick={() => openGuestPayPrompt()}
                      >
                        {guestBusy ? (
                          <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                        ) : (
                          <UserPlus className="h-4 w-4 shrink-0" aria-hidden />
                        )}
                        Zapisz się jako gość
                      </Button>
                      {matchFull ? (
                        <p className="text-center text-sm text-amber-800">
                          Skład jest pełny — nie można dodać kolejnego gościa.
                        </p>
                      ) : null}
                    </div>
                  </InviteFormPanel>
                ) : (
                  <>
                    <div>
                      {marketplaceEnabled ? (
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--mp-teal-dark)]">Zapis</p>
                      ) : null}
                      <h2
                        className={
                          marketplaceEnabled
                            ? "mt-1 text-2xl font-black tracking-tight sm:text-3xl"
                            : "mt-1 text-2xl font-black tracking-tight text-white drop-shadow-sm sm:text-3xl"
                        }
                      >
                        Czy grasz w tym terminie?
                      </h2>
                      <p
                        className={
                          marketplaceEnabled
                            ? "mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400"
                            : "mt-2 max-w-2xl text-sm text-white/80"
                        }
                      >
                        Zaloguj się albo załóż konto, żeby odpowiedzieć: tak, jeszcze nie wiem albo nie biorę udziału.
                        Możesz też zapisać się jednorazowo jako gość.
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <InvitePhotoAction
                        src={pitchPhotoAt(match.id + 4)}
                        title="Zaloguj się"
                        desc="PIN akademii — tak jak na starcie."
                        icon={LogIn}
                        onClick={showLoginInline}
                      />
                      <InvitePhotoAction
                        src={pitchPhotoAt(match.id + 5)}
                        title="Utwórz konto"
                        desc="Dołącz na stałe i zapisuj się na mecze."
                        icon={UserPlus}
                        href={registerHref}
                      />
                      <InvitePhotoAction
                        src={pitchPhotoAt(match.id + 6)}
                        title="Zapisz się jako gość"
                        desc="Jednorazowo na ten termin."
                        icon={UserPlus}
                        disabled={matchFull}
                        onClick={showGuestInline}
                      />
                    </div>
                    {matchFull ? (
                      <p className="text-sm text-amber-800 dark:text-amber-200">
                        Skład jest pełny — zapis gościa nie jest możliwy.
                      </p>
                    ) : null}
                  </>
                )
              ) : signupKind == null ? (
                <>
                  <PhotoPanel
                    src={pitchPhotoAt(match.id + 7)}
                    className="min-h-[14rem]"
                    contentClassName="flex min-h-[14rem] flex-col justify-end gap-4 p-5 sm:p-6"
                    overlayClassName="bg-gradient-to-t from-black/80 via-black/45 to-black/15"
                  >
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/80">Zapis na mecz</p>
                      <h2 className="mt-2 text-2xl font-black text-white drop-shadow-sm">Czy bierzesz udział?</h2>
                      <p className="mt-2 text-sm text-white/85">
                        Wybierz jedną opcję. Przy odpowiedzi tak (gdy są wolne miejsca) wybierzesz też transport.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="gold"
                      className="w-full"
                      disabled={tentativeBusy}
                      onClick={onParticipationTak}
                    >
                      {tentativeBusy ? <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" aria-hidden /> : null}
                      Tak, biorę udział
                    </Button>
                  </PhotoPanel>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <InvitePhotoAction
                      src={pitchPhotoAt(match.id + 8)}
                      title="Jeszcze nie wiem"
                      desc="Bez miejsca w składzie — potwierdzisz później."
                      icon={HelpCircle}
                      busy={tentativeBusy}
                      onClick={() => void onParticipationTentative()}
                    />
                    <InvitePhotoAction
                      src={pitchPhotoAt(match.id + 9)}
                      title="Nie biorę udziału"
                      desc="Zaznacz, jeśli w tym terminie nie grasz."
                      busy={tentativeBusy}
                      onClick={() => void onParticipationNie()}
                    />
                  </div>
                </>
              ) : (
                <PhotoPanel
                  src={pitchPhotoAt(match.id + 7)}
                  className="min-h-[14rem]"
                  contentClassName="flex min-h-[14rem] flex-col justify-end gap-4 p-5 sm:p-6"
                >
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/80">Twój status</p>
                    <h2 className="mt-2 text-2xl font-black text-white drop-shadow-sm">Twój status na ten mecz</h2>
                    <p className="mt-2 text-sm text-white/85">
                      {signupKind === "confirmed"
                        ? "Jesteś zapisany na ten mecz. Szczegóły i transport znajdziesz w terminarzu."
                        : signupKind === "tentative"
                          ? "Masz status «jeszcze nie wiem». Potwierdź udział w terminarzu, gdy będziesz wiedzieć."
                          : "Zaznaczyłeś «nie biorę udziału». Możesz to zmienić w terminarzu."}
                    </p>
                  </div>
                  <Button variant="gold" className="w-full sm:w-auto" asChild>
                    <Link href="/terminarz" className="inline-flex items-center justify-center gap-2">
                      <CalendarDays className="h-4 w-4 shrink-0" aria-hidden />
                      Otwórz terminarz
                    </Link>
                  </Button>
                </PhotoPanel>
              )}
              {isLoggedIn && hotpayEnabled && walletBalancePln != null && walletBalancePln < 0 && onPayDebt ? (
                <PhotoPanel
                  src={pitchPhotoAt(match.id + 10)}
                  contentClassName="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
                >
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/80">Zaległość</p>
                    <h2 className="mt-1 text-xl font-black text-white drop-shadow-sm">Opłać mecz</h2>
                  </div>
                  <PayButton
                    variant="hero"
                    amountPln={walletBalancePln}
                    label="Opłać mecz"
                    busy={debtBusy}
                    fullWidth
                    onClick={onPayDebt}
                  />
                </PhotoPanel>
              ) : null}
            </div>
          </>
        )}

        {marketplaceEnabled ? (
          <>
        <PhotoPanel
          src={pitchPhotoAt((match?.id ?? highlightMatchId) + 11)}
          className="mt-14 min-h-[18rem] rounded-3xl"
          contentClassName="flex min-h-[18rem] flex-col justify-center gap-6 px-6 py-10 sm:px-10 lg:flex-row lg:items-center lg:justify-between"
          overlayClassName="bg-gradient-to-r from-black/70 via-black/55 to-black/45"
          sizes="(max-width: 768px) 100vw, 1152px"
        >
          <div className="max-w-xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/80">Akademia</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight drop-shadow-sm">
              {isLoggedIn ? "Kolejny mecz czeka w terminarzu." : "Chcesz grać z nami?"}
            </h2>
            <p className="mt-3 text-white/90">
              {isLoggedIn
                ? "Zapisy, składy i statystyki są w jednym miejscu."
                : "Dołącz do akademii: terminarz, składy, portfel i rankingi po zalogowaniu."}
            </p>
          </div>
          <Button
            asChild
            variant="secondary"
            className="h-12 shrink-0 rounded-full bg-white px-8 font-black text-zinc-950 hover:bg-zinc-100"
          >
            <Link href={isLoggedIn ? "/terminarz" : "/register"}>
              {isLoggedIn ? "Otwórz terminarz" : "Dołącz do akademii"}
            </Link>
          </Button>
        </PhotoPanel>

        <section className="mt-14 grid gap-4 sm:grid-cols-3">
          {[
            { n: "1", t: "Zobacz zaproszenie", d: "Termin, miejsce i wolne miejsca w składzie." },
            { n: "2", t: "Zapisz się", d: "Potwierdź udział albo zaznacz, że jeszcze nie wiesz." },
            { n: "3", t: "Przyjdź na boisko", d: "PIN do bramy i transport po potwierdzeniu." },
          ].map((step, i) => (
            <PhotoPanel
              key={step.n}
              src={pitchPhotoAt((match?.id ?? highlightMatchId) + 12 + i)}
              className="min-h-[15rem]"
              contentClassName="flex min-h-[15rem] flex-col justify-end p-5"
              overlayClassName="bg-gradient-to-t from-black/75 via-black/30 to-black/10"
              sizes="(max-width: 768px) 100vw, 400px"
            >
              <p className="text-3xl font-black text-white drop-shadow-sm">{step.n}</p>
              <p className="mt-2 font-black text-white drop-shadow-sm">{step.t}</p>
              <p className="mt-1 text-sm text-white/85">{step.d}</p>
            </PhotoPanel>
          ))}
        </section>
          </>
        ) : null}
      </div>
    </div>
  );
}
