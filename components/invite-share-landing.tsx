"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { SiteAssetImage } from "@/components/site-asset-image";
import { CalendarDays, HelpCircle, KeyRound, Loader2, LogIn, MapPin, UserPlus } from "lucide-react";
import { toast } from "sonner";
import type { MatchRow } from "@/lib/db";
import type { PlayersDataEntry } from "@/lib/terminarz-shared";
import { LoginForm } from "@/components/login-form";
import { MatchSignupCountsBlock } from "@/components/terminarz-match-counts";
import { Button } from "@/components/ui/button";
import { terminarzInviteRelativePath } from "@/lib/share-link";
import { cn } from "@/lib/utils";

const invitePanelClass = "awp-invite-panel mx-auto max-w-2xl space-y-4";

const STAMP_MONTHS = ["STY", "LUT", "MAR", "KWI", "MAJ", "CZE", "LIP", "SIE", "WRZ", "PAŹ", "LIS", "GRU"] as const;

function formatMatchWhen(isoDate: string, time: string) {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) {
    return { label: `${isoDate} · ${time}`, weekday: "", stampDay: "", stampMonth: "", stampYear: "" };
  }
  const dt = new Date(y, m - 1, d);
  const weekday = dt.toLocaleDateString("pl-PL", { weekday: "long" });
  const label = `${String(d).padStart(2, "0")}.${String(m).padStart(2, "0")}.${y}`;
  return {
    label,
    weekday,
    time,
    stampDay: String(d).padStart(2, "0"),
    stampMonth: STAMP_MONTHS[m - 1] ?? "",
    stampYear: String(y).slice(-2),
  };
}

function slotMeta(signed: number, max: number) {
  const pct = max > 0 ? Math.min(100, (signed / max) * 100) : 0;
  const free = Math.max(0, max - signed);
  if (max <= 0) return { pct, free, tone: "ok" as const };
  if (signed >= max) return { pct, free, tone: "full" as const };
  if (pct >= 80) return { pct, free, tone: "warn" as const };
  return { pct, free, tone: "ok" as const };
}

