"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Calendar,
  Loader2,
  Search,
  Settings2,
  Users,
  X,
} from "lucide-react";
import { ADMIN_SETTINGS_SEARCH_INDEX } from "@/lib/admin-settings-search";
import { cn } from "@/lib/utils";

export type AdminSearchJump =
  | { type: "tab"; tab: string }
  | { type: "match"; matchId: number }
  | { type: "user"; userId: number }
  | { type: "settings"; sectionId: string };

type Props = {
  onJump: (jump: AdminSearchJump) => void;
  className?: string;
  /** Wąska wersja na pasek telefonu. */
  compact?: boolean;
};

const TAB_HITS: { tab: string; label: string; keywords: string }[] = [
  { tab: "dashboard", label: "Przegląd", keywords: "start dashboard" },
  { tab: "users", label: "Użytkownicy", keywords: "konta pin gracze" },
  { tab: "messages", label: "Wiadomości", keywords: "inbox chat" },
  {
    tab: "mobile-apps",
    label: "Aplikacje mobilne",
    keywords: "android ios pwa instalacja telefon aplikacja",
  },
  { tab: "matches", label: "Mecze", keywords: "terminarz zapisy" },
  { tab: "bookings", label: "Rezerwacje boisk", keywords: "hale terminy rezerwacje booking" },
  { tab: "lineups", label: "Składy na mecz", keywords: "skład boisko" },
  { tab: "stats", label: "Statystyki", keywords: "gole asysty" },
  { tab: "rankings", label: "Rankingi", keywords: "sezon punkty" },
  { tab: "pzu-cup", label: "PZU Cup", keywords: "turniej pzu" },
  { tab: "wallets", label: "Portfele", keywords: "saldo płatności" },
  { tab: "operator-payments", label: "Płatności operatora", keywords: "hotpay operator prowizja bramka" },
  { tab: "gallery", label: "Galeria", keywords: "youtube film" },
  { tab: "screen-blocks", label: "Zaślepki", keywords: "blokada ekran" },
  { tab: "analytics", label: "Analityka", keywords: "odsłony ruch" },
  { tab: "settings", label: "Ustawienia", keywords: "konfiguracja" },
];

type SearchResult = {
  key: string;
  label: string;
  hint: string;
  icon: typeof Search;
  jump: AdminSearchJump;
};

