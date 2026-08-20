"use client";

import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/app-toast";
import { useHotpayPaymentReturn } from "@/hooks/use-hotpay-payment-return";
import {
  Activity,
  CalendarDays,
  ChevronRight,
  LogIn,
  LogOut,
  Medal,
  Shield,
  Trophy,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { HomeFallingDecor } from "@/components/home-falling-decor";
import { HomeNextMatchCard } from "@/components/home-next-match-card";
import { HomeTopRankings } from "@/components/home-top-rankings";
import { MarketplacePitchPhoto } from "@/components/marketplace-pitch-photo";
import { PhotoPanel } from "@/components/photo-panel";
import { MarketplaceSearchForm } from "@/components/marketplace-search-form";
import { MarketplaceVenueCard } from "@/components/marketplace-venue-card";
import { PlayerAvatar } from "@/components/player-avatar";
import { MatchTransportSignupDialog } from "@/components/match-transport-signup-dialog";
import { LogoutConfirmModal } from "@/components/logout-confirm-modal";
import { Button } from "@/components/ui/button";
import { AppModal } from "@/components/ui/app-modal";
import { FormInput } from "@/components/ui/form-field";
import { ModalMatchSummary, modalPanelClass } from "@/components/ui/modal-shared";
import { SiteSectionHero } from "@/components/site-section-hero";
import type { MatchRow } from "@/lib/db";
import type { VenueCard } from "@/lib/booking-shared";
import { MARKETPLACE_PITCH_PHOTOS, pitchPhotosFromVenues } from "@/lib/marketplace-photos";
import type { HomeTopPlayer } from "@/lib/rankings-data";
import { cn } from "@/lib/utils";
import { useScreenBlocks } from "@/components/screen-blocks-provider";
import { GymBratCrossLink } from "@/components/gymbrat-cross-link";
import { useSiteMode } from "@/components/site-mode";
import { useHotpayPayment } from "@/hooks/use-hotpay-payment";

type Props = {
  nextMatch: MatchRow | null;
  /** Np. „3 osoby się zastanawiają” — pusty gdy brak zapisów «jeszcze nie wiem». */
  nextMatchTentativeLine: string;
  lineupPublicNextMatch: boolean;
  nextMatchSignup: "none" | "tentative" | "confirmed" | "declined";
  /** Kafelek transportu zawsze widoczny po zapisie; link działa w lokalny dzień meczu. */
  transportHomeActive: boolean;
  hotpayEnabled?: boolean;
  isLoggedIn: boolean;
  isAdmin: boolean;
  firstName: string;
  lastName: string;
  zawodnik: string;
  profilePhotoPath: string | null;
  /** ID filmu / transmisji YouTube (osadzenie). Brak = brak sekcji na stronie. */
  youtubeLiveVideoId: string | null;
  /** Kafelek wejścia do sekcji PZU Cup (tylko na stronie startowej). */
  showPzuCupTile?: boolean;
  pageVariant?: "home" | "pzu-cup";
  topRankedPlayers?: HomeTopPlayer[];
  featuredVenues?: VenueCard[];
};

export function HomeClient(props: Props) {
  const { mode, marketplaceEnabled } = useSiteMode();
  const pageVariant = props.pageVariant ?? "home";

  if (pageVariant === "home" && marketplaceEnabled && mode === "booking") {
    return <BookingHomeView featuredVenues={props.featuredVenues ?? []} />;
  }
  if (pageVariant === "pzu-cup" || mode === "academy") {
    return <AcademyHomeView {...props} />;
  }

  return (
    <div className="relative flex flex-1 flex-col px-4 py-16 text-zinc-900 dark:text-zinc-50">
      <div className="mx-auto max-w-xl text-center">
        <p className="text-sm text-zinc-500">Wybierz, co chcesz zrobić.</p>
      </div>
    </div>
  );
}

function BookingHomeView({ featuredVenues }: { featuredVenues: VenueCard[] }) {
  const photos = pitchPhotosFromVenues(featuredVenues);
  const photoPool = [...new Set([...photos, ...MARKETPLACE_PITCH_PHOTOS])];
  const heroPhoto = photos[0] ?? MARKETPLACE_PITCH_PHOTOS[0];
  return (
    <div className="relative flex flex-1 flex-col text-zinc-900 dark:text-zinc-50">
      <HomeFallingDecor />
      <div className="relative z-10 flex flex-1 flex-col">
      <section className="mp-hero mp-hero--photo relative flex flex-col justify-end overflow-hidden pb-16 pt-16 sm:pb-20 sm:pt-24">
        <MarketplacePitchPhoto src={heroPhoto} priority className="z-0" />
        <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black/75 via-black/40 to-black/20" />
        <div className="relative z-10 mx-auto w-full max-w-6xl px-4">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-white/80">Rezerwacja boisk</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-black tracking-tight text-white sm:text-6xl">
            Gdzie chcesz zagrać?
          </h1>
          <p className="mt-4 max-w-xl text-base text-white/85 sm:text-lg">
            Wybierz miasto, dzień i godzinę. Wolne boiska widać od razu — rezerwacja i płatność online.
          </p>
          <div className="mt-8 max-w-5xl">
            <MarketplaceSearchForm />
          </div>
        </div>
      </section>

      <div className="relative z-10 mx-auto w-full min-w-0 max-w-6xl px-4 py-10 sm:py-12">
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { href: "/obiekty?indoor=1", title: "Boiska halowe", desc: "Kryte obiekty na każdą pogodę" },
            { href: "/obiekty?indoor=0", title: "Boiska otwarte", desc: "Orliki i nawierzchnie zewnętrzne" },
            { href: "/obiekty?surface=sztuczna", title: "Sztuczna trawa", desc: "Piłka nożna na tartanie i orliku" },
          ].map((item, i) => (
            <Link key={item.href} href={item.href} className="block">
              <PhotoPanel
                src={homeTilePhoto(photoPool, i)}
                className="min-h-[12rem] transition hover:-translate-y-0.5 hover:shadow-xl"
                contentClassName="flex min-h-[12rem] flex-col justify-end p-5"
                sizes="(max-width: 768px) 100vw, 400px"
              >
                <p className="font-black text-white drop-shadow-sm">{item.title}</p>
                <p className="mt-1 text-sm text-white/85">{item.desc}</p>
              </PhotoPanel>
            </Link>
          ))}
        </section>

        <section className="mt-12">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--mp-teal-dark)]">Obiekty</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Wybierz boisko i zarezerwuj</h2>
            </div>
            <Button asChild variant="outline">
              <Link href="/obiekty">Wszystkie obiekty</Link>
            </Button>
          </div>
          {featuredVenues.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-dashed border-zinc-300 bg-white p-8 text-center text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">
              <p className="font-semibold">Katalog startuje od Warszawy.</p>
              <p className="mt-2 text-sm">
                Potrzebujemy 5–15 hal w jednym mieście: zdjęcia, cennik, godziny, oświetlenie. Potem kolejne miasto.
              </p>
              <div className="mt-4">
                <Button asChild>
                  <Link href="/dla-obiektow">Zgłoś obiekt</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="-mx-4 mt-6 flex gap-4 overflow-x-auto px-4 pb-3 [scrollbar-width:thin]">
              {featuredVenues.map((venue) => (
                <MarketplaceVenueCard key={venue.id} venue={venue} className="w-72 shrink-0" />
              ))}
            </div>
          )}
        </section>

        <PhotoPanel
          src={homeTilePhoto(photoPool, 6)}
          className="mt-14 min-h-[18rem] rounded-3xl"
          contentClassName="flex min-h-[18rem] flex-col justify-center gap-6 px-6 py-10 sm:px-10 lg:flex-row lg:items-center lg:justify-between"
          overlayClassName="bg-gradient-to-r from-black/55 via-black/30 to-black/15"
          sizes="(max-width: 768px) 100vw, 1152px"
        >
          <div className="max-w-xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/80">Dla obiektów</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight drop-shadow-sm">Masz halę albo orlik? Wystaw terminy.</h2>
            <p className="mt-3 text-white/90">
              Zgłoś halę na stronie — bez tokenu od znajomych. Po weryfikacji publikujemy obiekt. Gracze rezerwują i
              płacą online, Ty widzisz obrót, prowizję i termin przelewu.
            </p>
          </div>
          <Button asChild variant="secondary" className="h-12 shrink-0 rounded-full bg-white px-8 font-black text-zinc-950 hover:bg-zinc-100">
            <Link href="/dla-obiektow">Dodaj swój obiekt</Link>
          </Button>
        </PhotoPanel>

        <section id="jak-to-dziala" className="mt-14 grid gap-4 sm:grid-cols-3">
          {[
            { n: "1", t: "Znajdź obiekt", d: "Filtruj po mieście, nawierzchni i cenie." },
            { n: "2", t: "Wybierz godzinę", d: "Zobacz wolne sloty i zablokuj termin." },
            { n: "3", t: "Opłać online", d: "Potwierdzenie na e-mail — bez PIN-u akademii." },
          ].map((step, i) => (
            <PhotoPanel
              key={step.n}
              src={homeTilePhoto(photoPool, i + 8)}
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
      </div>
      </div>
    </div>
  );
}

function AcademyHomeView({
  nextMatch,
  nextMatchTentativeLine,
  lineupPublicNextMatch,
  nextMatchSignup,
  transportHomeActive,
  hotpayEnabled,
  isLoggedIn,
  isAdmin,
  firstName,
  lastName,
  zawodnik,
  profilePhotoPath,
  youtubeLiveVideoId,
  showPzuCupTile = false,
  pageVariant = "home",
  topRankedPlayers = [],
  featuredVenues = [],
}: Props) {
  const router = useRouter();
  const { isHiddenHref } = useScreenBlocks();
  const { marketplaceEnabled } = useSiteMode();
  const isAcademyHome = pageVariant === "home";
  const pitchPhotos = pitchPhotosFromVenues(featuredVenues);
  const heroPhoto = pitchPhotos[0] ?? MARKETPLACE_PITCH_PHOTOS[0];
  const photoPool = [...new Set([...pitchPhotos, ...MARKETPLACE_PITCH_PHOTOS])];
  const [transportSignupOpen, setTransportSignupOpen] = useState(false);
  const [transportIntent, setTransportIntent] = useState<"signup" | "confirm">("signup");
  const [tentativeBusy, setTentativeBusy] = useState(false);
  const [signupOpen, setSignupOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [walletBalancePln, setWalletBalancePln] = useState<number | null>(null);
  const { pay: payDebt, busy: debtBusy } = useHotpayPayment();
  const [pendingMatch, setPendingMatch] = useState<{
    match_id: number;
    date: string;
    time: string;
    location: string;
  } | null>(null);
  const [goals, setGoals] = useState("");
  const [assists, setAssists] = useState("");
  const [distance, setDistance] = useState("");
  const [saves, setSaves] = useState("");

  useEffect(() => {
    if (!isAcademyHome) return;
    fetch("/api/stats/pending")
      .then((r) => r.json())
      .then((data) => {
        if (data.pending) {
          setPendingMatch({
            match_id: data.match_id,
            date: data.date,
            time: data.time,
            location: data.location,
          });
          setStatsOpen(true);
        }
      })
      .catch(() => {});
  }, [isAcademyHome]);

  function refreshWalletBalance() {
    if (!isLoggedIn || !hotpayEnabled) return;
    fetch("/api/wallet/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { balance_pln?: unknown } | null) => {
        if (d && typeof d.balance_pln === "number") {
          setWalletBalancePln(d.balance_pln);
        }
      })
      .catch(() => {});
  }

  useEffect(() => {
    if (!isAcademyHome) return;
    refreshWalletBalance();
    if (!isLoggedIn || !hotpayEnabled) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") refreshWalletBalance();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") refreshWalletBalance();
    }, 30_000);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      window.clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, hotpayEnabled, isAcademyHome]);

  useHotpayPaymentReturn({
    enabled: isLoggedIn && hotpayEnabled && isAcademyHome,
    onSettled: () => {
      refreshWalletBalance();
      router.refresh();
    },
  });

  function openTransportSignup() {
    if (!nextMatch) return;
    setTransportIntent("signup");
    setTransportSignupOpen(true);
  }

  function openConfirmFromTentative() {
    if (!nextMatch) return;
    setTransportIntent("confirm");
    setTransportSignupOpen(true);
  }

  async function signupTentativeHome() {
    if (!nextMatch) return;
    setTentativeBusy(true);
    try {
      const res = await fetch(`/api/terminarz/signup/${nextMatch.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commitment: "tentative" }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Nie udało się zapisać");
        return;
      }
      toast.success("Zapisano: jeszcze nie wiem");
      router.refresh();
    } finally {
      setTentativeBusy(false);
    }
  }

  async function signupDeclinedHome() {
    if (!nextMatch) return;
    setTentativeBusy(true);
    try {
      const res = await fetch(`/api/terminarz/signup/${nextMatch.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commitment: "declined" }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Nie udało się zapisać");
        return;
      }
      toast.success("Zapisano: nie biorę udziału");
      router.refresh();
    } finally {
      setTentativeBusy(false);
    }
  }

  async function saveStats() {
    if (!pendingMatch) return;
    const fd = new FormData();
    fd.set("match_id", String(pendingMatch.match_id));
    const nz = (s: string) => (s.trim() === "" ? "0" : s);
    fd.set("goals", nz(goals));
    fd.set("assists", nz(assists));
    fd.set("distance", nz(distance));
    fd.set("saves", nz(saves));
    const res = await fetch("/api/stats/save", { method: "POST", body: fd });
    const text = await res.text();
    if (text === "OK") {
      setStatsOpen(false);
      setPendingMatch(null);
      toast.success("Statystyki zapisane");
      router.refresh();
    } else {
      let msg = "Błąd zapisu statystyk";
      try {
        const j = JSON.parse(text) as { error?: string };
        if (typeof j.error === "string") msg = j.error;
      } catch {
        /* ignore */
      }
      toast.error(msg);
    }
  }

  const academyLinks = [
    { href: "/terminarz", icon: CalendarDays, title: "Terminarz akademii", desc: "Mecze, zapisy, terminy" },
    { href: "/pilkarze", icon: Users, title: "Piłkarze", desc: "Skład i profile" },
    isLoggedIn ? { href: "/platnosci", icon: Wallet, title: "Płatności", desc: "Portfel i opłaty za mecze" } : null,
    isLoggedIn ? { href: "/statystyki", icon: Activity, title: "Statystyki", desc: "Twoje liczby z boiska" } : null,
    isLoggedIn ? { href: "/rankingi", icon: Trophy, title: "Rankingi", desc: "Gole, asysty, punkty" } : null,
    showPzuCupTile ? { href: "/pzu-cup", icon: Medal, title: "PZU Cup", desc: "Organizacja turnieju" } : null,
    isAdmin ? { href: "/panel-admina", icon: Shield, title: "Zarządzanie akademią", desc: "Panel admina" } : null,
  ].flatMap((item) => (item && !isHiddenHref(item.href) ? [item] : []));

  const quickLinks = [
    { href: "/terminarz", title: "Terminarz", desc: "Mecze, zapisy i najbliższe terminy" },
    { href: "/pilkarze", title: "Piłkarze", desc: "Skład akademii i profile" },
    {
      href: isLoggedIn ? "/rankingi" : "/login?next=/rankingi",
      title: "Rankingi",
      desc: "Gole, asysty i punkty z meczów",
    },
  ].filter((item) => !isHiddenHref(item.href.split("?")[0] ?? item.href));

  const moreLinks = academyLinks.filter(
    (item) => item.href !== "/terminarz" && item.href !== "/pilkarze" && item.href !== "/rankingi"
  );

  const academyDialogs = (
    <>
      {nextMatch ? (
        <MatchTransportSignupDialog
          open={transportSignupOpen}
          onOpenChange={setTransportSignupOpen}
          matchId={nextMatch.id}
          intent={transportIntent === "confirm" ? "confirm" : "signup"}
          hotpayEnabled={hotpayEnabled}
          onCompleted={() => {
            setSignupOpen(true);
            router.refresh();
          }}
        />
      ) : null}

      <AppModal
        open={signupOpen}
        onOpenChange={setSignupOpen}
        size="md"
        title="Zostałeś zapisany na mecz"
        description="Termin jest w terminarzu — możesz wrócić do szczegółów w każdej chwili."
        footer={
          <Button type="button" onClick={() => setSignupOpen(false)}>
            Zamknij
          </Button>
        }
      >
        {nextMatch ? (
          <>
            <ModalMatchSummary match={nextMatch} />
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(nextMatch.location)}`}
              target="_blank"
              rel="noreferrer"
              className="inline-block text-sm font-medium text-[var(--mp-teal-dark)] underline underline-offset-2"
            >
              Otwórz miejsce w Mapach Google
            </a>
          </>
        ) : null}
      </AppModal>

      <AppModal
        open={statsOpen}
        onOpenChange={setStatsOpen}
        size="lg"
        scrollable
        title="Uzupełnij statystyki"
        description={pendingMatch ? "Wpisz swoje liczby z ostatniego spotkania." : undefined}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setStatsOpen(false)}>
              Anuluj
            </Button>
            <Button type="button" onClick={saveStats}>
              Zapisz statystyki
            </Button>
          </>
        }
      >
        {pendingMatch ? (
          <ModalMatchSummary
            match={{
              match_date: pendingMatch.date,
              match_time: pendingMatch.time,
              location: pendingMatch.location,
            }}
          />
        ) : null}
        <div className={cn(modalPanelClass, "grid gap-3 sm:grid-cols-2")}>
          <FormInput label="Gole" type="number" min={0} value={goals} onChange={(e) => setGoals(e.target.value)} />
          <FormInput label="Asysty" type="number" min={0} value={assists} onChange={(e) => setAssists(e.target.value)} />
          <FormInput
            label="Dystans (km)"
            type="number"
            min={0}
            step={0.1}
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
          />
          <FormInput label="Obronione strzały" type="number" min={0} value={saves} onChange={(e) => setSaves(e.target.value)} />
        </div>
      </AppModal>
    </>
  );

  if (!marketplaceEnabled) {
    return (
      <div className="relative flex flex-1 flex-col">
        {isAcademyHome ? <HomeFallingDecor /> : null}
        <div className="awp-page awp-page--default relative z-10 text-center">
          {isLoggedIn ? (
            <div className="mb-8 flex items-center justify-center gap-4">
              <PlayerAvatar
                photoPath={profilePhotoPath}
                firstName={firstName}
                lastName={lastName}
                size="lg"
                className="shadow-md ring-2 ring-white/40"
              />
              <div className="text-left">
                <h2 className="text-2xl font-bold tracking-tight text-white drop-shadow-sm">Witaj!</h2>
                <p className="text-lg font-semibold text-emerald-100">
                  {`${firstName} ${lastName}`.trim() || zawodnik}
                </p>
                {zawodnik && `${firstName} ${lastName}`.trim() ? (
                  <p className="text-sm text-emerald-100/80">{zawodnik}</p>
                ) : null}
              </div>
            </div>
          ) : null}

          {pageVariant === "pzu-cup" ? (
            <SiteSectionHero
              variant="stadium"
              kicker="PZU Cup 2026"
              title="Organizacja turnieju"
              showCrest={false}
              align="left"
            />
          ) : isLoggedIn ? (
            <SiteSectionHero
              variant="stadium"
              kicker="Start"
              title="Co dziś na boisku?"
              subtitle="Wybierz sekcję poniżej — terminarz, składy, statystyki i portfel."
              showCrest={false}
              align="left"
            />
          ) : (
            <SiteSectionHero
              variant="stadium"
              kicker="Akademia Wielkich Piłkarzy"
              title="Gramy razem"
              subtitle="Terminarz meczów, zapisy na boisko, statystyki i rankingi — dołącz do drużyny lub zaloguj się."
              align="center"
            />
          )}

          {nextMatch ? (
            <div className="mt-8">
              <HomeNextMatchCard
                match={nextMatch}
                tentativeLine={nextMatchTentativeLine}
                lineupPublic={lineupPublicNextMatch}
                signup={nextMatchSignup}
                transportActive={transportHomeActive}
                hotpayEnabled={hotpayEnabled}
                isLoggedIn={isLoggedIn}
                tentativeBusy={tentativeBusy}
                walletBalancePln={walletBalancePln}
                debtBusy={debtBusy}
                onPayDebt={(amount) => void payDebt(amount)}
                onSignup={openTransportSignup}
                onTentative={() => void signupTentativeHome()}
                onDeclined={() => void signupDeclinedHome()}
                onConfirmFromTentative={openConfirmFromTentative}
              />
            </div>
          ) : null}

          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {academyLinks.map((item) => (
              <PitchTile
                key={item.href}
                href={item.href}
                icon={item.icon}
                title={item.title.replace(" akademii", "")}
                desc={item.desc}
                variant={item.href === "/rankingi" ? "gold" : "pitch"}
              />
            ))}
            {!isLoggedIn ? (
              <>
                <PitchTile href="/login" icon={LogIn} title="Logowanie" desc="Wejdź do szatni" />
                <PitchTile href="/register" icon={UserPlus} title="Rejestracja" desc="Dołącz do drużyny" />
              </>
            ) : (
              <LogoutPitchTile onClick={() => setLogoutOpen(true)} />
            )}
            <GymBratCrossLink />
          </div>

          {isAcademyHome ? (
            <div className="mt-12 text-left">
              <HomeTopRankings players={topRankedPlayers} isLoggedIn={isLoggedIn} />
            </div>
          ) : null}

          {youtubeLiveVideoId ? (
            <section className="mx-auto mt-10 max-w-3xl overflow-hidden rounded-2xl border-2 border-white/25 text-left shadow-lg">
              <div className="home-pitch-tile px-4 py-3 sm:px-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-bold tracking-tight text-white">Mecz na żywo</h2>
                  <Link
                    href={`https://www.youtube.com/watch?v=${encodeURIComponent(youtubeLiveVideoId)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold text-white/85 underline underline-offset-2 hover:text-white"
                  >
                    YouTube
                  </Link>
                </div>
              </div>
              <div className="relative aspect-video w-full bg-black">
                <iframe
                  title="Transmisja meczu na żywo — YouTube"
                  className="absolute inset-0 h-full w-full"
                  src={`https://www.youtube.com/embed/${encodeURIComponent(youtubeLiveVideoId)}?rel=0`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              </div>
            </section>
          ) : null}
        </div>
        {academyDialogs}
        <LogoutConfirmModal open={logoutOpen} onOpenChange={setLogoutOpen} />
      </div>
    );
  }

  return (
    <div className="relative flex flex-1 flex-col text-zinc-900 dark:text-zinc-50">
      {isAcademyHome ? <HomeFallingDecor /> : null}
      <div className="relative z-10 flex flex-1 flex-col">
      {pageVariant === "pzu-cup" ? (
        <section className="mp-hero mp-hero--photo relative flex flex-col justify-end overflow-hidden pb-16 pt-16 sm:pb-20 sm:pt-24">
          <MarketplacePitchPhoto src={heroPhoto} priority className="z-0" />
          <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black/75 via-black/40 to-black/20" />
          <div className="relative z-10 mx-auto w-full max-w-6xl px-4">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-white/80">PZU Cup 2026</p>
            <h1 className="mt-3 max-w-3xl text-4xl font-black tracking-tight text-white sm:text-6xl">
              Organizacja turnieju
            </h1>
          </div>
        </section>
      ) : (
        <section className="mp-hero mp-hero--photo relative flex flex-col justify-end overflow-hidden pb-16 pt-16 sm:pb-20 sm:pt-24">
          <MarketplacePitchPhoto src={heroPhoto} priority className="z-0" />
          <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black/75 via-black/40 to-black/20" />
          <div className="relative z-10 mx-auto w-full max-w-6xl px-4">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-white/80">Akademia</p>
            <h1 className="mt-3 max-w-3xl text-4xl font-black tracking-tight text-white sm:text-6xl">
              Gramy razem.
            </h1>
            <p className="mt-4 max-w-xl text-base text-white/85 sm:text-lg">
              Terminarz meczów, składy i rankingi akademii.
            </p>
          </div>
        </section>
      )}

      {isAcademyHome ? (
        <div className="-mx-4 mt-0 flex gap-4 overflow-x-auto bg-zinc-100 px-4 py-4 [scrollbar-width:thin] dark:bg-zinc-900">
          {photoPool.slice(0, 8).map((src) => (
            <div key={src} className="relative h-48 w-72 shrink-0 overflow-hidden rounded-3xl bg-zinc-200">
              <MarketplacePitchPhoto src={src} sizes="288px" />
            </div>
          ))}
        </div>
      ) : null}

      <div className="relative z-10 mx-auto w-full min-w-0 max-w-6xl px-4 py-10 sm:py-12">
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map((item, i) => (
            <HomePhotoTile
              key={item.href}
              href={item.href}
              src={homeTilePhoto(photoPool, i + 2)}
              className="min-h-[12rem]"
              contentClassName="flex min-h-[12rem] flex-col justify-end"
            >
              <p className="font-black text-white drop-shadow-sm">{item.title}</p>
              <p className="mt-1 text-sm text-white/80">{item.desc}</p>
            </HomePhotoTile>
          ))}
        </section>

        {isLoggedIn ? (
          <HomePhotoTile
            className="mt-10"
            contentClassName="flex flex-wrap items-center gap-4"
            src={homeTilePhoto(photoPool, 5)}
          >
            <PlayerAvatar
              photoPath={profilePhotoPath}
              firstName={firstName}
              lastName={lastName}
              size="lg"
              className="shadow-md ring-2 ring-white/50"
            />
            <div className="min-w-0 text-left">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/80">Witaj</p>
              <p className="text-lg font-black text-white drop-shadow-sm">
                {`${firstName} ${lastName}`.trim() || zawodnik}
              </p>
              {zawodnik && `${firstName} ${lastName}`.trim() ? (
                <p className="text-sm text-white/80">{zawodnik}</p>
              ) : null}
            </div>
          </HomePhotoTile>
        ) : null}

        {nextMatch ? (
          <section className="mt-12">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--mp-teal-dark)]">Terminarz</p>
                <h2 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Najbliższy mecz</h2>
              </div>
              <Button asChild variant="outline">
                <Link href="/terminarz">Pełny terminarz</Link>
              </Button>
            </div>
            <div className="mt-6">
              <HomeNextMatchCard
                match={nextMatch}
                backgroundSrc={pitchPhotos[1] ?? heroPhoto}
                photoPool={marketplaceEnabled ? photoPool : undefined}
                tentativeLine={nextMatchTentativeLine}
                lineupPublic={lineupPublicNextMatch}
                signup={nextMatchSignup}
                transportActive={transportHomeActive}
                hotpayEnabled={hotpayEnabled}
                isLoggedIn={isLoggedIn}
                tentativeBusy={tentativeBusy}
                walletBalancePln={walletBalancePln}
                debtBusy={debtBusy}
                onPayDebt={(amount) => void payDebt(amount)}
                onSignup={openTransportSignup}
                onTentative={() => void signupTentativeHome()}
                onDeclined={() => void signupDeclinedHome()}
                onConfirmFromTentative={openConfirmFromTentative}
              />
            </div>
          </section>
        ) : null}

        {isAcademyHome ? (
          <div className="mt-12">
            <HomeTopRankings
              players={topRankedPlayers}
              isLoggedIn={isLoggedIn}
              photoPool={marketplaceEnabled ? photoPool : undefined}
            />
          </div>
        ) : null}

        {moreLinks.length > 0 ? (
          <section className="mt-12">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--mp-teal-dark)]">Akademia</p>
                <h2 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Więcej w akademii</h2>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {moreLinks.map((item, i) => {
                const Icon = item.icon;
                return (
                  <HomePhotoTile
                    key={item.href}
                    href={item.href}
                    src={homeTilePhoto(photoPool, i + 6)}
                    className="min-h-[15rem]"
                    contentClassName="flex min-h-[15rem] items-start justify-between gap-3"
                  >
                    <div>
                      <p className="font-black text-white drop-shadow-sm">{item.title}</p>
                      <p className="mt-1 text-sm text-white/80">{item.desc}</p>
                    </div>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/30">
                      <Icon className="h-5 w-5" />
                    </span>
                  </HomePhotoTile>
                );
              })}
              <GymBratCrossLink
                photoSrc={marketplaceEnabled ? homeTilePhoto(photoPool, moreLinks.length + 6) : undefined}
                className={marketplaceEnabled ? "min-h-[15rem]" : undefined}
              />
            </div>
          </section>
        ) : null}

        <section className="relative mt-14 overflow-hidden rounded-3xl px-6 py-10 text-white shadow-lg sm:px-10">
          <MarketplacePitchPhoto
            src={homeTilePhoto(photoPool, 9)}
            className="absolute inset-0 z-0 h-full w-full"
            sizes="(max-width: 768px) 100vw, 1152px"
          />
          <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-r from-black/70 via-black/55 to-black/45" aria-hidden />
          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
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
            <Button asChild variant="secondary" className="h-12 rounded-full bg-white px-8 font-black text-zinc-950 hover:bg-zinc-100">
              <Link href={isLoggedIn ? "/terminarz" : "/register"}>
                {isLoggedIn ? "Otwórz terminarz" : "Dołącz do akademii"}
              </Link>
            </Button>
          </div>
        </section>

        <section className="mt-14 grid gap-4 sm:grid-cols-3">
          {[
            { n: "1", t: "Zobacz terminarz", d: "Najbliższe mecze akademii i wolne miejsca." },
            { n: "2", t: "Zapisz się", d: "Potwierdź udział albo zaznacz, że jeszcze nie wiesz." },
            { n: "3", t: "Graj i licz punkty", d: "Statystyki i rankingi po każdym spotkaniu." },
          ].map((step, i) => (
            <HomePhotoTile
              key={step.n}
              src={homeTilePhoto(photoPool, i + 10)}
              className="min-h-[15rem]"
              contentClassName="flex min-h-[15rem] flex-col justify-end"
            >
              <p className="text-3xl font-black text-white drop-shadow-sm">{step.n}</p>
              <p className="mt-2 font-black text-white drop-shadow-sm">{step.t}</p>
              <p className="mt-1 text-sm text-white/85">{step.d}</p>
            </HomePhotoTile>
          ))}
        </section>

        {youtubeLiveVideoId ? (
          <section className="mt-14 overflow-hidden rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--mp-teal-dark)]">Na żywo</p>
                <h2 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Mecz na YouTube</h2>
              </div>
              <Button asChild variant="outline">
                <Link
                  href={`https://www.youtube.com/watch?v=${encodeURIComponent(youtubeLiveVideoId)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  YouTube
                </Link>
              </Button>
            </div>
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black">
              <iframe
                title="Transmisja meczu na żywo — YouTube"
                className="absolute inset-0 h-full w-full"
                src={`https://www.youtube.com/embed/${encodeURIComponent(youtubeLiveVideoId)}?rel=0`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
          </section>
        ) : null}
      </div>

      {academyDialogs}
      </div>
    </div>
  );
}

