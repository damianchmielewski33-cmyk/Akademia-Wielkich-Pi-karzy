"use client";

import { useEffect, useState, type ComponentType } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Activity,
  CalendarDays,
  Car,
  ChevronRight,
  LayoutGrid,
  LogIn,
  LogOut,
  Shield,
  Trophy,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { PlayerAvatar } from "@/components/player-avatar";
import { MatchTransportSignupDialog } from "@/components/match-transport-signup-dialog";
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
import type { MatchRow } from "@/lib/db";

type Props = {
  nextMatch: MatchRow | null;
  lineupPublicNextMatch: boolean;
  userSigned: boolean;
  /** Jeden przycisk „Transport na mecz” (okno 6 h przed startem albo dostęp do czatu). */
  showTransportOnHome: boolean;
  isLoggedIn: boolean;
  isAdmin: boolean;
  firstName: string;
  lastName: string;
  zawodnik: string;
  profilePhotoPath: string | null;
};

export function HomeClient({
  nextMatch,
  lineupPublicNextMatch,
  userSigned,
  showTransportOnHome,
  isLoggedIn,
  isAdmin,
  firstName,
  lastName,
  zawodnik,
  profilePhotoPath,
}: Props) {
  const router = useRouter();
  const [transportSignupOpen, setTransportSignupOpen] = useState(false);
  const [signupOpen, setSignupOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [pendingMatch, setPendingMatch] = useState<{
    match_id: number;
    date: string;
    time: string;
    location: string;
  } | null>(null);
  const [goals, setGoals] = useState("0");
  const [assists, setAssists] = useState("0");
  const [distance, setDistance] = useState("0");
  const [saves, setSaves] = useState("0");

  useEffect(() => {
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
  }, []);

  function openTransportSignup() {
    if (!nextMatch) return;
    setTransportSignupOpen(true);
  }

  async function saveStats() {
    if (!pendingMatch) return;
    const fd = new FormData();
    fd.set("match_id", String(pendingMatch.match_id));
    fd.set("goals", goals);
    fd.set("assists", assists);
    fd.set("distance", distance);
    fd.set("saves", saves);
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

  const tiles = (
    <div className="mx-auto grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3">
      <PitchTile href="/terminarz" icon={CalendarDays} title="Terminarz" desc="Mecze, zapisy, terminy" />
      <PitchTile href="/platnosci" icon={Wallet} title="Płatności" desc="BLIK i status wpłaty za mecz" />
      <PitchTile href="/pilkarze" icon={Users} title="Piłkarze" desc="Skład i profile" />
      {isLoggedIn && (
        <>
          <PitchTile href="/statystyki" icon={Activity} title="Statystyki" desc="Twoje liczby z boiska" />
          <PitchTile href="/rankingi" icon={Trophy} title="Rankingi" desc="Gole, asysty, punkty" variant="gold" />
        </>
      )}
      {!isLoggedIn && (
        <>
          <PitchTile href="/login" icon={LogIn} title="Logowanie" desc="Wejdź do szatni" />
          <PitchTile href="/register" icon={UserPlus} title="Rejestracja" desc="Dołącz do drużyny" />
        </>
      )}
      {isLoggedIn && (
        <>
          <LogoutPitchTile onClick={() => setLogoutOpen(true)} />
          {isAdmin && (
            <PitchTile href="/panel-admina" icon={Shield} title="Panel admina" desc="Zarządzanie akademią" />
          )}
        </>
      )}
      {isLoggedIn && userSigned && showTransportOnHome && nextMatch && (
        <PitchTile
          href={`/transport/${nextMatch.id}`}
          icon={Car}
          title="Transport na mecz"
          desc="Lista kierowców, potrzebujących dojazdu i czat"
        />
      )}
    </div>
  );

  return (
    <div className="flex flex-1 flex-col">
      <div className="container mx-auto max-w-5xl flex-1 px-4 py-8 text-center sm:py-10">
        {isLoggedIn && (
          <div className="mb-8 flex items-center justify-center gap-4">
            <PlayerAvatar
              photoPath={profilePhotoPath}
              firstName={firstName}
              lastName={lastName}
              size="lg"
              className="shadow-md"
            />
            <div className="text-left">
              <h2 className="text-2xl font-semibold text-emerald-950">Witaj!</h2>
              <p className="text-lg font-medium text-emerald-900">
                {`${firstName} ${lastName}`.trim() || zawodnik}
              </p>
              {zawodnik && `${firstName} ${lastName}`.trim() ? (
                <p className="text-sm text-zinc-600">{zawodnik}</p>
              ) : null}
            </div>
          </div>
        )}

        <div className="relative mx-auto max-w-2xl">
          <div className="pitch-rule mx-auto mb-5 w-40 sm:w-48" />
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-5">
            <Image
              src="/soccer-ball.svg"
              alt=""
              width={56}
              height={56}
              className="h-12 w-12 drop-shadow-sm sm:h-14 sm:w-14"
              unoptimized
            />
            <h1 className="text-3xl font-bold tracking-tight text-emerald-950 sm:text-4xl">Zostań gwiazdą boiska</h1>
            <Image
              src="/soccer-ball.svg"
              alt=""
              width={56}
              height={56}
              className="h-12 w-12 scale-x-[-1] drop-shadow-sm sm:h-14 sm:w-14"
              unoptimized
            />
          </div>
          <p className="mt-4 text-base text-zinc-600 sm:text-lg">
            {isLoggedIn ? "Wybierz, co chcesz zrobić" : "Zaloguj się lub załóż konto, aby korzystać z systemu"}
          </p>
        </div>

        <div className="mt-8">{tiles}</div>

        {nextMatch && (
          <div className="relative mx-auto mt-8 max-w-lg overflow-hidden rounded-2xl border-2 border-white/35 text-center shadow-lg shadow-emerald-950/15 ring-1 ring-emerald-950/20">
            <div className="home-pitch-tile absolute inset-0" aria-hidden />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-white/40" aria-hidden />
            <div className="pointer-events-none absolute bottom-0 left-0 h-10 w-10 rounded-tr-full border-t-2 border-r-2 border-white/45" aria-hidden />
            <div className="pointer-events-none absolute bottom-0 right-0 h-10 w-10 rounded-tl-full border-t-2 border-l-2 border-white/45" aria-hidden />
            <div className="relative px-5 py-5 text-white">
              <div className="mb-3 flex items-center justify-center gap-2">
                <Image src="/logo-akademia.svg" alt="" width={32} height={32} className="h-8 w-8 drop-shadow" unoptimized />
                <h3 className="text-lg font-bold tracking-tight drop-shadow-sm">Najbliższy mecz</h3>
              </div>
              <p className="mt-1 font-semibold text-emerald-50">
                {nextMatch.match_date} · {nextMatch.match_time}
              </p>
              <p className="mt-1 text-sm text-emerald-100/95">{nextMatch.location}</p>
              <p className="mt-2 text-xs font-medium uppercase tracking-wider text-white/75">
                Zapisy {nextMatch.signed_up}/{nextMatch.max_slots}
              </p>
              {isLoggedIn ? (
                userSigned ? (
                  <div className="mt-4 rounded-xl border border-white/30 bg-white/15 py-3 text-sm font-medium text-white backdrop-blur-sm">
                    Jesteś zapisany na ten mecz
                  </div>
                ) : (
                  <Button
                    className="mt-4 w-full border-0 bg-white font-semibold text-emerald-900 shadow-md hover:bg-emerald-50"
                    onClick={openTransportSignup}
                  >
                    Zapisz się na mecz
                  </Button>
                )
              ) : (
                <Button className="mt-4 w-full border border-white/40 bg-white/10 font-semibold text-white backdrop-blur-sm hover:bg-white/20" asChild>
                  <Link href="/login">Zaloguj się, aby się zapisać</Link>
                </Button>
              )}
              <div className="mt-4 border-t border-white/20 pt-4">
                {lineupPublicNextMatch ? (
                  <Button
                    className="w-full border-0 bg-emerald-100 font-semibold text-emerald-950 shadow-md hover:bg-white"
                    asChild
                  >
                    <Link href="/sklady" className="inline-flex items-center justify-center gap-2">
                      <LayoutGrid className="h-4 w-4 shrink-0" aria-hidden />
                      Zobacz składy na mecz
                    </Link>
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <Button
                      type="button"
                      disabled
                      aria-describedby="sklady-home-hint"
                      className="w-full cursor-not-allowed border border-white/25 bg-white/10 font-semibold text-white/70 opacity-80"
                      title="Administrator musi najpierw udostępnić składy w panelu admina."
                    >
                      <span className="inline-flex items-center justify-center gap-2">
                        <LayoutGrid className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                        Składy na mecz
                      </span>
                    </Button>
                    <p id="sklady-home-hint" className="text-center text-xs text-emerald-100/85">
                      Przycisk będzie aktywny, gdy administrator udostępni składy.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {nextMatch && (
        <MatchTransportSignupDialog
          open={transportSignupOpen}
          onOpenChange={setTransportSignupOpen}
          matchId={nextMatch.id}
          intent="signup"
          onCompleted={() => {
            setSignupOpen(true);
            router.refresh();
          }}
        />
      )}

      <Dialog open={signupOpen} onOpenChange={setSignupOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Zostałeś zapisany na mecz</DialogTitle>
            <DialogDescription asChild>
              <div className="text-emerald-900">
                {nextMatch && (
                  <>
                    <p>
                      📅 <strong>{nextMatch.match_date}</strong>
                    </p>
                    <p>🕒 {nextMatch.match_time}</p>
                    <p>📍 {nextMatch.location}</p>
                    <Link
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(nextMatch.location)}`}
                      target="_blank"
                      className="mt-2 inline-block text-emerald-700 underline"
                    >
                      Otwórz w Google Maps
                    </Link>
                  </>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setSignupOpen(false)}>Zamknij</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Wylogować się?</DialogTitle>
            <DialogDescription>Czy na pewno chcesz zakończyć sesję?</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setLogoutOpen(false)}>
              Nie
            </Button>
            <Button variant="destructive" asChild>
              <a href="/api/auth/logout">Tak</a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={statsOpen} onOpenChange={setStatsOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Uzupełnij statystyki</DialogTitle>
            <DialogDescription asChild>
              <div>
                {pendingMatch && (
                  <>
                    <p>📅 {pendingMatch.date}</p>
                    <p>🕒 {pendingMatch.time}</p>
                    <p>📍 {pendingMatch.location}</p>
                  </>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div>
              <Label>Gole</Label>
              <Input type="number" min={0} value={goals} onChange={(e) => setGoals(e.target.value)} />
            </div>
            <div>
              <Label>Asysty</Label>
              <Input type="number" min={0} value={assists} onChange={(e) => setAssists(e.target.value)} />
            </div>
            <div>
              <Label>Dystans (km)</Label>
              <Input
                type="number"
                min={0}
                step={0.1}
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
              />
            </div>
            <div>
              <Label>Obronione strzały</Label>
              <Input type="number" min={0} value={saves} onChange={(e) => setSaves(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={saveStats}>Zapisz statystyki</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
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
      className={`group relative block h-full min-h-[5.5rem] overflow-hidden rounded-2xl border-2 border-white/30 transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 ${tileFrame}`}
    >
      <div className={`absolute inset-0 ${bgClass}`} aria-hidden />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 bg-white/45"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute left-0 top-0 h-7 w-7 rounded-br-md border-b-2 border-r-2 border-white/40"
        aria-hidden
      />
      <div className="relative flex h-full items-center gap-3 px-4 py-3.5 text-left sm:gap-4 sm:px-4 sm:py-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15 ring-2 ring-white/35 backdrop-blur-[2px] sm:h-12 sm:w-12">
          <Icon className="h-5 w-5 text-white sm:h-6 sm:w-6" strokeWidth={2.25} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold tracking-tight text-white drop-shadow-sm sm:text-[1.05rem]">{title}</p>
          <p className={`mt-0.5 text-xs leading-snug sm:text-sm ${descMuted}`}>{desc}</p>
        </div>
        <ChevronRight
          className="h-5 w-5 shrink-0 text-white/50 transition-all group-hover:translate-x-0.5 group-hover:text-white/90"
          strokeWidth={2.5}
          aria-hidden
        />
      </div>
    </Link>
  );
}

function LogoutPitchTile({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative block h-full min-h-[5.5rem] w-full overflow-hidden rounded-2xl border-2 border-dashed border-white/35 bg-emerald-950/25 text-left shadow-md shadow-emerald-950/10 ring-1 ring-white/15 transition-[transform,box-shadow] hover:-translate-y-0.5 hover:bg-emerald-950/35 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-80 bg-[repeating-linear-gradient(105deg,transparent,transparent_10px,rgba(255,255,255,0.04)_10px,rgba(255,255,255,0.04)_20px)]"
        aria-hidden
      />
      <div className="relative flex h-full items-center gap-3 px-4 py-3.5 sm:gap-4 sm:px-4 sm:py-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 ring-2 ring-white/25 sm:h-12 sm:w-12">
          <LogOut className="h-5 w-5 text-white/90 sm:h-6 sm:w-6" strokeWidth={2.25} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold tracking-tight text-white sm:text-[1.05rem]">Wyloguj się</p>
          <p className="mt-0.5 text-xs text-emerald-100/80 sm:text-sm">Zakończ sesję</p>
        </div>
        <ChevronRight
          className="h-5 w-5 shrink-0 text-white/40 transition-all group-hover:translate-x-0.5 group-hover:text-white/75"
          strokeWidth={2.5}
          aria-hidden
        />
      </div>
    </button>
  );
}
