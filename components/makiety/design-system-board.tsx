import { awpButtonVariants, awpColor, awpGrid, awpSpace, awpType } from "@/lib/design-system";

const PALETTE = [
  ["Navy", awpColor.navy],
  ["Purple", awpColor.purple],
  ["Pitch", awpColor.pitch],
  ["Gold", awpColor.gold],
  ["Teal", awpColor.teal],
  ["Red", awpColor.red],
  ["Murawa", awpColor.murawa],
  ["Page", awpColor.pageLight],
] as const;

export function DesignSystemBoard() {
  return (
    <div className="space-y-10 text-zinc-100">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--mp-teal-dark)]">
          Design System
        </p>
        <h2 className="mt-1 font-[family-name:var(--font-display)] text-4xl tracking-wide">
          Jeden język wizualny
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          Kolory, typografia i komponenty są wspólne. Gęstość i gesty zmieniają się per urządzenie —
          nie wygląd marki.
        </p>
      </header>

      <section>
        <h3 className="mb-3 text-sm font-semibold">Kolory główne i dodatkowe</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {PALETTE.map(([name, hex]) => (
            <div key={name} className="overflow-hidden rounded-2xl border border-white/10">
              <div className="h-16" style={{ background: hex }} />
              <div className="px-2 py-2 text-xs">
                <div className="font-semibold">{name}</div>
                <div className="font-mono text-[10px] text-zinc-500">{hex}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <div>
          <h3 className="mb-2 text-sm font-semibold">Typografia</h3>
          <p className="font-[family-name:var(--font-display)] text-5xl leading-none">AWP 10</p>
          <p className="mt-2 text-sm">{awpType.display.family} — {awpType.display.role}</p>
          <p className="mt-4 text-base">{awpType.sans.family} — {awpType.sans.role}</p>
          <p className="mt-2 font-mono text-sm">120,00 PLN — {awpType.mono.family}</p>
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold">Spacing</h3>
          <div className="flex flex-wrap items-end gap-2">
            {Object.entries(awpSpace).map(([k, v]) => (
              <div key={k} className="flex flex-col items-center gap-1">
                <div className="rounded bg-[var(--mp-teal)]" style={{ width: v, height: v }} />
                <span className="text-[10px] text-zinc-500">{k}/{v}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold">Grid</h3>
          <ul className="space-y-1 text-sm text-zinc-400">
            <li>Desktop {awpGrid.desktop.columns} kol. · max {awpGrid.desktop.maxWidth}px</li>
            <li>Tablet {awpGrid.tablet.columns} kol. · max {awpGrid.tablet.maxWidth}px</li>
            <li>Mobile {awpGrid.mobile.columns} kol. · max {awpGrid.mobile.maxWidth}px</li>
          </ul>
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold">Przyciski</h3>
        <div className="flex flex-wrap gap-2">
          {awpButtonVariants.map((b) => (
            <button
              key={b.id}
              type="button"
              className={
                b.id === "primary"
                  ? "rounded-xl bg-[var(--mp-teal)] px-4 py-2 text-sm font-semibold text-white"
                  : b.id === "gold"
                    ? "rounded-xl bg-[var(--mundial-gold)] px-4 py-2 text-sm font-semibold text-[var(--mundial-navy)]"
                    : b.id === "destructive"
                      ? "rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white"
                      : b.id === "stadium"
                        ? "rounded-xl border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur"
                        : b.id === "ghost"
                          ? "rounded-xl px-4 py-2 text-sm font-semibold text-zinc-200"
                          : "rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold"
              }
            >
              {b.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-zinc-500">Ikony: Lucide (WWW) · SF Symbols (iOS) · Material (Android) — te same metafory.</p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--mp-teal-dark)]">Karta</p>
          <p className="mt-1 font-semibold">Orlik Bemowo · sob 18:00</p>
          <p className="text-sm text-zinc-500">14/16 · 35,00 zł</p>
        </div>
        <div className="overflow-hidden rounded-2xl border border-white/15">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 text-xs uppercase text-zinc-400">
              <tr>
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Gracz</th>
                <th className="px-3 py-2">Pkt</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-white/10">
                <td className="px-3 py-2">4</td>
                <td className="px-3 py-2">Ty</td>
                <td className="px-3 py-2 font-mono">86</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="space-y-2 rounded-2xl border border-white/15 bg-white/10 p-4">
          <label className="text-xs font-semibold text-zinc-400">Formularz</label>
          <input className="h-11 w-full rounded-xl border border-white/15 bg-black/30 px-3 text-sm" defaultValue="Bemowo" readOnly />
          <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">Błąd: slot już zajęty.</p>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
            <div className="h-full w-2/3 animate-pulse rounded-full bg-[var(--mp-teal)]" />
          </div>
        </div>
      </section>
    </div>
  );
}
