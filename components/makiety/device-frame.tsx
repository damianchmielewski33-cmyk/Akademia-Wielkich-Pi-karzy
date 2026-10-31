import type { ReactNode } from "react";
import type { AwpSurface } from "@/lib/platform-ecosystem";
import { cn } from "@/lib/utils";

const FRAME: Record<
  AwpSurface,
  { width: number; height: number; label: string; radius: string }
> = {
  "web-desktop": { width: 1180, height: 740, label: "Desktop · 1280", radius: "rounded-xl" },
  "web-tablet": { width: 768, height: 980, label: "Tablet · 768", radius: "rounded-[1.6rem]" },
  "web-mobile": { width: 390, height: 844, label: "Mobile web · 390", radius: "rounded-[2rem]" },
  ios: { width: 390, height: 844, label: "iPhone", radius: "rounded-[2.6rem]" },
  android: { width: 412, height: 892, label: "Android", radius: "rounded-[1.6rem]" },
};

export function DeviceFrame({
  surface,
  children,
}: {
  surface: AwpSurface;
  children: ReactNode;
}) {
  const spec = FRAME[surface];
  const phone = surface === "ios" || surface === "android" || surface === "web-mobile";

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
        {spec.label}
      </p>
      <div
        className={cn(
          "relative overflow-hidden border bg-zinc-950 shadow-2xl shadow-black/40",
          spec.radius,
          phone ? "border-zinc-800 p-2" : "border-zinc-700 p-0"
        )}
        style={{ width: spec.width, maxWidth: "100%" }}
      >
        {surface === "ios" ? (
          <div className="pointer-events-none absolute left-1/2 top-2 z-20 h-7 w-28 -translate-x-1/2 rounded-full bg-black" />
        ) : null}
        {surface === "android" ? (
          <div className="flex h-6 items-center justify-between bg-black px-4 text-[10px] text-white/80">
            <span>12:28</span>
            <span>5G · 86%</span>
          </div>
        ) : null}
        {surface.startsWith("web") ? (
          <div className="flex h-8 items-center gap-2 border-b border-zinc-800 bg-zinc-900 px-3">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
            <div className="ml-3 flex-1 rounded-md bg-zinc-800 px-3 py-0.5 text-[10px] text-zinc-400">
              akademiawielkichpilkarzy.pl
            </div>
          </div>
        ) : null}
        <div
          className={cn("overflow-hidden bg-[#061410] text-white", phone ? "rounded-[1.8rem]" : "")}
          style={{ height: spec.height }}
        >
          <div className="h-full overflow-y-auto">{children}</div>
        </div>
        {surface === "ios" ? (
          <div className="pointer-events-none absolute bottom-3 left-1/2 h-1.5 w-28 -translate-x-1/2 rounded-full bg-white/40" />
        ) : null}
      </div>
    </div>
  );
}