export function InviteMatchCard({
  match,
  playersData,
  showGatePin = false,
}: {
  match: MatchRow;
  playersData: Record<number, PlayersDataEntry>;
  showGatePin?: boolean;
}) {
  const when = formatMatchWhen(match.match_date, match.match_time);
  const slots = slotMeta(match.signed_up, match.max_slots);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(match.location)}`;
  const gatePin = match.gate_pin?.trim() ?? "";

  const barClass =
    slots.tone === "full" ? "bg-red-400/90" : slots.tone === "warn" ? "bg-amber-400/90" : "bg-emerald-100";

  return (
    <section className="awp-postcard relative z-10 mx-auto max-w-2xl" aria-labelledby="invite-match-heading">
      <div className="awp-postcard__hero">
        <div className="awp-postcard__stamp" aria-label={`Znaczek: ${when.label}`}>
          <div className="awp-postcard__stampFace">
            <span className="awp-postcard__stampDay">{when.stampDay || "—"}</span>
            <span className="awp-postcard__stampMonth">
              {when.stampMonth || "—"} {when.stampYear || ""}
            </span>
            <SiteAssetImage
              asset="logo_header"
              alt=""
              width={22}
              height={22}
              className="awp-postcard__stampLogo"
            />
          </div>
        </div>
        <div className="awp-postcard__postmark" aria-hidden>
          <span className="awp-postcard__postmarkRing">
            <span className="awp-postcard__postmarkTop">AKADEMIA WIELKICH PIŁKARZY</span>
            <span className="awp-postcard__postmarkDate">{when.label || match.match_date}</span>
            <span className="awp-postcard__postmarkBottom">{when.time || match.match_time}</span>
          </span>
        </div>
        <div className="awp-postcard__heroInner">
          <p className="awp-postcard__kicker">Zaproszenie na mecz</p>
          <h2 id="invite-match-heading" className="awp-postcard__title">
            {when.weekday ? (
              <>
                <span className="capitalize">{when.weekday}</span>
                <span className="awp-postcard__subtitle">
                  {when.label} · {when.time}
                </span>
              </>
            ) : (
              <span>
                {when.label} · {when.time}
              </span>
            )}
          </h2>
          <div className="awp-postcard__heroRule" aria-hidden />
          <div className="awp-postcard__location">
            <MapPin className="h-4 w-4 shrink-0" aria-hidden />
            <span className="font-semibold leading-snug">{match.location}</span>
          </div>
        </div>
      </div>

      <div className="awp-postcard__body">
        <div className="awp-postcard__content">
          <div className="awp-postcard__section">
            <p className="awp-postcard__label">Skład</p>
            <div className="mt-1 space-y-1.5">
              <div className="flex items-center justify-between gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-300">
                <span className="tabular-nums">
                  {match.signed_up}/{match.max_slots}
                </span>
                <span>{slots.free > 0 ? `${slots.free} wolnych` : "pełny skład"}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-zinc-200/70 dark:bg-zinc-700/60">
                <div className={cn("h-full rounded-full transition-all", barClass)} style={{ width: `${slots.pct}%` }} />
              </div>
            </div>
          </div>

          <div className="awp-postcard__section">
            <MatchSignupCountsBlock
              matchId={match.id}
              signedUp={match.signed_up}
              maxSlots={match.max_slots}
              playersData={playersData}
              variant="card"
              tone="zinc"
            />
          </div>

          <a href={mapsUrl} target="_blank" rel="noreferrer" className="awp-postcard__cta">
            <MapPin className="h-4 w-4 shrink-0" aria-hidden />
            Otwórz miejsce w Mapach Google
          </a>
        </div>

        {gatePin && showGatePin ? (
          <div className="awp-postcard__pin">
            <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-[var(--mundial-navy,#1a2d5a)] dark:text-emerald-100" aria-hidden />
            <div className="min-w-0 text-left">
              <p className="awp-postcard__label">Wejście na boisko</p>
              <p className="mt-1 font-mono text-2xl font-bold tracking-[0.2em] text-[var(--mundial-navy,#1a2d5a)] tabular-nums dark:text-white">
                {gatePin}
              </p>
              <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">PIN do bramy przy tym meczu.</p>
            </div>
          </div>
        ) : (
          <div className="awp-postcard__backnote" aria-hidden>
            <p className="awp-postcard__label">Do zobaczenia na boisku</p>
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
              Zapisz się, żeby potwierdzić udział i ogarnąć transport.
            </p>
          </div>
        )}
      </div>
    </section>
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
  tentativeBusy: boolean;
  onParticipationTak: () => void;
  onParticipationTentative: () => void | Promise<void>;
  onParticipationNie: () => void | Promise<void>;
  onAuthenticated: () => void;
};

export function InviteShareLanding({
  highlightMatchId,
  match,
  playersData,
  isLoggedIn,
  userSignupKind,
  inviteLoginInline,
  setInviteLoginInline,
  tentativeBusy,
  onParticipationTak,
  onParticipationTentative,
  onParticipationNie,
  onAuthenticated,
}: InviteShareLandingProps) {
  const signupToastShownRef = useRef(false);
  const today = new Date().toISOString().slice(0, 10);
  const matchFuture = match != null && match.match_date >= today;
  const signupKind = userSignupKind[highlightMatchId];

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
    <div className="awp-invite-page space-y-6 pb-2">
      <header className="awp-invite-hero">
        <div className="awp-invite-hero__crest">
          <SiteAssetImage
            asset="logo_crest"
            alt=""
            width={128}
            height={128}
            className="h-9 w-9"
            sizes="36px"
          />
        </div>
        <p className="awp-invite-hero__kicker">Wizytówka meczu</p>
        <h1 className="awp-invite-hero__title">Zaproszenie na mecz</h1>
        <p className="awp-invite-hero__subtitle">
          Akademia Wielkich Piłkarzy — zapisz się na boisko w kilku krokach.
        </p>
        <div className="awp-invite-hero__rule" aria-hidden />
      </header>

      {!match ? (
        <div
          role="status"
          className="mx-auto max-w-2xl rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/35 dark:text-amber-100"
        >
          Nie znaleziono meczu o tym numerze — mógł zostać usunięty z terminarza.
        </div>
      ) : !matchFuture ? (
        <div
          role="status"
          className="mx-auto max-w-2xl rounded-2xl border border-zinc-200 bg-white px-4 py-4 text-sm text-zinc-700 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-300"
        >
          Ten termin już minął. Sprawdź aktualny terminarz, aby zapisać się na kolejne mecze.
        </div>
      ) : (
        <>
          <InviteMatchCard
            match={match}
            playersData={playersData}
            showGatePin={signupKind === "confirmed"}
          />

          <div className={invitePanelClass}>
            {!isLoggedIn ? (
              inviteLoginInline ? (
                <>
                  <div className="space-y-1 text-center sm:text-left">
                    <h2 className="text-lg font-semibold text-[var(--mundial-navy,#1a2d5a)] dark:text-zinc-100">
                      Logowanie
                    </h2>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      Wpisz imię, nazwisko i PIN (4–6 cyfr) — tak jak na stronie logowania.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="text-left text-sm font-medium text-[var(--mundial-navy,#1a2d5a)] underline-offset-2 hover:underline dark:text-amber-200/90"
                    onClick={() => setInviteLoginInline(false)}
                  >
                    ← Wróć
                  </button>
                  <LoginForm
                    nextPath={terminarzInviteRelativePath(highlightMatchId)}
                    embedMode
                    onAuthenticated={onAuthenticated}
                  />
                </>
              ) : (
                <>
                  <div className="space-y-1 text-center sm:text-left">
                    <h2 className="text-lg font-semibold text-[var(--mundial-navy,#1a2d5a)] dark:text-zinc-100">
                      Czy grasz w tym terminie?
                    </h2>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      Zaloguj się lub załóż konto, żeby odpowiedzieć: <strong>tak</strong>,{" "}
                      <strong>jeszcze nie wiem</strong> albo <strong>nie biorę udziału</strong>.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button type="button" className="flex-1 gap-2" onClick={() => setInviteLoginInline(true)}>
                      <LogIn className="h-4 w-4 shrink-0" aria-hidden />
                      Zaloguj się
                    </Button>
                    <Button variant="outline" className="flex-1 gap-2" asChild>
                      <Link href={registerHref}>
                        <UserPlus className="h-4 w-4 shrink-0" aria-hidden />
                        Utwórz konto
                      </Link>
                    </Button>
                  </div>
                </>
              )
            ) : signupKind == null ? (
              <>
                <div className="space-y-1 text-center sm:text-left">
                  <h2 className="text-lg font-semibold text-[var(--mundial-navy,#1a2d5a)] dark:text-zinc-100">
                    Czy bierzesz udział?
                  </h2>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Wybierz jedną opcję. Przy odpowiedzi <strong>tak</strong> (gdy są wolne miejsca) wybierzesz też
                    transport.
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <Button type="button" className="w-full" onClick={onParticipationTak}>
                    Tak, biorę udział
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={tentativeBusy}
                    onClick={() => void onParticipationTentative()}
                  >
                    {tentativeBusy ? (
                      <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" aria-hidden />
                    ) : (
                      <HelpCircle className="mr-2 h-4 w-4 shrink-0" aria-hidden />
                    )}
                    Jeszcze nie wiem
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full text-zinc-700 dark:text-zinc-300"
                    disabled={tentativeBusy}
                    onClick={() => void onParticipationNie()}
                  >
                    Nie, nie biorę udziału
                  </Button>
                </div>
              </>
            ) : (
              <div className="space-y-3 text-center sm:text-left">
                <h2 className="text-lg font-semibold text-[var(--mundial-navy,#1a2d5a)] dark:text-zinc-100">
                  Twój status na ten mecz
                </h2>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {signupKind === "confirmed"
                    ? "Jesteś zapisany na ten mecz. Szczegóły i transport znajdziesz w terminarzu."
                    : signupKind === "tentative"
                      ? "Masz status «jeszcze nie wiem». Potwierdź udział w terminarzu, gdy będziesz wiedzieć."
                      : "Zaznaczyłeś «nie biorę udziału». Możesz to zmienić w terminarzu."}
                </p>
                <Button variant="outline" className="w-full sm:w-auto" asChild>
                  <Link href={`/zaproszenie/${highlightMatchId}`}>Wróć do wizytówki meczu</Link>
                </Button>
              </div>
            )}
          </div>
        </>
      )}

      <p className="relative z-10 text-center text-sm text-zinc-600 dark:text-zinc-400">
        <Link href="/terminarz" className="awp-invite-footer-link">
          <CalendarDays className="h-4 w-4 shrink-0" aria-hidden />
          Pełny terminarz Akademii
        </Link>
      </p>

      <div className="relative z-10 flex justify-center pb-2">
        <SiteAssetImage
          asset="logo_header"
          decorative
          width={40}
          height={40}
          className="h-10 w-10 opacity-80"
        />
      </div>
    </div>
  );
}
