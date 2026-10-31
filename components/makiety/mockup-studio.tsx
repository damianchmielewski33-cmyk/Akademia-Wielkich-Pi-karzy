"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DesignSystemBoard } from "@/components/makiety/design-system-board";
import { DeviceFrame } from "@/components/makiety/device-frame";
import {
  MOCKUP_SCREEN_LABEL,
  MOCKUP_SCREENS,
  MockupScreen,
  UX_NOTE,
  type MockupScreenId,
} from "@/components/makiety/screens";
import { ECOSYSTEM_FEATURES, SHARED_STACK, type AwpSurface } from "@/lib/platform-ecosystem";
import { cn } from "@/lib/utils";

const SURFACES: { id: AwpSurface; label: string }[] = [
  { id: "web-desktop", label: "Web desktop" },
  { id: "web-tablet", label: "Web tablet" },
  { id: "web-mobile", label: "Web mobile" },
  { id: "ios", label: "iOS" },
  { id: "android", label: "Android" },
];

type Tab = "makiety" | "system" | "ekosystem";

export function MockupStudio() {
  const [tab, setTab] = useState<Tab>("makiety");
  const [surface, setSurface] = useState<AwpSurface>("web-desktop");
  const [screen, setScreen] = useState<MockupScreenId>("landing");
  const [gallery, setGallery] = useState(false);

  const scaleClass = useMemo(() => {
    if (surface === "web-desktop") return "origin-top scale-[0.72] xl:scale-[0.82]";
    if (surface === "web-tablet") return "origin-top scale-[0.62] md:scale-[0.72]";
    return "origin-top scale-[0.85] md:scale-100";
  }, [surface]);

  return (
    <div className="min-h-screen bg-[#070b14] text-zinc-100">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#070b14]/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--mundial-gold)]">
              AWP · jeden ekosystem
            </p>
            <h1 className="font-[family-name:var(--font-display)] text-2xl tracking-wide">
              Makiety WWW · iOS · Android
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["makiety", "Makiety"],
                ["system", "Design System"],
                ["ekosystem", "Ekosystem"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-semibold",
                  tab === id ? "bg-[var(--mp-teal)] text-white" : "bg-white/10 text-white/70"
                )}
              >
                {label}
              </button>
            ))}
            <Link href="/" className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold">
              Strona
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 py-6">
        {tab === "system" ? <DesignSystemBoard /> : null}

        {tab === "ekosystem" ? (
          <div className="space-y-8">
            <p className="max-w-3xl text-sm text-zinc-400">
              Portal WWW, aplikacja iOS i aplikacja Android są równorzędnymi produktami. Współdzielą{" "}
              {SHARED_STACK.join(", ")}. Interfejsy nie są kopiami 1:1: WWW jest centrum administracyjnym,
              mobile jest szybsze i pod jedną rękę.
            </p>
            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-white/5 text-xs uppercase tracking-wider text-zinc-400">
                  <tr>
                    <th className="px-4 py-3">Funkcja</th>
                    <th>WWW</th>
                    <th>iOS</th>
                    <th>Android</th>
                    <th>WWW UX</th>
                    <th>Mobile UX</th>
                  </tr>
                </thead>
                <tbody>
                  {ECOSYSTEM_FEATURES.map((f) => (
                    <tr key={f.id} className="border-t border-white/10">
                      <td className="px-4 py-3 font-semibold">{f.label}</td>
                      <td>tak</td>
                      <td>tak</td>
                      <td>tak</td>
                      <td className="max-w-xs py-3 text-xs text-zinc-400">{f.wwwNote}</td>
                      <td className="max-w-xs py-3 text-xs text-zinc-400">{f.mobileNote}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {tab === "makiety" ? (
          <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
            <aside className="space-y-4">
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Platforma
                </p>
                <div className="flex flex-col gap-1">
                  {SURFACES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSurface(s.id)}
                      className={cn(
                        "rounded-xl px-3 py-2 text-left text-sm font-semibold",
                        surface === s.id ? "bg-[var(--mp-teal)]" : "bg-white/5 hover:bg-white/10"
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Widok
                </p>
                <div className="flex max-h-[50vh] flex-col gap-1 overflow-y-auto">
                  {MOCKUP_SCREENS.map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        setScreen(id);
                        setGallery(false);
                      }}
                      className={cn(
                        "rounded-xl px-3 py-2 text-left text-sm",
                        !gallery && screen === id ? "bg-white/15" : "text-zinc-300 hover:bg-white/5"
                      )}
                    >
                      {MOCKUP_SCREEN_LABEL[id]}
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setGallery((v) => !v)}
                className="w-full rounded-xl border border-white/15 px-3 py-2 text-xs font-semibold"
              >
                {gallery ? "Pojedyncza makieta" : "Galeria wszystkich widoków"}
              </button>
              <p className="text-xs leading-relaxed text-zinc-500">{UX_NOTE[surface]}</p>
            </aside>

            <div className="overflow-auto rounded-3xl border border-white/10 bg-black/30 p-6">
              {gallery ? (
                <div className="flex flex-wrap justify-center gap-10">
                  {MOCKUP_SCREENS.map((id) => (
                    <div key={id} className={scaleClass}>
                      <p className="mb-2 text-center text-xs text-zinc-400">{MOCKUP_SCREEN_LABEL[id]}</p>
                      <DeviceFrame surface={surface}>
                        <MockupScreen surface={surface} screen={id} />
                      </DeviceFrame>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={cn("flex justify-center", scaleClass)}>
                  <DeviceFrame surface={surface}>
                    <MockupScreen surface={surface} screen={screen} />
                  </DeviceFrame>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
