"use client";

import { useCallback, useEffect, useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import {
  adminChromeBtnActiveClass,
  adminChromeBtnBaseClass,
  adminChromeBtnIdleClass,
} from "@/lib/admin-chrome-button";
import { cn } from "@/lib/utils";

type State = { enabled: boolean; configured: boolean } | null;

/**
 * Skrót do ustawień płatności operatora — boczny panel admina, obok trybu testowego.
 */
export function AdminOperatorPaymentsSidebarButton({
  active,
  onOpen,
  className,
}: {
  active?: boolean;
  onOpen: () => void;
  className?: string;
}) {
  const [state, setState] = useState<State>(null);

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

  useEffect(() => {
    if (active) void load();
  }, [active, load]);

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

  const on = Boolean(active) || (state.enabled && state.configured);

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        adminChromeBtnBaseClass,
        on ? adminChromeBtnActiveClass : adminChromeBtnIdleClass,
        className
      )}
      aria-current={active ? "page" : undefined}
      title={
        !state.configured
          ? "Płatności operatora — brak konfiguracji HotPay w env"
          : state.enabled && state.configured
            ? "Płatności operatora — włączone (ustawienia)"
            : "Płatności operatora — wyłączone (ustawienia)"
      }
    >
      <span
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-md ring-1",
          on ? "bg-black/25 ring-white/35" : "bg-black/10 ring-black/20"
        )}
      >
        <CreditCard className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-bold leading-none tracking-tight">
          Płatności operatora
        </span>
        <span
          className={cn(
            "mt-0.5 block truncate text-[10px] font-semibold uppercase tracking-wide",
            on ? "text-white/85" : "text-[var(--mundial-navy,#0a1628)]/75"
          )}
        >
          {!state.configured
            ? "Brak env"
            : active
              ? "Otwarte"
              : state.enabled
                ? "Włączone"
                : "Wyłączone"}
        </span>
      </span>
    </button>
  );
}