export function AdminCommandSearch({ onJump, className, compact = false }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [remote, setRemote] = useState<{
    users: { id: number; first_name: string; last_name: string; zawodnik: string }[];
    matches: { id: number; date: string; time: string; location: string }[];
  }>({ users: [], matches: [] });
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      const t = window.setTimeout(() => inputRef.current?.focus(), 50);
      return () => window.clearTimeout(t);
    }
    setQuery("");
    setRemote({ users: [], matches: [] });
  }, [open]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 1) {
      setRemote({ users: [], matches: [] });
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch(`/api/admin/search?q=${encodeURIComponent(q)}`);
          if (!res.ok || cancelled) return;
          const data = (await res.json()) as typeof remote;
          if (!cancelled) setRemote(data);
        } catch {
          /* ignore */
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
    }, 220);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  const results = useMemo((): SearchResult[] => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return TAB_HITS.slice(0, 6).map((t) => ({
        key: `tab-${t.tab}`,
        label: t.label,
        hint: "Zakładka",
        icon: Search,
        jump: { type: "tab", tab: t.tab },
      }));
    }
    const out: SearchResult[] = [];
    for (const t of TAB_HITS) {
      if (`${t.label} ${t.keywords}`.toLowerCase().includes(q)) {
        out.push({
          key: `tab-${t.tab}`,
          label: t.label,
          hint: "Zakładka",
          icon: Search,
          jump: { type: "tab", tab: t.tab },
        });
      }
    }
    for (const s of ADMIN_SETTINGS_SEARCH_INDEX) {
      if (`${s.label} ${s.keywords} ${s.group}`.toLowerCase().includes(q)) {
        out.push({
          key: `set-${s.id}`,
          label: s.label,
          hint: `Ustawienia · ${s.group}`,
          icon: Settings2,
          jump: { type: "settings", sectionId: s.id },
        });
      }
    }
    for (const u of remote.users) {
      out.push({
        key: `user-${u.id}`,
        label: `${u.first_name} ${u.last_name}`,
        hint: u.zawodnik,
        icon: Users,
        jump: { type: "user", userId: u.id },
      });
    }
    for (const m of remote.matches) {
      out.push({
        key: `match-${m.id}`,
        label: `${m.date} ${m.time}`,
        hint: `${m.location} · #${m.id}`,
        icon: Calendar,
        jump: { type: "match", matchId: m.id },
      });
    }
    return out.slice(0, 24);
  }, [query, remote]);

  const select = useCallback(
    (jump: AdminSearchJump) => {
      setOpen(false);
      onJump(jump);
    },
    [onJump]
  );

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="awp-focus-ring block w-full text-left"
        aria-label="Szukaj w panelu"
        aria-expanded={open}
      >
        {compact ? (
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-sm font-bold text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
            <Search className="h-4 w-4" aria-hidden />
          </span>
        ) : (
          <span
            className={cn(
              "flex min-h-[3.25rem] items-center gap-2.5 rounded-2xl border border-zinc-200/90 bg-white px-3 py-2.5 shadow-sm transition-colors dark:border-zinc-700 dark:bg-zinc-900",
              open && "border-[var(--mp-teal)] ring-2 ring-[var(--mp-teal)]/25"
            )}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-[var(--mp-teal-dark)] dark:bg-teal-950/50 dark:text-teal-300">
              <Search className="h-4 w-4" aria-hidden />
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-bold text-zinc-700 dark:text-zinc-200 sm:text-base">
              Szukaj w panelu i ustawieniach…
            </span>
            <kbd className="hidden rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-500 sm:inline dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
              Ctrl+K
            </kbd>
          </span>
        )}
      </button>

      {open ? (
        <div
          className={cn(
            "z-50 mt-1.5 overflow-hidden rounded-2xl border-2 border-[var(--mp-teal)]/35 bg-white shadow-2xl backdrop-blur-md dark:bg-zinc-950",
            compact
              ? "fixed left-3 right-3 top-[3.75rem] sm:absolute sm:left-auto sm:right-0 sm:top-full sm:w-[min(calc(100vw-1.5rem),22rem)]"
              : "absolute left-0 right-0 top-full"
          )}
        >
          <div className="flex items-center gap-2 border-b border-zinc-200 px-3 py-3 dark:border-zinc-800">
            <Search className="h-5 w-5 shrink-0 text-[var(--mp-teal-dark)] dark:text-teal-300" aria-hidden />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Użytkownik, mecz, ustawienie, zakładka…"
              className="min-w-0 flex-1 bg-transparent text-base font-medium text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-50 dark:placeholder:text-zinc-500"
              aria-label="Fraza wyszukiwania"
            />
            {loading ? <Loader2 className="h-4 w-4 animate-spin text-zinc-400" aria-hidden /> : null}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="awp-focus-ring rounded-lg p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white"
              aria-label="Zamknij"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <ul className="max-h-80 overflow-y-auto py-1" role="listbox">
            {results.length === 0 ? (
              <li className="px-3 py-4 text-center text-base text-zinc-500">Brak wyników</li>
            ) : (
              results.map((r) => {
                const Icon = r.icon;
                return (
                  <li key={r.key}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={false}
                      onClick={() => select(r.jump)}
                      className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-teal-50 dark:hover:bg-teal-950/40"
                    >
                      <Icon
                        className="h-5 w-5 shrink-0 text-[var(--mp-teal-dark)] dark:text-teal-300"
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-base font-bold text-zinc-950 dark:text-white">
                          {r.label}
                        </span>
                        <span className="block truncate text-sm text-zinc-500">{r.hint}</span>
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
