import Link from "next/link";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { getServerSession } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function StatystykiPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  const db = getDb();
  const totalMatches = (db.prepare("SELECT COUNT(*) AS c FROM matches").get() as { c: number }).c;
  const playedMatches = (
    db.prepare("SELECT COUNT(*) AS c FROM matches WHERE played = 1").get() as { c: number }
  ).c;
  const upcomingMatches = (
    db
      .prepare(
        "SELECT COUNT(*) AS c FROM matches WHERE match_date >= date('now') AND played = 0"
      )
      .get() as { c: number }
  ).c;
  const playersCount = (db.prepare("SELECT COUNT(*) AS c FROM users").get() as { c: number }).c;

  const userStats = db
    .prepare(
      "SELECT m.match_date, m.match_time, m.location, s.goals, s.assists, s.distance, s.saves " +
        "FROM match_stats s JOIN matches m ON m.id = s.match_id WHERE s.user_id = ? " +
        "ORDER BY m.match_date DESC, m.match_time DESC"
    )
    .all(session.userId) as {
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
    <div className="container mx-auto max-w-5xl px-4 py-10">
      <Link href="/" className="mb-6 inline-block font-medium text-emerald-700 hover:underline">
        Powrot
      </Link>
      <h1 className="text-center text-3xl font-bold text-emerald-950">Nasze Mecze</h1>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Wszyscy gracze" value={playersCount} />
        <StatCard title="Wszystkie mecze" value={totalMatches} />
        <StatCard title="Rozegrane mecze" value={playedMatches} />
        <StatCard title="Nadchodzace mecze" value={upcomingMatches} />
      </div>

      <h2 className="mt-12 text-center text-2xl font-semibold text-emerald-950">Twoje statystyki</h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard title="Rozegrane mecze" value={userStats.length} />
        <StatCard title="Gole" value={sumGoals} />
        <StatCard title="Asysty" value={sumAssists} />
        <StatCard title="Dystans (km)" value={sumDist.toFixed(1)} />
        <StatCard title="Obronione strzaly" value={sumSaves} />
      </div>

      <h2 className="mt-12 text-center text-2xl font-semibold text-emerald-950">Twoje mecze</h2>
      {userStats.length === 0 ? (
        <p className="mt-8 text-center text-lg text-emerald-800/70">Brak zapisanych statystyk.</p>
      ) : (
        <div className="mt-6">
          <Table>
            <TableHeader>
              <TableRow>
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
                <TableRow key={i}>
                  <TableCell>{s.match_date}</TableCell>
                  <TableCell>{s.match_time}</TableCell>
                  <TableCell>{s.location}</TableCell>
                  <TableCell>{s.goals}</TableCell>
                  <TableCell>{s.assists}</TableCell>
                  <TableCell>{s.distance.toFixed(1)}</TableCell>
                  <TableCell>{s.saves ?? 0}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: string | number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium text-emerald-800/80">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold text-emerald-900">{value}</p>
      </CardContent>
    </Card>
  );
}
