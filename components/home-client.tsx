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
  Medal,
  Shield,
  Trophy,
  Users,
  Wallet,
} from "lucide-react";
import { HomeFallingDecor } from "@/components/home-falling-decor";
import { HomeNextMatchCard } from "@/components/home-next-match-card";
import { HomeTopRankings } from "@/components/home-top-rankings";
import { MarketplacePitchPhoto } from "@/components/marketplace-pitch-photo";
import { MarketplacePhotoStrip } from "@/components/marketplace-photo-strip";
import { PhotoPanel } from "@/components/photo-panel";
import { MarketplaceSearchForm } from "@/components/marketplace-search-form";
import { MarketplaceVenueCard } from "@/components/marketplace-venue-card";
import { PlayerAvatar } from "@/components/player-avatar";
import { MatchSignupDialog } from "@/components/match-signup-dialog";
import { LogoutConfirmModal } from "@/components/logout-confirm-modal";
import { Button } from "@/components/ui/button";
import { AppModal } from "@/components/ui/app-modal";
import { FormInput } from "@/components/ui/form-field";
import { ModalMatchSummary, modalPanelClass } from "@/components/ui/modal-shared";
import type { MatchRow } from "@/lib/db";
import type { PlayersDataEntry } from "@/lib/terminarz-shared";
import type { VenueCard } from "@/lib/booking-shared";
import { pitchPhotosFromVenues, MARKETPLACE_PITCH_PHOTOS } from "@/lib/marketplace-photos";
import type { HomeTopPlayer } from "@/lib/rankings-data";
import { cn } from "@/lib/utils";
import { useScreenBlocks } from "@/components/screen-blocks-provider";
import { GymBratCrossLink } from "@/components/gymbrat-cross-link";
import { useSiteMode } from "@/components/site-mode";
import { useHotpayPayment } from "@/hooks/use-hotpay-payment";

type Props = {
  nextMatch: MatchRow | null;
  nextMatchPlayersData: PlayersDataEntry | null;
  /** Np. „3 osoby się zastanawiają” — pusty gdy brak zapisów «jeszcze nie wiem». */
  nextMatchTentativeLine: string;
  lineupPublicNextMatch: boolean;
  nextMatchSignup: "none" | "tentative" | "confirmed" | "declined";
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
  /** Tryb z ciasteczka SSR — zapas gdy kontekst klienta jeszcze nie zsynchronizował trybu. */
  serverSiteMode?: import("@/lib/site-mode").SiteMode | null;
};

