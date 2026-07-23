"use client";

import { cn } from "@/lib/utils";
import type { ClientChannel } from "@/lib/mobile-channel-settings";

type Props = {
  channel: ClientChannel;
  onChange: (channel: ClientChannel) => void;
  className?: string;
};

export function AdminChannelToggle({ channel, onChange, className }: Props) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-xl border border-white/20 bg-black/20 p-2",
        className
      )}
      role="group"
      aria-label="Kanał konfiguracji"
    >
      <span className="px-2 text-xs font-semibold uppercase tracking-wide text-emerald-100/70">Konfiguracja</span>
      <button
        type="button"
        onClick={() => onChange("web")}
        className={cn(
          "rounded-lg px-3 py-1.5 text-sm font-semibold transition",
          channel === "web"
            ? "bg-[var(--mundial-gold)] text-emerald-950"
            : "bg-white/10 text-white hover:bg-white/15"
        )}
      >
        Strona WWW
      </button>
      <button
        type="button"
        onClick={() => onChange("mobile")}
        className={cn(
          "rounded-lg px-3 py-1.5 text-sm font-semibold transition",
          channel === "mobile"
            ? "bg-[var(--mundial-gold)] text-emerald-950"
            : "bg-white/10 text-white hover:bg-white/15"
        )}
      >
        Aplikacja Android
      </button>
    </div>
  );
}
