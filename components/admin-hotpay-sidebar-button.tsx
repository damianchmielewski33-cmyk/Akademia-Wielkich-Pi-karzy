"use client";

import { useCallback, useEffect, useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { toast } from "@/lib/app-toast";
import { cn } from "@/lib/utils";

type State = { enabled: boolean; configured: boolean } | null;

/**
 * Duży przełącznik płatności HotPay — boczny panel admina (obok trybu testowego).
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
        "awp-focus-ring group relative w-full overflow-hidden rounded-2xl border-2 px-3 py-3.5 text-left shadow-lg transition-[transform,box-shadow,background-color] active:translate-y-px",
        "disabled:pointer-events-none disabled:opacity-60",
        on
          ? "border-emerald-300/60 bg-gradient-to-br from-emerald-500/85 via-teal-600/90 to-emerald-900/95 text-white shadow-emerald-950/35 hover:brightness-110"
          : "border-zinc-400/45 bg-gradient-to-br from-zinc-500/35 via-zinc-700/45 to-zinc-950/60 text-white shadow-black/30 hover:from-zinc-400/40",
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
      <span className="relative flex items-start gap-2.5">
        <span
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-2",
            on ? "bg-black/25 ring-white/35" : "bg-black/25 ring-white/20"
          )}
        >
          {busy ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          ) : (
            <CreditCard className="h-5 w-5" strokeWidth={2.25} aria-hidden />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[0.65rem] font-bold uppercase tracking-[0.14em] text-white/75">
            {on ? "Włączone" : "Wyłączone"}
          </span>
          <span className="mt-0.5 block text-sm font-extrabold leading-tight tracking-tight sm:text-base">
            Płatności HotPay
          </span>
          <span className="mt-1 block text-[11px] font-medium leading-snug text-white/85">
            {!state.configured
              ? "Brak kluczy API w env"
              : on
                ? "Kliknij, aby wyłączyć bramkę"
                : "Kliknij, aby włączyć bramkę"}
          </span>
        </span>
      </span>
    </button>
  );
}
