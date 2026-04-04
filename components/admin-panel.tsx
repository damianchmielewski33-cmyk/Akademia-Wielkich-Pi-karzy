"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const API = {
  summary: "/api/admin/summary",
  activity: "/api/admin/activity",
  users: "/api/admin/users",
  user: (id: number) => `/api/admin/user/${id}`,
  userRole: (id: number) => `/api/admin/user/${id}/role`,
  matches: "/api/admin/matches",
  match: (id: number) => `/api/admin/match/${id}`,
  stats: "/api/admin/stats",
  stat: (id: number) => `/api/admin/stat/${id}`,
};

type UserRow = {
  id: number;
  first_name: string;
  last_name: string;
  zawodnik: string;
  role: string;
};

type MatchRow = {
  id: number;
  date: string;
  time: string;
  location: string;
  players_count: number;
};

type StatRow = {
  id: number;
  zawodnik: string;
  match_id: number;
  goals: number;
  assists: number;
  distance: number;
  saves: number;
};

export function AdminPanel() {
  const [tab, setTab] = useState("dashboard");
  const [summary, setSummary] = useState<{ players: number; matches: number; stats: number } | null>(
    null
  );
  const [activity, setActivity] = useState<{ text: string; time: string }[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [stats, setStats] = useState<StatRow[]>([]);

  const loadDashboard = useCallback(async () => {
    try {
      const [s, a] = await Promise.all([fetch(API.summary), fetch(API.activity)]);
      if (!s.ok || !a.ok) throw new Error();
      setSummary(await s.json());
      setActivity(await a.json());
    } catch {
      toast.error("Blad dashboardu");
    }
  }, []);

  const loadUsers = useCallback(async () => {
    const res = await fetch(API.users);
    if (!res.ok) return toast.error("Blad uzytkownikow");
    setUsers(await res.json());
  }, []);

  const loadMatches = useCallback(async () => {
    const res = await fetch(API.matches);
    if (!res.ok) return toast.error("Blad meczow");
    setMatches(await res.json());
  }, []);

  const loadStats = useCallback(async () => {
    const res = await fetch(API.stats);
    if (!res.ok) return toast.error("Blad statystyk");
    setStats(await res.json());
  }, []);

  useEffect(() => {
    if (tab === "dashboard") loadDashboard();
    if (tab === "users") loadUsers();
    if (tab === "matches") loadMatches();
    if (tab === "stats") loadStats();
  }, [tab, loadDashboard, loadUsers, loadMatches, loadStats]);

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="border-b border-emerald-100 bg-emerald-950 p-4 text-white md:w-56 md:border-b-0 md:border-r">
        <div className="mb-6 flex items-center gap-2 font-bold">
          <span>⚽</span> Panel admina
        </div>
        <nav className="flex flex-col gap-1">
          <TabBtn active={tab === "dashboard"} onClick={() => setTab("dashboard")}>
            Dashboard
          </TabBtn>
          <TabBtn active={tab === "users"} onClick={() => setTab("users")}>
            Uzytkownicy
          </TabBtn>
          <TabBtn active={tab === "matches"} onClick={() => setTab("matches")}>
            Mecze
          </TabBtn>
          <TabBtn active={tab === "stats"} onClick={() => setTab("stats")}>
            Statystyki
          </TabBtn>
        </nav>
        <div className="mt-8 space-y-2 border-t border-emerald-800 pt-4">
          <Link href="/" className="block text-sm text-emerald-200 hover:text-white">
            Powrot
          </Link>
          <a href="/api/auth/logout" className="block text-sm text-emerald-200 hover:text-white">
            Wyloguj
          </a>
        </div>
      </aside>
      <main className="flex-1 bg-emerald-50/30 p-6">
        {tab === "dashboard" && (
          <DashboardView summary={summary} activity={activity} onReload={loadDashboard} />
        )}
        {tab === "users" && <UsersView users={users} onReload={loadUsers} />}
        {tab === "matches" && <MatchesView matches={matches} onReload={loadMatches} />}
        {tab === "stats" && <StatsView stats={stats} onReload={loadStats} />}
      </main>
    </div>
  );
}

