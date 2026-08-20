"use client";

import { useCallback, useEffect, useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { AdminNavTile } from "@/components/admin-nav-tile";
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

  useEffect(() => {
    function onChanged(ev: Event) {
      const detail = (ev as CustomEvent<{ enabled?: boolean; configured?: boolean }>).detail;
      if (!detail) {
        void load();
        return;
      }
      setState({
        enabled: Boolean(detail.enabled),
        configured: detail.configured !== undefined ? Boolean(detail.configured) : true,
      });
    }
    window.addEventListener("awp-hotpay-settings-changed", onChanged);
    return () => window.removeEventListener("awp-hotpay-settings-changed", onChanged);
  }, [load]);

  if (state == null) {
    return (
      <div className={cn("flex min-h-[4.75rem] items-center justify-center", className)} aria-hidden>
        <Loader2 className="h-5 w-5 animate-spin text-white/70" />
      </div>
    );
  }

  const subtitle = !state.configured
    ? "Brak konfiguracji HotPay"
    : active
      ? "Otwarte — ustawienia bramki"
      : state.enabled
        ? "Włączone — otwórz ustawienia"
        : "Wyłączone — otwórz ustawienia";

  return (
    <AdminNavTile
      title="Płatności operatora"
      desc={subtitle}
      icon={CreditCard}
      photoKey="operator-payments"
      active={Boolean(active)}
      onClick={onOpen}
      className={className}
    />
  );
}
