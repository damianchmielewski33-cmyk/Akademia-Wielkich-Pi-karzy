"use client";

import { useCallback, useEffect, useState } from "react";
import { FlaskConical, Loader2 } from "lucide-react";
import { toast } from "@/lib/app-toast";
import { cn } from "@/lib/utils";

type State = { enabled: boolean; configured: boolean } | null;

/**
 * Przełącznik trybu testowego — boczny panel admina.
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
          "flex h-10 items-center justify-center rounded-lg border border-white/15 bg-black/20 text-emerald-100/60",
          className
        )}
        aria-hidden
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
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
        "awp-focus-ring group relative flex h-10 w-full items-center gap-2 overflow-hidden rounded-lg border px-2.5 text-left shadow-sm transition-[transform,box-shadow,background-color] active:translate-y-px",
        "disabled:pointer-events-none disabled:opacity-60",
        on
          ? "border-amber-300/80 bg-gradient-to-br from-amber-500 via-orange-600 to-red-700 text-white shadow-amber-950/40 hover:brightness-110"
          : "border-[var(--mundial-gold,#f5c518)] bg-[var(--mundial-gold,#f5c518)]/90 text-[var(--mundial-navy,#0a1628)] shadow-black/25 hover:bg-[var(--mundial-gold,#f5c518)]",
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
      <span
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-md ring-1",
          on ? "bg-black/25 ring-white/35" : "bg-black/10 ring-black/20"
        )}
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        ) : (
          <FlaskConical className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-bold leading-none tracking-tight">
          Tryb testowy
        </span>
        <span
          className={cn(
            "mt-0.5 block truncate text-[10px] font-semibold uppercase tracking-wide",
            on ? "text-white/85" : "text-[var(--mundial-navy,#0a1628)]/75"
          )}
        >
          {on ? "Aktywny" : "Wyłączony"}
        </span>
      </span>
    </button>
  );
}
