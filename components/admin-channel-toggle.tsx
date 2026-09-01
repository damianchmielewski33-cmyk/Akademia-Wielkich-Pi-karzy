"use client";

import { cn } from "@/lib/utils";
import type { ClientChannel } from "@/lib/mobile-channel-settings";

type Props = {
  channel: ClientChannel;
  onChange: (channel: ClientChannel) => void;
  className?: string;
};

export function AdminChannelToggle({ channel, onChange, className }: Props) {
  const activeClass = "bg-[var(--mp-teal)] text-white";
  const idleClass =
    "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700";

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200 bg-white p-2 dark:border-zinc-700 dark:bg-zinc-900",
        className
      )}
      role="group"
      aria-label="Kanał konfiguracji"
    >
      <span className="px-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Konfiguracja</span>
      <button
        type="button"
        onClick={() => onChange("web")}
        className={cn(
          "rounded-lg px-3 py-1.5 text-sm font-semibold transition",
          channel === "web" ? activeClass : idleClass
        )}
      >
        Strona WWW
      </button>
      <button
        type="button"
        onClick={() => onChange("mobile")}
        className={cn(
          "rounded-lg px-3 py-1.5 text-sm font-semibold transition",
          channel === "mobile" ? activeClass : idleClass
        )}
      >
        Aplikacja Android
      </button>
    </div>
  );
}
