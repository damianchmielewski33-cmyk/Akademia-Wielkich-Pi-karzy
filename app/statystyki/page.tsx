import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import type { ComponentType } from "react";
import {
  Activity,
  CalendarClock,
  CalendarRange,
  CheckCircle2,
  Route,
  Share2,
  Shield,
  Target,
  Users,
} from "lucide-react";
import { getAccountNavFields } from "@/lib/account-server";
import { getServerSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { PlayerAvatar, PlayerNameStack } from "@/components/player-avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata: Metadata = {
  title: "Statystyki",
  description: "Twoje gole, asysty, dystans i obrony z rozegranych meczów.",
};

export default async function StatystykiPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  const db = await getDb();
  const totalMatches = (await db.prepare("SELECT COUNT(*) AS c FROM matches").get() as { c: number }).c;
  const playedMatches = (
    await db.prepare("SELECT COUNT(*) AS c FROM matches WHERE played = 1").get() as { c: number }
  ).c;
  const upcomingMatches = (
    (await db
      .prepare(
        "SELECT COUNT(*) AS c FROM matches WHERE match_date >= date('now') AND played = 0"
      )
      .get()) as { c: number }
  ).c;
  const playersCount = (await db.prepare("SELECT COUNT(*) AS c FROM users").get() as { c: number }).c;

  const nav = await getAccountNavFields(session.userId);
  const me = {
    first_name: nav?.firstName ?? session.firstName,
    last_name: nav?.lastName ?? session.lastName,
    player_alias: nav?.zawodnik ?? session.zawodnik,
    profile_photo_path: nav?.profilePhotoPath ?? null,
  };

  const userStats = (await db
    .prepare(
      "SELECT m.match_date, m.match_time, m.location, s.goals, s.assists, s.distance, s.saves " +
        "FROM match_stats s JOIN matches m ON m.id = s.match_id WHERE s.user_id = ? " +
        "ORDER BY m.match_date DESC, m.match_time DESC"
    )
    .all(session.userId)) as {
    match_date: string;
    match_time: string;
    location: string;
    goals: number;
    assists: number;
    distance: number;
    saves: number;
  }[];

  const sumGoals = userStats.reduce((a, r) => a + r.goals, 0);
  const sumAssists = userStats.reduce((a, r) => a + r.assists, 0);
  const sumDist = userStats.reduce((a, r) => a + r.distance, 0);
  const sumSaves = userStats.reduce((a, r) => a + (r.saves ?? 0), 0);

  return (
    <div className="container mx-auto max-w-5xl flex-1 px-4 py-8 text-center sm:py-10">
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
          <h1 className="text-3xl font-bold tracking-tight text-emerald-950 sm:text-4xl">Nasze mecze</h1>
          <Image
            src="/soccer-ball.svg"
            alt=""
            width={56}
            height={56}
            className="h-12 w-12 scale-x-[-1] drop-shadow-sm sm:h-14 sm:w-14"
            unoptimized
          />
        </div>
        <p className="mt-4 text-base text-zinc-600 sm:text-lg">Podsumowanie ligi i Twoje statystyki</p>
      </div>

      <div className="mx-auto mt-8 flex max-w-md items-center justify-center gap-4 rounded-2xl border border-emerald-200/80 bg-emerald-50/40 px-5 py-4">
        <PlayerAvatar
          photoPath={me.profile_photo_path}
          firstName={me.first_name}
          lastName={me.last_name}
          size="lg"
          ringClassName="ring-2 ring-emerald-300/80"
        />
        <PlayerNameStack
          firstName={me.first_name}
          lastName={me.last_name}
          nick={me.player_alias}
          primaryClassName="text-lg font-semibold text-emerald-950"
          secondaryClassName="text-sm text-zinc-600"
        />
      </div>

      <h2 className="mt-10 text-xl font-bold tracking-tight text-emerald-950 sm:text-2xl">Liga</h2>
      <div className="pitch-rule mx-auto mt-3 w-24 opacity-80" />

      <div className="mx-auto mt-6 grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <PitchStatCard title="Wszyscy gracze" value={playersCount} icon={Users} />
        <PitchStatCard title="Wszystkie mecze" value={totalMatches} icon={CalendarRange} />
        <PitchStatCard title="Rozegrane mecze" value={playedMatches} icon={CheckCircle2} />
        <PitchStatCard title="Nadchodzące mecze" value={upcomingMatches} icon={CalendarClock} />
      </div>

      <h2 className="mt-12 text-xl font-bold tracking-tight text-emerald-950 sm:text-2xl">Twoje statystyki</h2>
      <div className="pitch-rule mx-auto mt-3 w-24 opacity-80" />

      <div className="mx-auto mt-6 grid max-w-4xl grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <PitchStatCard title="Rozegrane mecze" value={userStats.length} icon={Activity} />
        <PitchStatCard title="Gole" value={sumGoals} icon={Target} variant="gold" />
        <PitchStatCard title="Asysty" value={sumAssists} icon={Share2} />
        <PitchStatCard title="Dystans (km)" value={sumDist.toFixed(1)} icon={Route} />
        <PitchStatCard title="Obronione strzały" value={sumSaves} icon={Shield} />
      </div>

      <h2 className="mt-12 text-xl font-bold tracking-tight text-emerald-950 sm:text-2xl">Twoje mecze</h2>
      <div className="pitch-rule mx-auto mt-3 w-24 opacity-80" />

      {userStats.length === 0 ? (
        <div className="relative mx-auto mt-6 max-w-2xl overflow-hidden rounded-2xl border-2 border-white/30 shadow-lg shadow-emerald-950/15 ring-1 ring-emerald-950/15">
          <div className="home-pitch-tile absolute inset-0" aria-hidden />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-white/40" aria-hidden />
          <p className="relative px-6 py-10 text-base font-medium text-emerald-50">
            Brak zapisanych statystyk z meczów.
          </p>
        </div>
      ) : (
        <div className="relative mx-auto mt-6 max-w-5xl overflow-hidden rounded-2xl border-2 border-white/35 shadow-lg shadow-emerald-950/15 ring-1 ring-emerald-950/15">
          <div className="home-pitch-tile absolute inset-0 opacity-[0.22]" aria-hidden />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-white/45" aria-hidden />
          <div className="pointer-events-none absolute bottom-0 left-0 h-9 w-9 rounded-tr-full border-t-2 border-r-2 border-white/40" aria-hidden />
          <div className="pointer-events-none absolute bottom-0 right-0 h-9 w-9 rounded-tl-full border-t-2 border-l-2 border-white/40" aria-hidden />
          <div className="relative rounded-[0.85rem] bg-white/98 p-0.5 backdrop-blur-[2px]">
            <div className="overflow-hidden rounded-[0.8rem] border border-emerald-900/10 bg-white">
              <Table>
                <TableHeader className="border-b-0 bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-950 text-white [&_th]:border-white/10 [&_th]:text-white">
                  <TableRow className="border-0 hover:bg-transparent">
                    <TableHead>Data</TableHead>
                    <TableHead>Godzina</TableHead>
                    <TableHead>Lokalizacja</TableHead>
                    <TableHead>Gole</TableHead>
                    <TableHead>Asysty</TableHead>
                    <TableHead>Dystans</TableHead>
                    <TableHead>Obrony</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userStats.map((s, i) => (
                    <TableRow
                      key={i}
                      className={
                        i % 2 === 0
                          ? "border-emerald-100/80 bg-emerald-50/35 hover:bg-emerald-50/55"
                          : "border-emerald-100/80 hover:bg-emerald-50/40"
                      }
                    >
                      <TableCell className="font-medium text-emerald-950">{s.match_date}</TableCell>
                      <TableCell>{s.match_time}</TableCell>
                      <TableCell className="max-w-[200px] truncate sm:max-w-none">{s.location}</TableCell>
                      <TableCell className="tabular-nums">{s.goals}</TableCell>
                      <TableCell className="tabular-nums">{s.assists}</TableCell>
                      <TableCell className="tabular-nums">{s.distance.toFixed(1)}</TableCell>
                      <TableCell className="tabular-nums">{s.saves ?? 0}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PitchStatCard({
  title,
  value,
  icon: Icon,
  variant = "pitch",
}: {
  title: string;
  value: string | number;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  variant?: "pitch" | "gold";
}) {
  const bgClass = variant === "gold" ? "home-pitch-tile-gold" : "home-pitch-tile";
  const tileFrame =
    variant === "gold"
      ? "shadow-md shadow-amber-950/20 ring-1 ring-amber-950/20"
      : "shadow-md shadow-emerald-950/12 ring-1 ring-emerald-950/10";

  return (
    <div
      className={`relative min-h-[5.75rem] overflow-hidden rounded-2xl border-2 border-white/30 text-left ${tileFrame}`}
    >
      <div className={`absolute inset-0 ${bgClass}`} aria-hidden />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 bg-white/45" aria-hidden />
      <div
        className="pointer-events-none absolute left-0 top-0 h-6 w-6 rounded-br-md border-b-2 border-r-2 border-white/40"
        aria-hidden
      />
      <div className="relative flex flex-col gap-2 px-4 py-3.5 sm:px-4 sm:py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 ring-2 ring-white/35 backdrop-blur-[2px] sm:h-11 sm:w-11">
            <Icon className="h-[1.15rem] w-[1.15rem] text-white sm:h-5 sm:w-5" strokeWidth={2.25} />
          </div>
          <p className="min-w-0 text-xs font-bold uppercase leading-snug tracking-wide text-white/95 sm:text-[0.8rem]">
            {title}
          </p>
        </div>
        <p className="text-2xl font-bold tabular-nums tracking-tight text-white drop-shadow-sm sm:text-3xl">
          {value}
        </p>
      </div>
    </div>
  );
}