function TabBtn({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-2 text-left text-sm ${active ? "bg-emerald-700" : "hover:bg-emerald-900"}`}
    >
      {children}
    </button>
  );
}

function DashboardView({
  summary,
  activity,
  onReload,
}: {
  summary: { players: number; matches: number; stats: number } | null;
  activity: { text: string; time: string }[];
  onReload: () => void;
}) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-emerald-950">Dashboard</h1>
      <Button className="mt-2" size="sm" variant="outline" onClick={onReload}>
        Odswiez
      </Button>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Gracze</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{summary?.players ?? "–"}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mecze</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{summary?.matches ?? "–"}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Statystyki</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{summary?.stats ?? "–"}</CardContent>
        </Card>
      </div>
      <h2 className="mt-10 text-lg font-semibold">Ostatnie aktywnosci</h2>
      <ul className="mt-2 list-inside list-disc text-sm text-emerald-900">
        {activity.map((item, i) => (
          <li key={i}>
            {item.text} — {item.time}
          </li>
        ))}
      </ul>
    </div>
  );
}

function UsersView({ users, onReload }: { users: UserRow[]; onReload: () => void }) {
  const [edit, setEdit] = useState<UserRow | null>(null);
  const [roleUser, setRoleUser] = useState<UserRow | null>(null);
  const [del, setDel] = useState<number | null>(null);

  return (
    <div>
      <h1 className="text-2xl font-bold text-emerald-950">Uzytkownicy</h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Imie</TableHead>
            <TableHead>Nazwisko</TableHead>
            <TableHead>Zawodnik</TableHead>
            <TableHead>Rola</TableHead>
            <TableHead>Akcje</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u.id}>
              <TableCell>{u.first_name}</TableCell>
              <TableCell>{u.last_name}</TableCell>
              <TableCell>{u.zawodnik}</TableCell>
              <TableCell>{u.role}</TableCell>
              <TableCell className="space-x-2">
                <Button size="sm" variant="secondary" onClick={() => setEdit(u)}>
                  Edytuj
                </Button>
                <Button size="sm" variant="destructive" onClick={() => setDel(u.id)}>
                  Usun
                </Button>
                <Button size="sm" variant="outline" onClick={() => setRoleUser(u)}>
                  Rola
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={Boolean(edit)} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          {edit && (
            <UserEditForm
              user={edit}
              onClose={() => setEdit(null)}
              onSaved={() => {
                setEdit(null);
                onReload();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={roleUser != null} onOpenChange={(o) => !o && setRoleUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Zmiana roli</DialogTitle>
          </DialogHeader>
          {roleUser && (
            <p className="text-sm">
              Aktualna: <strong>{roleUser.role}</strong>
            </p>
          )}
          <DialogFooter className="gap-2">
            <Button
              onClick={async () => {
                if (!roleUser) return;
                await fetch(API.userRole(roleUser.id), {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ role: "player" }),
                });
                setRoleUser(null);
                onReload();
              }}
            >
              Gracz
            </Button>
            <Button
              variant="secondary"
              onClick={async () => {
                if (!roleUser) return;
                await fetch(API.userRole(roleUser.id), {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ role: "admin" }),
                });
                setRoleUser(null);
                onReload();
              }}
            >
              Admin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={del != null} onOpenChange={(o) => !o && setDel(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Usun uzytkownika</DialogTitle>
          </DialogHeader>
          <p className="text-sm">Na pewno #{del}?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDel(null)}>
              Anuluj
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (del == null) return;
                await fetch(API.user(del), { method: "DELETE" });
                setDel(null);
                onReload();
              }}
            >
              Usun
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function UserEditForm({
  user,
  onClose,
  onSaved,
}: {
  user: UserRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [first_name, setFn] = useState(user.first_name);
  const [last_name, setLn] = useState(user.last_name);
  const [zawodnik, setZ] = useState(user.zawodnik);
  const [role, setRole] = useState(user.role);

  return (
    <>
      <DialogHeader>
        <DialogTitle>Edytuj uzytkownika</DialogTitle>
      </DialogHeader>
      <div className="space-y-3 py-2">
        <div>
          <Label>Imie</Label>
          <Input className="mt-1" value={first_name} onChange={(e) => setFn(e.target.value)} />
        </div>
        <div>
          <Label>Nazwisko</Label>
          <Input className="mt-1" value={last_name} onChange={(e) => setLn(e.target.value)} />
        </div>
        <div>
          <Label>Zawodnik</Label>
          <Input className="mt-1" value={zawodnik} onChange={(e) => setZ(e.target.value)} />
        </div>
        <div>
          <Label>Rola</Label>
          <select
            className="mt-1 w-full rounded-md border border-emerald-200 p-2 text-sm"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="admin">admin</option>
            <option value="player">gracz</option>
          </select>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Anuluj
        </Button>
        <Button
          onClick={async () => {
            await fetch(API.user(user.id), {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ first_name, last_name, zawodnik, role }),
            });
            onSaved();
          }}
        >
          Zapisz
        </Button>
      </DialogFooter>
    </>
  );
}

function MatchesView({ matches, onReload }: { matches: MatchRow[]; onReload: () => void }) {
  const [editId, setEditId] = useState<number | null>(null);
  const [editRow, setEditRow] = useState<MatchRow | null>(null);
  const [delId, setDelId] = useState<number | null>(null);

  async function openEdit(id: number) {
    const res = await fetch(API.match(id));
    if (!res.ok) return;
    const m = await res.json();
    setEditRow({
      id,
      date: m.date,
      time: m.time,
      location: m.location,
      players_count: 0,
    });
    setEditId(id);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Mecze</h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Data</TableHead>
            <TableHead>Godzina</TableHead>
            <TableHead>Miejsce</TableHead>
            <TableHead>Zapisani</TableHead>
            <TableHead>Akcje</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {matches.map((m) => (
            <TableRow key={m.id}>
              <TableCell>{m.id}</TableCell>
              <TableCell>{m.date}</TableCell>
              <TableCell>{m.time}</TableCell>
              <TableCell>{m.location}</TableCell>
              <TableCell>{m.players_count}</TableCell>
              <TableCell className="space-x-2">
                <Button size="sm" variant="secondary" onClick={() => openEdit(m.id)}>
                  Edytuj
                </Button>
                <Button size="sm" variant="destructive" onClick={() => setDelId(m.id)}>
                  Usun
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog
        open={editId != null}
        onOpenChange={(o) => {
          if (!o) {
            setEditId(null);
            setEditRow(null);
          }
        }}
      >
        <DialogContent>
          {editRow && (
            <MatchEditForm
              m={editRow}
              onClose={() => {
                setEditId(null);
                setEditRow(null);
              }}
              onSaved={() => {
                setEditId(null);
                setEditRow(null);
                onReload();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={delId != null} onOpenChange={(o) => !o && setDelId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Usun mecz</DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDelId(null)}>
              Anuluj
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (delId == null) return;
                await fetch(API.match(delId), { method: "DELETE" });
                setDelId(null);
                onReload();
              }}
            >
              Usun
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MatchEditForm({
  m,
  onClose,
  onSaved,
}: {
  m: MatchRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [date, setDate] = useState(m.date);
  const [time, setTime] = useState(m.time);
  const [location, setLoc] = useState(m.location);
  return (
    <>
      <DialogHeader>
        <DialogTitle>Edytuj mecz</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div>
          <Label>Data</Label>
          <Input type="date" className="mt-1" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <Label>Godzina</Label>
          <Input type="time" className="mt-1" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
        <div>
          <Label>Lokalizacja</Label>
          <Input className="mt-1" value={location} onChange={(e) => setLoc(e.target.value)} />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Anuluj
        </Button>
        <Button
          onClick={async () => {
            await fetch(API.match(m.id), {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ date, time, location }),
            });
            onSaved();
          }}
        >
          Zapisz
        </Button>
      </DialogFooter>
    </>
  );
}

function StatsView({ stats, onReload }: { stats: StatRow[]; onReload: () => void }) {
  const [editId, setEditId] = useState<number | null>(null);

  return (
    <div>
      <h1 className="text-2xl font-bold">Statystyki (wpisy)</h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Zawodnik</TableHead>
            <TableHead>Mecz</TableHead>
            <TableHead>G</TableHead>
            <TableHead>A</TableHead>
            <TableHead>D</TableHead>
            <TableHead>O</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {stats.map((s) => (
            <TableRow key={s.id}>
              <TableCell>{s.id}</TableCell>
              <TableCell>{s.zawodnik}</TableCell>
              <TableCell>{s.match_id}</TableCell>
              <TableCell>{s.goals}</TableCell>
              <TableCell>{s.assists}</TableCell>
              <TableCell>{s.distance}</TableCell>
              <TableCell>{s.saves ?? 0}</TableCell>
              <TableCell>
                <Button size="sm" onClick={() => setEditId(s.id)}>
                  Edytuj
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <StatEditDialog id={editId} onClose={() => setEditId(null)} onSaved={onReload} />
    </div>
  );
}

function StatEditDialog({
  id,
  onClose,
  onSaved,
}: {
  id: number | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [goals, setG] = useState("0");
  const [assists, setA] = useState("0");
  const [distance, setD] = useState("0");
  const [saves, setS] = useState("0");

  useEffect(() => {
    if (id == null) return;
    (async () => {
      const res = await fetch(API.stat(id));
      if (!res.ok) return;
      const s = await res.json();
      setG(String(s.goals));
      setA(String(s.assists));
      setD(String(s.distance));
      setS(String(s.saves ?? 0));
    })();
  }, [id]);

  return (
    <Dialog open={id != null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edytuj statystyki</DialogTitle>
        </DialogHeader>
        <div className="grid gap-2">
          <div>
            <Label>Gole</Label>
            <Input type="number" className="mt-1" value={goals} onChange={(e) => setG(e.target.value)} />
          </div>
          <div>
            <Label>Asysty</Label>
            <Input type="number" className="mt-1" value={assists} onChange={(e) => setA(e.target.value)} />
          </div>
          <div>
            <Label>Dystans</Label>
            <Input type="number" step={0.1} className="mt-1" value={distance} onChange={(e) => setD(e.target.value)} />
          </div>
          <div>
            <Label>Obrony</Label>
            <Input type="number" className="mt-1" value={saves} onChange={(e) => setS(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Anuluj
          </Button>
          <Button
            onClick={async () => {
              if (id == null) return;
              await fetch(API.stat(id), {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  goals: Number(goals),
                  assists: Number(assists),
                  distance: Number(distance),
                  saves: Number(saves),
                }),
              });
              onClose();
              onSaved();
            }}
          >
            Zapisz
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
