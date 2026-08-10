"use client";

import { useCallback, useEffect, useState } from "react";
import { FlaskConical, Loader2 } from "lucide-react";
import { toast } from "@/lib/app-toast";
import {
  adminChromeBtnActiveClass,
  adminChromeBtnBaseClass,
  adminChromeBtnIdleClass,
} from "@/lib/admin-chrome-button";
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
    const toastId = toast.loading(enabled ? "Włączanie sandboxu…" : "Wyłączanie — czyszczenie testów…");
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
        toast.error(typeof j.error === "string" ? j.error : "Nie udało się przełączyć", {
          id: toastId,
        });
        return;
      }
      setState({
        enabled: Boolean(j.enabled),
        configured: j.configured !== false,
      });
      toast.success(
        enabled ? "Sandbox włączony — gracze bez zmian" : "Sandbox wyłączony — testy skasowane",
        { id: toastId }
      );
      window.location.reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Błąd sandboxu", { id: toastId });
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
        adminChromeBtnBaseClass,
        on ? adminChromeBtnActiveClass : adminChromeBtnIdleClass,
        className
      )}
      aria-pressed={on}
      title={
        !state.configured
          ? "Sandbox niedostępny — skonfiguruj środowisko testowe"
          : on
            ? "Wyłącz: skasuje mecze i płatności testowe"
            : "Włącz: ćwicz mecze i płatności bez wpływu na graczy"
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
          {on ? "Sandbox ON" : "Sandbox OFF"}
        </span>
      </span>
    </button>
  );
}
