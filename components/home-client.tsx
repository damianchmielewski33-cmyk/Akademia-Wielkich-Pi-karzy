"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  userSigned: boolean;
  isLoggedIn: boolean;
  isAdmin: boolean;
  firstName: string;
  lastName: string;
};

export function HomeClient({
  nextMatch,
  userSigned,
  isLoggedIn,
  isAdmin,
  firstName,
  lastName,
}: Props) {
  const router = useRouter();
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

  async function signupFromHome() {
    if (!nextMatch) return;
    const res = await fetch(`/api/terminarz/signup/${nextMatch.id}`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) {
      router.push("/login");
      return;
    }
    if (!res.ok) {
      toast.error(typeof data.error === "string" ? data.error : "Nie udało się zapisać");
      return;
    }
    setSignupOpen(true);
    router.refresh();
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
      toast.error("Błąd zapisu statystyk");
    }
  }

  const tiles = (
    <div className="mx-auto grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2">
      <Tile href="/terminarz" icon="🗓️" title="Terminarz" desc="Mecze i zapisy" />
      <Tile href="/pilkarze" icon="👥" title="Piłkarze" desc="Lista zawodników" />
      <Tile href="/statystyki" icon="📊" title="Statystyki" desc="Twoje wyniki" />
      <Tile href="/rankingi" icon="🏆" title="Rankingi" desc="Gole, asysty, punkty" />
      {!isLoggedIn && (
        <>
          <Tile href="/login" icon="🔐" title="Logowanie" desc="Zaloguj się" />
          <Tile href="/register" icon="🆕" title="Rejestracja" desc="Załóż konto" />
        </>
      )}
      {isLoggedIn && (
        <>
          <LogoutTile onClick={() => setLogoutOpen(true)} />
          {isAdmin && (
            <Tile href="/panel-admina" icon="⚙️" title="Panel admina" desc="Zarządzanie" />
          )}
        </>
      )}
    </div>
  );

  return (
    <>
      <div className="container mx-auto max-w-5xl px-4 py-12 text-center">
        {isLoggedIn && (
          <div className="mb-8 flex items-center justify-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-xl font-bold text-white">
              {firstName[0]}
              {lastName[0]}
            </div>
            <h2 className="text-2xl font-semibold text-emerald-950">Witaj, {firstName}!</h2>
          </div>
        )}

        <h1 className="text-4xl font-bold tracking-tight text-emerald-950">⚽ Zostań Gwiazdą</h1>
        <p className="mt-3 text-lg text-emerald-800/80">
          {isLoggedIn ? "Wybierz, co chcesz zrobić" : "Zaloguj się lub załóż konto, aby korzystać z systemu"}
        </p>

        <div className="mt-10">{tiles}</div>

        {nextMatch && (
          <div className="mx-auto mt-10 max-w-lg rounded-2xl border border-emerald-100 bg-white/90 p-6 text-center shadow-sm">
            <h3 className="text-lg font-semibold text-emerald-950">Najbliższy mecz</h3>
            <p className="mt-2 font-medium">
              {nextMatch.match_date} – {nextMatch.match_time}
            </p>
            <p className="text-emerald-800/80">📍 {nextMatch.location}</p>
            <p className="text-sm text-emerald-800/80">
              👥 {nextMatch.signed_up}/{nextMatch.max_slots}
            </p>
            {isLoggedIn ? (
              userSigned ? (
                <div className="mt-4 rounded-xl bg-emerald-100 py-3 text-emerald-900">
                  Jesteś zapisany na ten mecz
                </div>
              ) : (
                <Button className="mt-4 w-full" onClick={signupFromHome}>
                  Zapisz się na mecz
                </Button>
              )
            ) : (
              <Button className="mt-4 w-full" asChild variant="secondary">
                <Link href="/login">Zaloguj się, aby się zapisać</Link>
              </Button>
            )}
          </div>
        )}
      </div>

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
    </>
  );
}

function Tile({
  href,
  icon,
  title,
  desc,
}: {
  href: string;
  icon: string;
  title: string;
  desc: string;
}) {
  return (
    <Link href={href}>
      <Card className="h-full transition hover:shadow-md">
        <CardHeader>
          <div className="text-3xl">{icon}</div>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription>{desc}</CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    </Link>
  );
}

function LogoutTile({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="text-left">
      <Card className="h-full transition hover:shadow-md">
        <CardHeader>
          <div className="text-3xl">🚪</div>
          <CardTitle className="text-xl">Wyloguj się</CardTitle>
          <CardDescription>Zakończ sesję</CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    </button>
  );
}