function homeTilePhoto(photos: string[], index: number): string {
  const pool = photos.length > 0 ? photos : [...MARKETPLACE_PITCH_PHOTOS];
  return pool[index % pool.length] ?? MARKETPLACE_PITCH_PHOTOS[0];
}

function HomePhotoTile({
  src,
  href,
  className,
  contentClassName,
  children,
}: {
  src: string;
  href?: string;
  className?: string;
  contentClassName?: string;
  children: ReactNode;
}) {
  const body = (
    <>
      <div className="absolute inset-0 z-0 bg-zinc-800">
        <MarketplacePitchPhoto src={src} sizes="(max-width: 768px) 100vw, 400px" />
      </div>
      <div
        className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-black/70 via-black/25 to-black/10"
        aria-hidden
      />
      <div className={cn("relative z-10", contentClassName)}>{children}</div>
    </>
  );
  const cls = cn("relative isolate overflow-hidden rounded-2xl p-5 text-white shadow-lg", className);
  if (href) {
    return (
      <Link href={href} className={cn(cls, "block transition hover:-translate-y-0.5 hover:shadow-xl")}>
        {body}
      </Link>
    );
  }
  return <div className={cls}>{body}</div>;
}

type PitchTileProps = {
  href: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  desc: string;
  variant?: "pitch" | "gold";
};

