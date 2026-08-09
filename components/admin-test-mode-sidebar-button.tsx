"use client";

import { useCallback, useEffect, useState } from "react";
import { FlaskConical, Loader2 } from "lucide-react";
import { toast } from "@/lib/app-toast";
import { cn } from "@/lib/utils";

type State = { enabled: boolean; configured: boolean } | null;

/**
 * Duży przełącznik trybu testowego — boczny panel admina.
 */
export function AdminTestModeSidebarButton({ className }: { className?: string }) {
  const [state, setState] = useState<State>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/test-mode");
      if (!res.ok) return;
      const j = (await res.json()) as { enabled?: boolean; configured?: boolean };
      setState({
        enabled: Boolean(j.enabled),
        configured: j.configured !== false,
      });
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = useCallback(async () => {
    if (!state?.configured || busy) return;
    const enabled = !state.enabled;
    setBusy(true);
    const toastId = toast.loading(
      enabled ? "Włączanie trybu testowego…" : "Wyłączanie i usuwanie danych testowych…"
    );
    try {
      const res = await fetch("/api/admin/test-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        error?: string;
        enabled?: boolean;
        configured?: boolean;
      };
      if (!res.ok) {
        toast.error(typeof j.error === "string" ? j.error : "Nie udało się przełączyć trybu", {
          id: toastId,
        });
        return;
      }
      setState({
        enabled: Boolean(j.enabled),
        configured: j.configured !== false,
      });
      toast.success(
        enabled ? "Tryb testowy włączony" : "Tryb testowy wyłączony — dane testowe usunięte",
        { id: toastId }
      );
      window.location.reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Błąd trybu testowego", { id: toastId });
    } finally {
      setBusy(false);
    }
  }, [busy, state]);

  if (state == null) {
    return (
      <div
        className={cn(
          "flex min-h-[3.25rem] items-center justify-center rounded-2xl border border-white/15 bg-black/20 px-3 py-3 text-sm text-emerald-100/60",
          className
        )}
        aria-hidden
      >
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  const on = state.enabled;

  return (
    <button
      type="button"
      disabled={busy || !state.configured}
      onClick={() => void toggle()}
      className={cn(
        "awp-focus-ring group relative w-full overflow-hidden rounded-2xl border-2 px-4 py-4 text-left shadow-lg transition-[transform,box-shadow,background-color] active:translate-y-px",
        "disabled:pointer-events-none disabled:opacity-60",
        on
          ? "border-amber-300/70 bg-gradient-to-br from-amber-500/90 via-orange-600/95 to-red-700/90 text-white shadow-amber-950/40 hover:brightness-110"
          : "border-[var(--mundial-gold,#f5c518)]/55 bg-gradient-to-br from-[var(--mundial-gold,#f5c518)]/25 via-amber-700/30 to-emerald-950/40 text-white shadow-black/30 hover:from-[var(--mundial-gold,#f5c518)]/35 hover:via-amber-600/35",
        className
      )}
      aria-pressed={on}
      title={
        !state.configured
          ? "Tryb testowy niedostępny"
          : on
            ? "Wyłącz tryb testowy (usunie dane testowe)"
            : "Włącz tryb testowy"
      }
    >
      <span className="relative flex items-start gap-3">
        <span
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ring-2",
            on ? "bg-black/25 ring-white/35" : "bg-black/20 ring-[var(--mundial-gold,#f5c518)]/40"
          )}
        >
          {busy ? (
            <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
          ) : (
            <FlaskConical className="h-6 w-6" strokeWidth={2.25} aria-hidden />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[0.65rem] font-bold uppercase tracking-[0.14em] text-white/75">
            {on ? "Aktywny" : "Wyłączony"}
          </span>
          <span className="mt-0.5 block text-base font-extrabold leading-tight tracking-tight sm:text-lg">
            Tryb testowy
          </span>
          <span className="mt-1 block text-[11px] font-medium leading-snug text-white/85">
            {on
              ? "Kliknij, aby wyłączyć i skasować dane testowe"
              : "Kliknij, aby włączyć — nowe dane z flagą is_test"}
          </span>
        </span>
      </span>
    </button>
  );
}
