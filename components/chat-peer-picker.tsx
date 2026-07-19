"use client";

import { useEffect, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { PlayerAvatar } from "@/components/player-avatar";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type ChatPeer = {
  id: number;
  display_name: string;
  player_alias: string;
  first_name: string;
  last_name: string;
  profile_photo_path: string | null;
};

type Props = {
  onSelect: (peer: ChatPeer) => void;
  tone?: "pitch" | "light";
  className?: string;
};

export function ChatPeerPicker({ onSelect, tone = "light", className }: Props) {
  const [q, setQ] = useState("");
  const [peers, setPeers] = useState<ChatPeer[]>([]);
  const [loading, setLoading] = useState(false);
  const light = tone === "light";

  useEffect(() => {
    let cancelled = false;
    const t = window.setTimeout(() => {
      void (async () => {
        setLoading(true);
        try {
          const params = new URLSearchParams();
          if (q.trim()) params.set("q", q.trim());
          const res = await fetch(`/api/chat/peers?${params.toString()}`);
          const data = (await res.json().catch(() => ({}))) as { players?: ChatPeer[] };
          if (!cancelled) setPeers(data.players ?? []);
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
    }, 180);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [q]);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="relative">
        <Search
          className={cn(
            "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2",
            light ? "text-zinc-400" : "text-emerald-100/50"
          )}
          aria-hidden
        />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Szukaj gracza…"
          className={cn(
            "pl-9",
            light
              ? undefined
              : "border-white/25 bg-black/15 text-white placeholder:text-emerald-100/45"
          )}
        />
      </div>
      <div
        className={cn(
          "max-h-52 overflow-y-auto rounded-xl border",
          light
            ? "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900/60"
            : "border-white/15 bg-black/20"
        )}
      >
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-4 w-4 animate-spin text-emerald-500" aria-hidden />
          </div>
        ) : peers.length === 0 ? (
          <p
            className={cn(
              "px-3 py-6 text-center text-sm",
              light ? "text-zinc-500" : "text-emerald-100/60"
            )}
          >
            Brak wyników.
          </p>
        ) : (
          <ul className={cn(light ? "divide-y divide-zinc-100 dark:divide-zinc-800" : "divide-y divide-white/10")}>
            {peers.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => onSelect(p)}
                  className={cn(
                    "flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors",
                    light
                      ? "hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                      : "hover:bg-white/10"
                  )}
                >
                  <PlayerAvatar
                    photoPath={p.profile_photo_path}
                    firstName={p.first_name}
                    lastName={p.last_name}
                    size="sm"
                    ringClassName={
                      light ? "ring-2 ring-emerald-600/25" : "ring-2 ring-white/35"
                    }
                  />
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block truncate font-semibold",
                        light ? "text-zinc-900 dark:text-zinc-50" : "text-white"
                      )}
                    >
                      {p.display_name}
                    </span>
                    <span
                      className={cn(
                        "block truncate text-xs",
                        light ? "text-zinc-500 dark:text-zinc-400" : "text-emerald-100/55"
                      )}
                    >
                      @{p.player_alias}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
