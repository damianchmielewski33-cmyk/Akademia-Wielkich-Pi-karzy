import type { ReactNode } from "react";
import type { AwpSurface } from "@/lib/platform-ecosystem";
import { cn } from "@/lib/utils";

export const MOCKUP_SCREENS = [
  "landing",
  "dashboard",
  "map",
  "profile",
  "wallet",
  "matches",
  "match",
  "stats",
  "ranking",
  "admin",
  "broadcasts",
  "gallery",
  "bookings",
] as const;

export type MockupScreenId = (typeof MOCKUP_SCREENS)[number];

export const MOCKUP_SCREEN_LABEL: Record<MockupScreenId, string> = {
  landing: "Landing",
  dashboard: "Dashboard",
  map: "Mapa boisk",
  profile: "Profil gracza",
  wallet: "Portfel",
  matches: "Mecze",
  match: "Szczegóły meczu",
  stats: "Statystyki",
  ranking: "Ranking",
  admin: "Panel admina",
  broadcasts: "Transmisje",
  gallery: "Galerie",
  bookings: "Rezerwacje",
};

const isWeb = (s: AwpSurface) => s.startsWith("web");
const isPhone = (s: AwpSurface) => s === "ios" || s === "android" || s === "web-mobile";
const isDesktop = (s: AwpSurface) => s === "web-desktop";

