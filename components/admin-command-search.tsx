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
import { cn } from "@/lib/utils";

export type AdminSearchJump =
  | { type: "tab"; tab: string }
  | { type: "match"; matchId: number }
  | { type: "user"; userId: number }
  | { type: "settings"; sectionId: string };

type Props = {
  onJump: (jump: AdminSearchJump) => void;
  className?: string;
};

const SETTINGS_HITS: { id: string; label: string; keywords: string }[] = [
  { id: "settings-test-mode", label: "Tryb testowy", keywords: "sandbox test" },
  { id: "settings-marketplace", label: "Rezerwacja boisk", keywords: "marketplace hale rezerwacje wyłącznik" },
  { id: "settings-brand", label: "Nazwa i opis strony", keywords: "nazwa branding seo" },
  { id: "settings-assets", label: "Logo i tła", keywords: "logo tło grafika asset" },
  { id: "settings-contact", label: "Kontakt i organizatorzy", keywords: "email telefon blik facebook" },
  { id: "settings-home-video", label: "Film na stronie głównej", keywords: "youtube film video" },
  { id: "settings-adsense", label: "Google AdSense", keywords: "reklamy adsense" },
  { id: "settings-registration", label: "Rejestracja i powiadomienia", keywords: "rejestracja mail" },
  { id: "settings-match-defaults", label: "Domyślne mecze", keywords: "miejsca lokalizacja mecz" },
  { id: "settings-ranking-points", label: "Punkty rankingowe", keywords: "ranking punkty gol" },
  { id: "settings-pitch-plan", label: "Plan boiska", keywords: "składy boisko" },
  { id: "settings-cancel-reasons", label: "Powody anulowania", keywords: "anuluj powód" },
];

const TAB_HITS: { tab: string; label: string; keywords: string }[] = [
  { tab: "dashboard", label: "Przegląd", keywords: "start dashboard" },
  { tab: "users", label: "Użytkownicy", keywords: "konta pin gracze" },
  { tab: "messages", label: "Wiadomości", keywords: "inbox chat" },
  { tab: "matches", label: "Mecze", keywords: "terminarz zapisy" },
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

export function AdminCommandSearch({ onJump, className }: Props) {
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
    for (const s of SETTINGS_HITS) {
      if (`${s.label} ${s.keywords}`.toLowerCase().includes(q)) {
        out.push({
          key: `set-${s.id}`,
          label: s.label,
          hint: "Ustawienia",
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
    return out.slice(0, 12);
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
        className="awp-focus-ring flex w-full items-center gap-2 rounded-xl border border-white/20 bg-black/20 px-3 py-2 text-left text-sm text-emerald-100/80 transition-colors hover:bg-white/10 hover:text-white"
        aria-label="Szukaj w panelu"
      >
        <Search className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
        <span className="min-w-0 flex-1 truncate">Szukaj…</span>
        <kbd className="hidden rounded border border-white/20 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-100/60 sm:inline">
          Ctrl+K
        </kbd>
      </button>

      {open ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-white/20 bg-emerald-950/95 shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-2 border-b border-white/15 px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-emerald-100/70" aria-hidden />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Użytkownik, mecz, ustawienie…"
              className="min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-emerald-100/45"
              aria-label="Fraza wyszukiwania"
            />
            {loading ? <Loader2 className="h-4 w-4 animate-spin text-emerald-100/70" aria-hidden /> : null}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="awp-focus-ring rounded-lg p-1 text-emerald-100/70 hover:bg-white/10 hover:text-white"
              aria-label="Zamknij"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <ul className="max-h-72 overflow-y-auto py-1" role="listbox">
            {results.length === 0 ? (
              <li className="px-3 py-4 text-center text-sm text-emerald-100/60">Brak wyników</li>
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
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-white/10"
                    >
                      <Icon className="h-4 w-4 shrink-0 text-emerald-100/80" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-white">{r.label}</span>
                        <span className="block truncate text-xs text-emerald-100/60">{r.hint}</span>
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
