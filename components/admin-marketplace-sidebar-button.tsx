"use client";

import { useCallback, useEffect, useState } from "react";
import { LandPlot, Loader2 } from "lucide-react";
import { toast } from "@/lib/app-toast";
import { AdminNavTile } from "@/components/admin-nav-tile";
import { cn } from "@/lib/utils";

type State = { enabled: boolean } | null;

/**
 * Przełącznik wersji aplikacji — boczny panel admina, obok trybu testowego.
 * V1 = bez rezerwacji boisk, V2 = z rezerwacjami.
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
    const toastId = toast.loading(
      enabled ? "Przełączanie na wersję aplikacji V2…" : "Przełączanie na wersję aplikacji V1…"
    );
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
          ? "Wersja aplikacji V2 — gracze widzą katalog hal i rezerwacje"
          : "Wersja aplikacji V1 — zostaje sam terminarz akademii",
        { id: toastId }
      );
      window.location.reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Błąd zapisu", { id: toastId });
    } finally {
      setBusy(false);
    }
  }, [busy, state]);

  if (state == null) {
    return (
      <div className={cn("flex min-h-[4.75rem] items-center justify-center", className)} aria-hidden>
        <Loader2 className="h-5 w-5 animate-spin text-white/70" />
      </div>
    );
  }

  const on = state.enabled;

  return (
    <AdminNavTile
      title="Wersja aplikacji"
      desc={on ? "V2 — akademia z rezerwacją boisk" : "V1 — akademia bez rezerwacji boisk"}
      icon={LandPlot}
      photoKey="app-version"
      active={on}
      disabled={busy}
      onClick={() => void toggle()}
      className={className}
      badge={busy ? <Loader2 className="h-4 w-4 animate-spin text-white" aria-hidden /> : undefined}
    />
  );
}
