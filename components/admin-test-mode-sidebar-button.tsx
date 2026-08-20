"use client";

import { useCallback, useEffect, useState } from "react";
import { FlaskConical, Loader2 } from "lucide-react";
import { toast } from "@/lib/app-toast";
import { AdminNavTile } from "@/components/admin-nav-tile";
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
      <div className={cn("flex min-h-[4.75rem] items-center justify-center", className)} aria-hidden>
        <Loader2 className="h-5 w-5 animate-spin text-white/70" />
      </div>
    );
  }

  const on = state.enabled;

  return (
    <AdminNavTile
      title="Tryb testowy"
      desc={
        !state.configured
          ? "Sandbox niedostępny — skonfiguruj środowisko"
          : on
            ? "Sandbox włączony — kliknij, aby wyłączyć"
            : "Sandbox wyłączony — ćwicz bez wpływu na graczy"
      }
      icon={FlaskConical}
      photoKey="test-mode"
      active={on}
      disabled={busy || !state.configured}
      onClick={() => void toggle()}
      className={className}
      badge={busy ? <Loader2 className="h-4 w-4 animate-spin text-white" aria-hidden /> : undefined}
    />
  );
}