function PitchTile({ href, icon: Icon, title, desc, variant = "pitch" }: PitchTileProps) {
  const bgClass = variant === "gold" ? "home-pitch-tile-gold" : "home-pitch-tile";
  const tileFrame =
    variant === "gold"
      ? "shadow-md shadow-amber-950/20 ring-1 ring-amber-950/20 hover:shadow-amber-950/35"
      : "shadow-md shadow-emerald-950/12 ring-1 ring-emerald-950/10 hover:shadow-emerald-950/22";
  const descMuted = variant === "gold" ? "text-amber-50/95" : "text-emerald-50/90";
  return (
    <Link
      href={href}
      className={`group relative block h-full min-h-[5.5rem] overflow-hidden rounded-2xl border-2 border-white/30 text-left transition-[transform,box-shadow] motion-safe:hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 ${tileFrame}`}
    >
      <div className={`absolute inset-0 ${bgClass}`} aria-hidden />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 bg-white/45" aria-hidden />
      <div className="pointer-events-none absolute left-0 top-0 h-7 w-7 rounded-br-md border-b-2 border-r-2 border-white/40" aria-hidden />
      <div className="relative flex h-full items-center gap-3 px-4 py-3.5 sm:gap-4 sm:px-4 sm:py-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15 ring-2 ring-white/35 backdrop-blur-[2px] sm:h-12 sm:w-12">
          <Icon className="h-5 w-5 text-white sm:h-6 sm:w-6" strokeWidth={2.25} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold tracking-tight text-white drop-shadow-sm sm:text-[1.05rem]">{title}</p>
          <p className={`mt-0.5 text-xs leading-snug sm:text-sm ${descMuted}`}>{desc}</p>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-white/50 transition-all group-hover:translate-x-0.5 group-hover:text-white/90" />
      </div>
    </Link>
  );
}

function LogoutPitchTile({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative block h-full min-h-[5.5rem] w-full overflow-hidden rounded-2xl border-2 border-white/30 text-left shadow-md shadow-emerald-950/12 ring-1 ring-emerald-950/10 transition-[transform,box-shadow] motion-safe:hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="home-pitch-tile absolute inset-0" aria-hidden />
      <div className="relative flex h-full items-center gap-3 px-4 py-3.5 sm:gap-4 sm:px-4 sm:py-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15 ring-2 ring-white/35 sm:h-12 sm:w-12">
          <LogOut className="h-5 w-5 text-white sm:h-6 sm:w-6" strokeWidth={2.25} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold tracking-tight text-white drop-shadow-sm">Wyloguj</p>
          <p className="mt-0.5 text-xs leading-snug text-emerald-50/90 sm:text-sm">Zakończ sesję</p>
        </div>
      </div>
    </button>
  );
}
