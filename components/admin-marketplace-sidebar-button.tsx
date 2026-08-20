"use client";

import { useCallback, useEffect, useState } from "react";
import { LandPlot, Loader2 } from "lucide-react";
import { toast } from "@/lib/app-toast";
import {
  adminChromeBtnActiveClass,
  adminChromeBtnBaseClass,
  adminChromeBtnIdleClass,
} from "@/lib/admin-chrome-button";
import { cn } from "@/lib/utils";

type State = { enabled: boolean } | null;

/**
 * Wyłącznik marketplace’u rezerwacji — boczny panel admina, obok trybu testowego.
 */
export function AdminMarketplaceSidebarButton({ className }: { className?: string }) {
  const [state, setState] = useState<State>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/app-settings");
      if (!res.ok) return;
      const j = (await res.json()) as { booking_marketplace_enabled?: boolean };
      setState({ enabled: Boolean(j.booking_marketplace_enabled) });
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    function onChanged(ev: Event) {
      const detail = (ev as CustomEvent<{ enabled?: boolean }>).detail;
      if (typeof detail?.enabled === "boolean") {
        setState({ enabled: detail.enabled });
        return;
      }
      void load();
    }
    window.addEventListener("awp-marketplace-settings-changed", onChanged);
    return () => window.removeEventListener("awp-marketplace-settings-changed", onChanged);
  }, [load]);

  const toggle = useCallback(async () => {
    if (state == null || busy) return;
    const enabled = !state.enabled;
    setBusy(true);
    const toastId = toast.loading(enabled ? "Włączanie rezerwacji boisk…" : "Wyłączanie rezerwacji boisk…");
    try {
      const res = await fetch("/api/admin/app-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_marketplace_enabled: enabled }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        error?: string;
        booking_marketplace_enabled?: boolean;
      };
      if (!res.ok) {
        toast.error(typeof j.error === "string" ? j.error : "Nie udało się przełączyć", { id: toastId });
        return;
      }
      const next = Boolean(j.booking_marketplace_enabled);
      setState({ enabled: next });
      window.dispatchEvent(
        new CustomEvent("awp-marketplace-settings-changed", { detail: { enabled: next } })
      );
      toast.success(
        next
          ? "Rezerwacja boisk włączona — gracze widzą katalog hal"
          : "Rezerwacja boisk wyłączona — zostaje sam terminarz akademii",
        { id: toastId }
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Błąd zapisu", { id: toastId });
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
      disabled={busy}
      onClick={() => void toggle()}
      className={cn(
        adminChromeBtnBaseClass,
        on ? adminChromeBtnActiveClass : adminChromeBtnIdleClass,
        className
      )}
      aria-pressed={on}
      title={
        on
          ? "Wyłącz rezerwację boisk — gracze wracają do terminarza akademii"
          : "Włącz rezerwację boisk — katalog hal i rezerwacje online"
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
          <LandPlot className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-bold leading-none tracking-tight">
          Rezerwacja boisk
        </span>
        <span
          className={cn(
            "mt-0.5 block truncate text-[10px] font-semibold uppercase tracking-wide",
            on ? "text-white/85" : "text-[var(--mundial-navy,#0a1628)]/75"
          )}
        >
          {on ? "Włączone" : "Wyłączone"}
        </span>
      </span>
    </button>
  );
}