function WebNav({ dense }: { dense: boolean }) {
  const items = dense
    ? ["Mecze", "Mapa", "Portfel", "Ja"]
    : ["Start", "Mapa", "Mecze", "Ranking", "Statystyki", "Portfel", "Admin"];
  return (
    <div className="flex items-center justify-between border-b border-white/10 bg-[#0b1a3a]/90 px-4 py-3 backdrop-blur">
      <span className="font-[family-name:var(--font-display)] text-xl tracking-wide text-[var(--mundial-gold)]">
        AWP
      </span>
      <div className="flex gap-1">
        {items.map((item) => (
          <span
            key={item}
            className="rounded-lg px-2 py-1 text-[11px] font-semibold text-white/80"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function NativeTabs({ surface, active }: { surface: AwpSurface; active: string }) {
  const tabs =
    surface === "ios"
      ? ["Mecze", "Portfel", "Live", "Ja"]
      : ["Start", "Terminarz", "Portfel", "Profil"];
  return (
    <div
      className={cn(
        "grid grid-cols-4 border-t border-white/10 bg-black/40 px-2 py-2 text-[10px] font-semibold",
        surface === "ios" ? "pb-6" : "pb-3"
      )}
    >
      {tabs.map((t) => (
        <span
          key={t}
          className={cn(
            "rounded-lg py-2 text-center",
            t === active ? "bg-white/15 text-[var(--mundial-gold)]" : "text-white/60"
          )}
        >
          {t}
        </span>
      ))}
    </div>
  );
}

function Shell({
  surface,
  title,
  tab,
  children,
}: {
  surface: AwpSurface;
  title: string;
  tab: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col bg-[linear-gradient(180deg,#0b1a3a_0%,#061410_42%)]">
      {isWeb(surface) ? <WebNav dense={!isDesktop(surface)} /> : null}
      {!isWeb(surface) ? (
        <div className="px-5 pb-2 pt-10">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--mundial-gold)]">
            {surface === "ios" ? "iOS" : "Android"}
          </p>
          {title ? (
            <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-wide">{title}</h1>
          ) : null}
        </div>
      ) : title ? (
        <div className="px-5 py-4">
          <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-wide text-white">{title}</h1>
        </div>
      ) : (
        <div className="h-3" />
      )}
      <div className="flex-1 px-4 pb-4">{children}</div>
      {!isWeb(surface) ? <NativeTabs surface={surface} active={tab} /> : null}
    </div>
  );
}

function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md", className)}>
      {children}
    </div>
  );
}

export function MockupScreen({ surface, screen }: { surface: AwpSurface; screen: MockupScreenId }) {
  switch (screen) {
    case "landing":
      return <Landing surface={surface} />;
    case "dashboard":
      return <Dashboard surface={surface} />;
    case "map":
      return <MapView surface={surface} />;
    case "profile":
      return <Profile surface={surface} />;
    case "wallet":
      return <Wallet surface={surface} />;
    case "matches":
      return <Matches surface={surface} />;
    case "match":
      return <MatchDetail surface={surface} />;
    case "stats":
      return <Stats surface={surface} />;
    case "ranking":
      return <Ranking surface={surface} />;
    case "admin":
      return <Admin surface={surface} />;
    case "broadcasts":
      return <Broadcasts surface={surface} />;
    case "gallery":
      return <Gallery surface={surface} />;
    case "bookings":
      return <Bookings surface={surface} />;
    default:
      return null;
  }
}

function Landing({ surface }: { surface: AwpSurface }) {
  if (!isWeb(surface)) {
    return (
      <Shell surface={surface} title="Graj dziś" tab={surface === "ios" ? "Mecze" : "Start"}>
        <Card>
          <p className="text-[10px] uppercase tracking-widest text-[var(--mundial-gold)]">Za 6 godz.</p>
          <p className="mt-1 text-lg font-semibold">Orlik Bemowo · 18:00</p>
          <p className="text-sm text-white/70">14/16 · ok. 35 zł</p>
          <button
            type="button"
            className="mt-4 h-12 w-full rounded-2xl bg-[var(--mp-teal)] text-base font-bold text-white"
          >
            Gram
          </button>
        </Card>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Card className="py-6 text-center">
            <p className="font-[family-name:var(--font-display)] text-3xl">#4</p>
            <p className="text-xs text-white/60">Ranking</p>
          </Card>
          <Card className="py-6 text-center">
            <p className="font-[family-name:var(--font-display)] text-3xl">120</p>
            <p className="text-xs text-white/60">zł w portfelu</p>
          </Card>
        </div>
      </Shell>
    );
  }
  return (
    <Shell surface={surface} title="" tab="">
      <div className={cn("grid gap-4", isDesktop(surface) ? "grid-cols-12" : "grid-cols-1")}>
        <Card className={isDesktop(surface) ? "col-span-7 py-10" : "py-8"}>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--mundial-gold)]">Akademia Wielkich Piłkarzy</p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-5xl leading-none">
            Znajdź boisko. Zbierz skład.
          </h2>
          <p className="mt-3 max-w-md text-sm text-white/70">
            Składka liczona na żywo. Jeden login na WWW, iOS i Android.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <span className="rounded-xl bg-[var(--mp-teal)] px-5 py-3 text-sm font-bold">Znajdź boisko</span>
            <span className="rounded-xl border border-white/30 px-5 py-3 text-sm font-bold">Dołącz do meczu</span>
          </div>
        </Card>
        <Card className={isDesktop(surface) ? "col-span-5" : ""}>
          <p className="text-xs uppercase tracking-widest text-white/50">Najbliższe mecze</p>
          {["Bemowo 18:00 · 14/16", "Ursynów 20:00 · 8/10", "Wola 21:00 · 12/14"].map((row) => (
            <div key={row} className="mt-3 flex items-center justify-between border-t border-white/10 pt-3 text-sm">
              <span>{row}</span>
              <span className="text-[var(--mundial-gold)]">35 zł</span>
            </div>
          ))}
        </Card>
      </div>
    </Shell>
  );
}

function Dashboard({ surface }: { surface: AwpSurface }) {
  return (
    <Shell surface={surface} title="Cześć, Damian" tab={surface === "ios" ? "Mecze" : "Start"}>
      {isDesktop(surface) ? (
        <div className="grid grid-cols-12 gap-3">
          <Card className="col-span-8">
            <p className="text-xs text-[var(--mundial-gold)]">NAJBLIŻSZY MECZ</p>
            <p className="text-xl font-semibold">Orlik Bemowo · sobota 18:00</p>
            <div className="mt-4 h-24 rounded-xl bg-white/5" />
            <p className="mt-2 text-xs text-white/50">Frekwencja 14/16 · składka 35,00 zł · może spaść</p>
          </Card>
          <div className="col-span-4 space-y-3">
            <Card>
              <p className="text-xs text-white/50">Saldo</p>
              <p className="font-mono text-2xl">120,00 zł</p>
            </Card>
            <Card>
              <p className="text-xs text-white/50">Ranking sezon</p>
              <p className="font-[family-name:var(--font-display)] text-3xl">#4 · 86 pkt</p>
            </Card>
          </div>
          <Card className="col-span-12">
            <div className="grid grid-cols-4 gap-3 text-center text-sm">
              {["Zapisy", "Rezerwacje", "Finanse", "Raporty"].map((x) => (
                <div key={x} className="rounded-xl bg-white/5 py-4 font-semibold">
                  {x}
                </div>
              ))}
            </div>
          </Card>
        </div>
      ) : (
        <div className="space-y-3">
          <Card>
            <p className="text-xs text-[var(--mundial-gold)]">Dziś 18:00</p>
            <p className="font-semibold">Bemowo · 14/16</p>
            <button type="button" className="mt-3 h-12 w-full rounded-2xl bg-[var(--mp-teal)] font-bold">
              Potwierdź obecność
            </button>
          </Card>
          <div className="grid grid-cols-2 gap-2">
            <Card>
              <p className="font-mono text-xl">120 zł</p>
              <p className="text-xs text-white/50">Portfel</p>
            </Card>
            <Card>
              <p className="text-xl font-bold">#4</p>
              <p className="text-xs text-white/50">Sezon</p>
            </Card>
          </div>
        </div>
      )}
    </Shell>
  );
}

function MapView({ surface }: { surface: AwpSurface }) {
  return (
    <Shell surface={surface} title="Mapa boisk" tab="Start">
      {isDesktop(surface) ? (
        <div className="grid grid-cols-12 gap-3">
          <Card className="col-span-8 h-[460px]">
            <p className="text-xs text-white/50">Filtry: Warszawa · Orlik · 18–21 · do 200 zł</p>
            <div className="relative mt-3 h-[400px] overflow-hidden rounded-xl bg-emerald-950">
              <div className="absolute inset-6 rounded-full border border-white/20" />
              <div className="absolute left-1/3 top-1/3 h-4 w-4 rounded-full bg-[var(--mundial-gold)]" />
              <div className="absolute right-1/4 top-1/2 h-4 w-4 rounded-full bg-[var(--mp-teal)]" />
              <p className="absolute bottom-3 left-3 text-xs">OSM · 12 obiektów</p>
            </div>
          </Card>
          <div className="col-span-4 space-y-2">
            {["Orlik Bemowo", "Hala Wola", "Murawa Ursynów"].map((n) => (
              <Card key={n}>
                <p className="font-semibold">{n}</p>
                <p className="text-xs text-white/60">od 140 zł/h · 2 wolne sloty</p>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative h-72 overflow-hidden rounded-2xl bg-emerald-950">
            <div className="absolute left-1/2 top-1/3 h-5 w-5 -translate-x-1/2 rounded-full bg-[var(--mundial-gold)]" />
            <div className="absolute bottom-0 left-0 right-0 rounded-t-3xl bg-[#0b1a3a] p-4">
              <p className="font-semibold">Orlik Bemowo</p>
              <p className="text-xs text-white/60">18:00–19:00 · 160 zł · hold 10 min</p>
              <button type="button" className="mt-3 h-11 w-full rounded-xl bg-[var(--mp-teal)] font-bold">
                Rezerwuj
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}

function Profile({ surface }: { surface: AwpSurface }) {
  return (
    <Shell surface={surface} title="Profil" tab={surface === "android" ? "Profil" : "Ja"}>
      <div className={cn("grid gap-3", isDesktop(surface) ? "grid-cols-12" : "grid-cols-1")}>
        <Card className={isDesktop(surface) ? "col-span-4 text-center" : "text-center"}>
          <div className="mx-auto h-20 w-20 rounded-full bg-[var(--mp-teal)]/40" />
          <p className="mt-3 text-lg font-semibold">Damian · CAM</p>
          <p className="text-sm text-white/60">Sezon 2026 · 18 meczów</p>
        </Card>
        <Card className={isDesktop(surface) ? "col-span-8" : ""}>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              ["Gole", "11"],
              ["Asysty", "7"],
              ["MVP", "3"],
            ].map(([k, v]) => (
              <div key={k}>
                <p className="font-[family-name:var(--font-display)] text-3xl">{v}</p>
                <p className="text-xs text-white/50">{k}</p>
              </div>
            ))}
          </div>
          {isDesktop(surface) ? (
            <p className="mt-4 text-xs text-white/50">Historia 24 meczów · płatności tylko na Twoim profilu</p>
          ) : (
            <button type="button" className="mt-4 h-11 w-full rounded-xl bg-white/10 font-semibold">
              Edytuj zdjęcie
            </button>
          )}
        </Card>
      </div>
    </Shell>
  );
}

function Wallet({ surface }: { surface: AwpSurface }) {
  return (
    <Shell surface={surface} title="Portfel" tab="Portfel">
      <Card className="text-center">
        <p className="text-xs text-white/50">Dostępne</p>
        <p className="font-mono text-4xl">120,00 zł</p>
        {isPhone(surface) ? (
          <button type="button" className="mt-4 h-12 w-full rounded-2xl bg-[var(--mundial-gold)] font-bold text-[#0a1628]">
            Doładuj
          </button>
        ) : (
          <div className="mt-4 flex justify-center gap-2">
            <span className="rounded-xl bg-[var(--mundial-gold)] px-5 py-2 text-sm font-bold text-[#0a1628]">
              Doładuj
            </span>
            <span className="rounded-xl border border-white/20 px-5 py-2 text-sm">Historia ledger</span>
          </div>
        )}
      </Card>
      <div className="mt-3 space-y-2">
        {[
          ["HotPay +100,00", "+"],
          ["Składka Bemowo", "−"],
          ["Korekta +2 os.", "+"],
        ].map(([t, s]) => (
          <Card key={t} className="flex items-center justify-between py-3">
            <span className="text-sm">{t}</span>
            <span className={s === "+" ? "font-mono text-emerald-300" : "font-mono text-red-300"}>
              {s} 35,00
            </span>
          </Card>
        ))}
      </div>
    </Shell>
  );
}

function Matches({ surface }: { surface: AwpSurface }) {
  const rows = [
    ["Sob 18:00", "Bemowo", "14/16"],
    ["Niedz 20:00", "Wola", "8/10"],
    ["Wt 21:00", "Ursynów", "12/14"],
  ];
  return (
    <Shell surface={surface} title="Mecze" tab={surface === "ios" ? "Mecze" : "Terminarz"}>
      {isDesktop(surface) ? (
        <Card className="p-0">
          <div className="flex gap-2 border-b border-white/10 px-4 py-3 text-xs">
            {["Miasto", "Data", "Status", "Składka"].map((f) => (
              <span key={f} className="rounded-full bg-white/10 px-3 py-1">
                {f}
              </span>
            ))}
          </div>
          <table className="w-full text-left text-sm">
            <tbody>
              {rows.map((r) => (
                <tr key={r[1]} className="border-t border-white/10">
                  <td className="px-4 py-3">{r[0]}</td>
                  <td>{r[1]}</td>
                  <td>{r[2]}</td>
                  <td className="font-mono">35,00</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <Card key={r[1]} className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{r[1]}</p>
                <p className="text-xs text-white/60">
                  {r[0]} · {r[2]}
                </p>
              </div>
              <span className="rounded-xl bg-[var(--mp-teal)] px-3 py-2 text-xs font-bold">Gram</span>
            </Card>
          ))}
        </div>
      )}
    </Shell>
  );
}

function MatchDetail({ surface }: { surface: AwpSurface }) {
  return (
    <Shell surface={surface} title="Szczegóły meczu" tab={surface === "ios" ? "Mecze" : "Terminarz"}>
      <Card>
        <p className="text-[var(--mundial-gold)]">LIVE zapisów · N=14</p>
        <p className="text-xl font-semibold">Bemowo · sob 18:00</p>
        <p className="text-sm text-white/70">Składka 35,00 zł · spadnie, gdy dołączą kolejni</p>
        {isPhone(surface) ? (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button type="button" className="h-12 rounded-2xl bg-[var(--mp-teal)] font-bold">
              Gram
            </button>
            <button type="button" className="h-12 rounded-2xl bg-white/10 font-bold">
              Nie gram
            </button>
          </div>
        ) : (
          <div className="mt-4 flex gap-2 text-sm">
            <span className="rounded-xl bg-[var(--mp-teal)] px-4 py-2 font-bold">Gram</span>
            <span className="rounded-xl bg-white/10 px-4 py-2">Zastanawiam się</span>
            <span className="rounded-xl bg-red-600/80 px-4 py-2">Nie gram</span>
            <span className="rounded-xl border border-white/20 px-4 py-2">Dodaj gościa</span>
          </div>
        )}
      </Card>
      <div className={cn("mt-3 grid gap-2", isDesktop(surface) ? "grid-cols-3" : "grid-cols-1")}>
        {["IN · 14", "MAYBE · 2", "Waitlist · 1"].map((x) => (
          <Card key={x} className="text-sm">
            {x}
          </Card>
        ))}
      </div>
    </Shell>
  );
}

function Stats({ surface }: { surface: AwpSurface }) {
  return (
    <Shell surface={surface} title="Statystyki" tab="Start">
      {isDesktop(surface) ? (
        <div className="grid grid-cols-12 gap-3">
          <Card className="col-span-8 h-56">
            <p className="text-xs text-white/50">Gole / asysty · sezon</p>
            <div className="mt-6 flex h-32 items-end gap-2">
              {[40, 70, 55, 90, 65, 80].map((h, i) => (
                <div key={i} className="flex-1 rounded-t bg-[var(--mp-teal)]" style={{ height: `${h}%` }} />
              ))}
            </div>
          </Card>
          <Card className="col-span-4">
            <p className="text-sm">Eksport CSV · porównaj sezon</p>
            <p className="mt-4 text-xs text-white/50">WWW: analizy i raporty. Mobile: szybki wpis po gwizdku.</p>
          </Card>
        </div>
      ) : (
        <Card>
          <p className="text-sm">Po meczu Bemowo</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {["Gole", "Asysty", "Ocena"].map((x) => (
              <div key={x} className="rounded-xl bg-white/10 py-6 text-center text-xs">
                + {x}
              </div>
            ))}
          </div>
        </Card>
      )}
    </Shell>
  );
}

function Ranking({ surface }: { surface: AwpSurface }) {
  const board = [
    ["1", "Kuba", "112"],
    ["2", "Michał", "101"],
    ["3", "Olek", "94"],
    ["4", "Ty", "86"],
  ];
  return (
    <Shell surface={surface} title="Ranking" tab="Start">
      <div className="mb-3 flex gap-2 text-[11px]">
        {["Punkty", "Gole", "MVP"].map((t) => (
          <span key={t} className="rounded-full bg-white/10 px-3 py-1">
            {t}
          </span>
        ))}
      </div>
      <Card className="p-0">
        {board.map((r) => (
          <div
            key={r[0]}
            className={cn(
              "flex items-center justify-between border-t border-white/10 px-4 py-3 text-sm first:border-0",
              r[1] === "Ty" && "bg-[var(--mp-teal)]/20"
            )}
          >
            <span>
              {r[0]}. {r[1]}
            </span>
            <span className="font-mono">{r[2]}</span>
          </div>
        ))}
      </Card>
    </Shell>
  );
}

function Admin({ surface }: { surface: AwpSurface }) {
  if (!isDesktop(surface) && isWeb(surface) === false) {
    return (
      <Shell surface={surface} title="Skrót admina" tab="Start">
        <p className="mb-3 text-xs text-white/60">
          Pełne tabele, finanse i audit — na WWW. Tu tylko pilne akcje.
        </p>
        {["Odwołaj mecz", "Potwierdź wpłatę", "Freeze sezonu"].map((a) => (
          <Card key={a} className="mb-2 font-semibold">
            {a}
          </Card>
        ))}
      </Shell>
    );
  }
  if (!isDesktop(surface)) {
    return (
      <Shell surface={surface} title="Admin · tablet" tab="">
        <div className="grid grid-cols-2 gap-2">
          {["Użytkownicy", "Mecze", "Płatności", "Boiska"].map((a) => (
            <Card key={a} className="py-8 text-center font-semibold">
              {a}
            </Card>
          ))}
        </div>
      </Shell>
    );
  }
  return (
    <Shell surface={surface} title="Panel admina" tab="">
      <div className="grid grid-cols-12 gap-3">
        <Card className="col-span-3 space-y-2 text-sm">
          {["Użytkownicy", "Boiska", "Mecze", "Płatności", "Rankingi", "Media", "Audit"].map((x) => (
            <div key={x} className="rounded-lg bg-white/5 px-3 py-2">
              {x}
            </div>
          ))}
        </Card>
        <Card className="col-span-9 p-0">
          <div className="flex justify-between border-b border-white/10 px-4 py-3 text-xs">
            <span>Finanse · filtry · CSV</span>
            <span className="text-[var(--mundial-gold)]">GMV 12 480 zł</span>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-white/50">
              <tr>
                <th className="px-4 py-2">Mecz</th>
                <th>N</th>
                <th>Składka</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-white/10">
                <td className="px-4 py-3">Bemowo</td>
                <td>14</td>
                <td className="font-mono">35,00</td>
                <td>OPEN</td>
              </tr>
              <tr className="border-t border-white/10">
                <td className="px-4 py-3">Wola</td>
                <td>10</td>
                <td className="font-mono">42,00</td>
                <td>SETTLED</td>
              </tr>
            </tbody>
          </table>
        </Card>
      </div>
    </Shell>
  );
}

function Broadcasts({ surface }: { surface: AwpSurface }) {
  return (
    <Shell surface={surface} title="Transmisje" tab={surface === "ios" ? "Live" : "Start"}>
      <Card className="aspect-video bg-black/40">
        <div className="flex h-full items-center justify-center">
          <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-bold">LIVE</span>
        </div>
      </Card>
      <p className="mt-3 text-xs text-white/60">
        {isPhone(surface) ? "Player + PiP, bez paneli analitycznych." : "Player, czat, archiwum VOD, embed BYO."}
      </p>
    </Shell>
  );
}

function Gallery({ surface }: { surface: AwpSurface }) {
  return (
    <Shell surface={surface} title="Galeria" tab="Start">
      <div className={cn("grid gap-2", isDesktop(surface) ? "grid-cols-4" : "grid-cols-2")}>
        {Array.from({ length: isDesktop(surface) ? 8 : 4 }).map((_, i) => (
          <div key={i} className="aspect-square rounded-xl bg-white/10" />
        ))}
      </div>
    </Shell>
  );
}

function Bookings({ surface }: { surface: AwpSurface }) {
  return (
    <Shell surface={surface} title="Rezerwacje" tab="Start">
      <Card>
        <p className="text-sm">Hold 08:42</p>
        <p className="font-semibold">Orlik Bemowo · 18:00–19:00 · 160 zł</p>
        {isPhone(surface) ? (
          <button type="button" className="mt-4 h-12 w-full rounded-2xl bg-[var(--mp-teal)] font-bold">
            Zapłać
          </button>
        ) : (
          <p className="mt-3 text-xs text-white/60">Krok 2: utworzyć mecz do slotu? Wallet lub HotPay.</p>
        )}
      </Card>
    </Shell>
  );
}

export const UX_NOTE: Record<AwpSurface, string> = {
  "web-desktop":
    "WWW desktop: filtry, tabele, split-view, administracja. Główne centrum operatorskie.",
  "web-tablet":
    "Tablet: 2 kolumny, te same dane co desktop, mniej paneli naraz.",
  "web-mobile":
    "Mobile web: Safari chrome, stos kart, te same CTA co app — bez kopii natywnego taba 1:1.",
  ios: "iOS: duże CTA kciukiem, 4 taby, Dynamic Island, skrót admina zamiast tabel.",
  android: "Android: Material nav + FAB mentalnie jako Gram, murawa jak WWW, nie klon iOS.",
};