export function HomeClient(props: Props) {
  const { mode } = useSiteMode();
  const pageVariant = props.pageVariant ?? "home";
  const effectiveMode = mode ?? props.serverSiteMode ?? "academy";

  if (pageVariant === "home" && effectiveMode === "booking") {
    return <BookingHomeView featuredVenues={props.featuredVenues ?? []} />;
  }
  if (pageVariant === "pzu-cup" || effectiveMode === "academy") {
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

const BOOKING_CATEGORY_LINKS = [
  { href: "/obiekty?indoor=1", title: "Boiska halowe", desc: "Kryte obiekty na każdą pogodę" },
  { href: "/obiekty?indoor=0", title: "Boiska otwarte", desc: "Orliki i nawierzchnie zewnętrzne" },
  { href: "/obiekty?surface=sztuczna", title: "Sztuczna trawa", desc: "Piłka nożna na tartanie i orliku" },
] as const;

const BOOKING_STEPS = [
  { n: "1", t: "Znajdź obiekt", d: "Filtruj po mieście, nawierzchni i cenie." },
  { n: "2", t: "Wybierz godzinę", d: "Zobacz wolne sloty i zablokuj termin." },
  { n: "3", t: "Opłać online", d: "Potwierdzenie na e-mail — bez PIN-u akademii." },
] as const;

const ACADEMY_STEPS = [
  { n: "1", t: "Zobacz terminarz", d: "Najbliższe mecze akademii i wolne miejsca." },
  { n: "2", t: "Zapisz się", d: "Potwierdź udział albo zaznacz, że jeszcze nie wiesz." },
  { n: "3", t: "Graj i licz punkty", d: "Statystyki i rankingi po każdym spotkaniu." },
] as const;

function BookingHomeView({ featuredVenues }: { featuredVenues: VenueCard[] }) {
  const photos = pitchPhotosFromVenues(featuredVenues);
  /** Pula kafelków / hero — bez zdjęć edytowanych pod „Gramy razem”. */
  const photoPool = photos.length > 0 ? photos : [...MARKETPLACE_PITCH_PHOTOS];
  const heroPhoto = photoPool[0] ?? MARKETPLACE_PITCH_PHOTOS[0];
  return (
    <div className="relative flex flex-1 flex-col text-zinc-900 dark:text-zinc-50">
      <HomeFallingDecor className="hidden lg:block" />
      <section className="mp-hero mp-hero--photo relative z-10 flex flex-col justify-end overflow-hidden pb-5 pt-6 sm:pb-20 sm:pt-24">
        <MarketplacePitchPhoto src={heroPhoto} priority className="z-0" />
        <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black/75 via-black/40 to-black/20" />
        <div className="relative z-10 mx-auto w-full max-w-6xl px-3 xs:px-4">
          <p className="text-[0.65rem] font-black uppercase tracking-[0.22em] text-white/80 sm:text-xs">
            Rezerwacja boisk
          </p>
          <h1 className="mt-2 max-w-3xl text-[1.65rem] font-black leading-tight tracking-tight text-white xs:text-4xl sm:mt-3 sm:text-6xl">
            Gdzie chcesz zagrać?
          </h1>
          <p className="mt-2 hidden max-w-xl text-sm text-white/85 sm:mt-4 sm:block sm:text-lg">
            Wybierz miasto, dzień i godzinę. Wolne boiska widać od razu — rezerwacja i płatność online.
          </p>
          <div className="mt-4 max-w-5xl sm:mt-8">
            <MarketplaceSearchForm />
          </div>
        </div>
      </section>
      <MarketplacePhotoStrip />

      <div className="relative z-10 mx-auto w-full min-w-0 max-w-6xl px-3 py-6 xs:px-4 sm:py-12">
        <nav className="mp-h-scroll -mx-3 px-3 pb-1 md:hidden" aria-label="Rodzaj boiska">
          {BOOKING_CATEGORY_LINKS.map((item, i) => (
            <Link key={item.href} href={item.href} className="block w-[min(72vw,16.5rem)] shrink-0">
              <PhotoPanel
                src={homeTilePhoto(photoPool, i)}
                className="min-h-[8.5rem]"
                contentClassName="flex min-h-[8.5rem] flex-col justify-end p-3.5"
                sizes="70vw"
              >
                <p className="font-black text-white drop-shadow-sm">{item.title}</p>
                <p className="mt-0.5 text-xs text-white/85">{item.desc}</p>
              </PhotoPanel>
            </Link>
          ))}
        </nav>
        <section className="hidden gap-3 sm:grid-cols-2 md:grid lg:grid-cols-3">
          {BOOKING_CATEGORY_LINKS.map((item, i) => (
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

        <section className="mt-8 sm:mt-12">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--mp-teal-dark)]">Obiekty</p>
              <h2 className="mt-1 text-xl font-black tracking-tight sm:text-3xl">Wybierz boisko</h2>
            </div>
            <Button asChild variant="outline" className="hidden sm:inline-flex">
              <Link href="/obiekty">Wszystkie obiekty</Link>
            </Button>
            <Link
              href="/obiekty"
              className="shrink-0 text-sm font-semibold text-[var(--mp-teal-dark)] sm:hidden"
            >
              Wszystkie
            </Link>
          </div>
          {featuredVenues.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-dashed border-zinc-300 bg-white p-6 text-center text-zinc-600 sm:p-8 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">
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
            <div className="mp-h-scroll -mx-3 mt-6 px-3 pb-3 xs:-mx-4 xs:px-4">
              {featuredVenues.map((venue) => (
                <MarketplaceVenueCard
                  key={venue.id}
                  venue={venue}
                  className="w-[min(78vw,18rem)]"
                />
              ))}
            </div>
          )}
        </section>

        <PhotoPanel
          src={homeTilePhoto(photoPool, 6)}
          className="mt-8 min-h-[12rem] rounded-3xl md:mt-14 md:min-h-[18rem]"
          contentClassName="flex min-h-[12rem] flex-col justify-end gap-4 p-5 md:min-h-[18rem] md:flex-row md:items-center md:justify-between md:px-10 md:py-10"
          overlayClassName="bg-gradient-to-r from-black/55 via-black/30 to-black/15"
          sizes="(max-width: 768px) 100vw, 1152px"
        >
          <div className="max-w-xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/80">Dla obiektów</p>
            <h2 className="mt-2 text-xl font-black tracking-tight drop-shadow-sm md:text-3xl">
              Masz halę albo orlik? Wystaw terminy.
            </h2>
            <p className="mt-3 text-base text-white/90">
              Zgłoś halę na stronie — bez tokenu od znajomych. Po weryfikacji publikujemy obiekt. Gracze rezerwują i
              płacą online, Ty widzisz obrót, prowizję i termin przelewu.
            </p>
          </div>
          <Button
            asChild
            variant="secondary"
            className="h-11 w-full shrink-0 rounded-full bg-white px-6 font-black text-zinc-950 hover:bg-zinc-100 md:h-12 md:w-auto md:px-8"
          >
            <Link href="/dla-obiektow">Dodaj swój obiekt</Link>
          </Button>
        </PhotoPanel>

        <section id="jak-to-dziala" className="mt-8 sm:mt-14">
          <div className="mp-h-scroll -mx-3 px-3 pb-1 md:hidden">
            {BOOKING_STEPS.map((step, i) => (
              <PhotoPanel
                key={step.n}
                src={homeTilePhoto(photoPool, i + 8)}
                className="min-h-[11rem] w-[min(78vw,17rem)]"
                contentClassName="flex min-h-[11rem] flex-col justify-end p-4"
                overlayClassName="bg-gradient-to-t from-black/75 via-black/30 to-black/10"
                sizes="78vw"
              >
                <p className="text-2xl font-black text-white drop-shadow-sm">{step.n}</p>
                <p className="mt-2 font-black text-white drop-shadow-sm">{step.t}</p>
                <p className="mt-1 text-sm text-white/85">{step.d}</p>
              </PhotoPanel>
            ))}
          </div>
          <div className="hidden gap-4 md:grid md:grid-cols-3">
            {BOOKING_STEPS.map((step, i) => (
              <PhotoPanel
                key={step.n}
                src={homeTilePhoto(photoPool, i + 8)}
                className="min-h-[15rem]"
                contentClassName="flex min-h-[15rem] flex-col justify-end p-5"
                overlayClassName="bg-gradient-to-t from-black/75 via-black/30 to-black/10"
                sizes="400px"
              >
                <p className="text-3xl font-black text-white drop-shadow-sm">{step.n}</p>
                <p className="mt-2 font-black text-white drop-shadow-sm">{step.t}</p>
                <p className="mt-1 text-sm text-white/85">{step.d}</p>
              </PhotoPanel>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function AcademyHomeView({
  nextMatch,
  nextMatchPlayersData,
  nextMatchTentativeLine,
  lineupPublicNextMatch,
  nextMatchSignup,
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
  const isAcademyHome = pageVariant === "home";
  const pitchPhotos = pitchPhotosFromVenues(featuredVenues);
  /**
   * Kafelki / Top 3 / CTA: tylko zdjęcia obiektów lub domyślne Unsplash.
   * Edytowalny pasek pod „Gramy razem” (`mpPhotos`) jest wyłącznie w MarketplacePhotoStrip.
   */
  const photoPool =
    pitchPhotos.length > 0 ? pitchPhotos : [...MARKETPLACE_PITCH_PHOTOS];
  const heroPhoto = photoPool[0] ?? MARKETPLACE_PITCH_PHOTOS[0];
  const [signupDialogOpen, setSignupDialogOpen] = useState(false);
  const [signupIntent, setSignupIntent] = useState<"signup" | "confirm">("signup");
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

  function openSignupDialog() {
    if (!nextMatch) return;
    setSignupIntent("signup");
    setSignupDialogOpen(true);
  }

  function openConfirmFromTentative() {
    if (!nextMatch) return;
    setSignupIntent("confirm");
    setSignupDialogOpen(true);
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
        <MatchSignupDialog
          open={signupDialogOpen}
          onOpenChange={setSignupDialogOpen}
          matchId={nextMatch.id}
          intent={signupIntent === "confirm" ? "confirm" : "signup"}
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

  return (
    <div className="relative flex flex-1 flex-col text-zinc-900 dark:text-zinc-50">
      {isAcademyHome ? <HomeFallingDecor className="hidden lg:block" /> : null}

      {isLoggedIn ? (
        <section className="relative z-10 mx-auto w-full min-w-0 max-w-6xl px-3 pt-4 xs:px-4 sm:pt-6">
          <HomePhotoTile
            contentClassName="flex flex-wrap items-center gap-3 sm:gap-4"
            src={homeTilePhoto(photoPool, 5)}
            className="min-h-0"
          >
            <PlayerAvatar
              photoPath={profilePhotoPath}
              firstName={firstName}
              lastName={lastName}
              size="md"
              className="shadow-md ring-2 ring-white/50 md:hidden"
            />
            <PlayerAvatar
              photoPath={profilePhotoPath}
              firstName={firstName}
              lastName={lastName}
              size="lg"
              className="hidden shadow-md ring-2 ring-white/50 md:inline-flex"
            />
            <div className="min-w-0 text-left">
              <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-white/80 sm:text-xs">Witaj</p>
              <p className="truncate text-base font-black text-white drop-shadow-sm sm:text-lg">
                {`${firstName} ${lastName}`.trim() || zawodnik}
              </p>
              {zawodnik && `${firstName} ${lastName}`.trim() ? (
                <p className="truncate text-sm text-white/80">{zawodnik}</p>
              ) : null}
            </div>
          </HomePhotoTile>
        </section>
      ) : null}

      {nextMatch ? (
        <section className="relative z-10 mx-auto w-full min-w-0 max-w-6xl px-3 pb-2 pt-4 xs:px-4 sm:pt-6">
          <div className="mb-4 flex flex-col gap-3 sm:mb-0 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--mp-teal-dark)]">
                Terminarz
              </p>
              <h2 className="mt-1 text-3xl font-black tracking-tight">Najbliższy mecz</h2>
            </div>
            <Button asChild variant="outline" className="w-auto">
              <Link href="/terminarz">Pełny terminarz</Link>
            </Button>
          </div>
          <div className="mt-4 sm:mt-6">
            <HomeNextMatchCard
              match={nextMatch}
              backgroundSrc={pitchPhotos[1] ?? heroPhoto}
              photoPool={photoPool}
              playersData={nextMatchPlayersData}
              tentativeLine={nextMatchTentativeLine}
              lineupPublic={lineupPublicNextMatch}
              signup={nextMatchSignup}
              hotpayEnabled={hotpayEnabled}
              isLoggedIn={isLoggedIn}
              tentativeBusy={tentativeBusy}
              walletBalancePln={walletBalancePln}
              debtBusy={debtBusy}
              onPayDebt={(amount) => void payDebt(amount)}
              onSignup={openSignupDialog}
              onTentative={() => void signupTentativeHome()}
              onDeclined={() => void signupDeclinedHome()}
              onConfirmFromTentative={openConfirmFromTentative}
            />
          </div>
        </section>
      ) : null}

      {pageVariant === "pzu-cup" ? (
        <section className="mp-hero mp-hero--photo relative z-0 flex flex-col justify-end overflow-hidden pb-8 pt-8 sm:pb-20 sm:pt-24">
          <MarketplacePitchPhoto src={heroPhoto} priority className="z-0" />
          <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black/75 via-black/40 to-black/20" />
          <div className="relative z-10 mx-auto w-full max-w-6xl px-4">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-white/80">PZU Cup 2026</p>
            <h1 className="mt-3 max-w-3xl text-3xl font-black tracking-tight text-white sm:text-6xl">
              Organizacja turnieju
            </h1>
          </div>
        </section>
      ) : (
        <section
          className={cn(
            "mp-hero mp-hero--photo relative z-0 flex flex-col justify-end overflow-hidden pb-8 pt-10 sm:pb-20 sm:pt-24"
          )}
        >
          <MarketplacePitchPhoto src={heroPhoto} priority={!nextMatch} className="z-0" />
          <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black/75 via-black/40 to-black/20" />
          <div className="relative z-10 mx-auto w-full max-w-6xl px-4">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-white/80">Akademia</p>
            <h1 className="mt-3 max-w-3xl text-3xl font-black tracking-tight text-white sm:text-6xl">
              Gramy razem.
            </h1>
            <p className="mt-3 hidden max-w-xl text-base text-white/85 sm:block sm:text-lg">
              Terminarz meczów, składy i rankingi akademii.
            </p>
          </div>
        </section>
      )}

      {isAcademyHome ? <MarketplacePhotoStrip isAdmin={isAdmin} /> : null}

      <div className="relative z-10 mx-auto w-full min-w-0 max-w-6xl px-3 py-6 xs:px-4 sm:px-4 sm:py-12">
        <nav className="grid grid-cols-2 gap-2 md:hidden" aria-label="Sekcje akademii">
          {academyLinks.map((item, i) => (
            <HomeShortcutTile
              key={item.href}
              href={item.href}
              icon={item.icon}
              title={item.title.replace(" akademii", "")}
              src={homeTilePhoto(photoPool, i + 2)}
            />
          ))}
          <GymBratCrossLink variant="row" className="col-span-2" />
        </nav>

        <section className="hidden gap-3 md:grid md:grid-cols-2 lg:grid-cols-3">
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

        {isAcademyHome ? (
          <div className="mt-8 sm:mt-12">
            <HomeTopRankings
              players={topRankedPlayers}
              isLoggedIn={isLoggedIn}
              photoPool={photoPool}
            />
          </div>
        ) : null}

        {moreLinks.length > 0 ? (
          <section className="mt-12 hidden md:block">
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
              <GymBratCrossLink className="min-h-[15rem]" />
            </div>
          </section>
        ) : null}

        {!nextMatch ? (
        <HomePhotoTile
          src={homeTilePhoto(photoPool, 9)}
          className="mt-8 min-h-0 md:hidden"
          contentClassName="flex min-h-0 flex-col gap-3 p-0"
        >
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-white/80">Akademia</p>
          <h2 className="text-lg font-black tracking-tight text-white drop-shadow-sm">
            {isLoggedIn ? "Kolejny mecz w terminarzu" : "Chcesz grać z nami?"}
          </h2>
          <p className="text-sm text-white/85">
            {isLoggedIn
              ? "Zapisy, składy i statystyki są w jednym miejscu."
              : "Dołącz: terminarz, składy, portfel i rankingi po zalogowaniu."}
          </p>
          <Button asChild variant="secondary" className="mt-1 h-11 w-full rounded-full bg-white font-black text-zinc-950 hover:bg-zinc-100">
            <Link href={isLoggedIn ? "/terminarz" : "/register"}>
              {isLoggedIn ? "Otwórz terminarz" : "Dołącz do akademii"}
            </Link>
          </Button>
        </HomePhotoTile>
        ) : null}
        <section className="relative mt-14 hidden overflow-hidden rounded-3xl px-10 py-10 text-white shadow-lg md:block">
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

        <section className="mt-8 sm:mt-14">
          <div className="mp-h-scroll -mx-3 px-3 pb-1 md:hidden">
            {ACADEMY_STEPS.map((step, i) => (
              <HomePhotoTile
                key={step.n}
                src={homeTilePhoto(photoPool, i + 10)}
                className="min-h-[11rem] w-[min(78vw,17rem)]"
                contentClassName="flex min-h-[11rem] flex-col justify-end p-0"
              >
                <p className="text-2xl font-black text-white drop-shadow-sm">{step.n}</p>
                <p className="mt-2 font-black text-white drop-shadow-sm">{step.t}</p>
                <p className="mt-1 text-sm text-white/85">{step.d}</p>
              </HomePhotoTile>
            ))}
          </div>
          <div className="hidden gap-4 md:grid md:grid-cols-3">
            {ACADEMY_STEPS.map((step, i) => (
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
          </div>
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
  );
}

function homeTilePhoto(photos: string[], index: number): string {
  const pool = photos.length > 0 ? photos : [...MARKETPLACE_PITCH_PHOTOS];
  return pool[index % pool.length] ?? MARKETPLACE_PITCH_PHOTOS[0];
}

function HomeShortcutTile({
  href,
  icon: Icon,
  title,
  src,
}: {
  href: string;
  icon: ComponentType<{ className?: string }>;
  title: string;
  src?: string;
}) {
  if (src) {
    return (
      <HomePhotoTile
        href={href}
        src={src}
        className="min-h-[6.5rem] p-3"
        contentClassName="flex min-h-[6.5rem] flex-col justify-between p-0"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 text-white ring-1 ring-white/30">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <span className="mt-2 text-sm font-bold leading-tight text-white drop-shadow-sm">{title}</span>
      </HomePhotoTile>
    );
  }
  return (
    <Link
      href={href}
      className="flex min-h-[4.75rem] flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-[var(--mp-teal-dark)] dark:bg-teal-950/50 dark:text-teal-300">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <span className="mt-2 text-sm font-bold leading-tight text-zinc-950 dark:text-white">{title}</span>
    </Link>
  );
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
  const cls = cn("relative isolate overflow-hidden rounded-2xl p-3 text-white shadow-lg sm:p-5", className);
  if (href) {
    return (
      <Link href={href} className={cn(cls, "block transition hover:-translate-y-0.5 hover:shadow-xl")}>
        {body}
      </Link>
    );
  }
  return <div className={cls}>{body}</div>;
}
