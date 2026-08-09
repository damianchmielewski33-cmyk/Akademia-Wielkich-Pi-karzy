"use client";

import { useCallback, useEffect, useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { toast } from "@/lib/app-toast";
import { cn } from "@/lib/utils";

type State = { enabled: boolean; configured: boolean } | null;

/**
 * Przełącznik płatności HotPay — boczny panel admina.
 */
export function AdminHotpaySidebarButton({ className }: { className?: string }) {
  const [state, setState] = useState<State>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/app-settings");
      if (!res.ok) return;
      const j = (await res.json()) as {
        hotpay_enabled?: boolean;
        system?: { hotpay_configured?: boolean };
      };
      setState({
        enabled: Boolean(j.hotpay_enabled),
        configured: Boolean(j.system?.hotpay_configured),
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
    const toastId = toast.loading(enabled ? "Włączanie płatności HotPay…" : "Wyłączanie płatności HotPay…");
    try {
      const res = await fetch("/api/admin/app-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hotpay_enabled: enabled }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        error?: string;
        hotpay_enabled?: boolean;
        system?: { hotpay_configured?: boolean };
      };
      if (!res.ok) {
        toast.error(typeof j.error === "string" ? j.error : "Nie udało się zapisać", { id: toastId });
        return;
      }
      setState({
        enabled: Boolean(j.hotpay_enabled),
        configured: Boolean(j.system?.hotpay_configured ?? state.configured),
      });
      toast.success(enabled ? "Płatności HotPay włączone" : "Płatności HotPay wyłączone", { id: toastId });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Błąd ustawień płatności", { id: toastId });
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
          ? "border-emerald-300/70 bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-900 text-white shadow-emerald-950/35 hover:brightness-110"
          : "border-white/55 bg-white/95 text-[var(--mundial-navy,#0a1628)] shadow-black/25 hover:bg-white",
        className
      )}
      aria-pressed={on}
      title={
        !state.configured
          ? "HotPay nieskonfigurowany (brak kluczy env)"
          : on
            ? "Wyłącz płatności u operatora HotPay"
            : "Włącz płatności u operatora HotPay"
      }
    >
      <span
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-md ring-1",
          on ? "bg-black/25 ring-white/35" : "bg-black/5 ring-black/15"
        )}
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        ) : (
          <CreditCard className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-bold leading-none tracking-tight">
          Płatności HotPay
        </span>
        <span
          className={cn(
            "mt-0.5 block truncate text-[10px] font-semibold uppercase tracking-wide",
            on ? "text-white/85" : "text-[var(--mundial-navy,#0a1628)]/70"
          )}
        >
          {!state.configured ? "Brak kluczy API" : on ? "Włączone" : "Wyłączone"}
        </span>
      </span>
    </button>
  );
}
