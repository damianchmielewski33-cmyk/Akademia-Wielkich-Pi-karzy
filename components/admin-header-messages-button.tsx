"use client";

import { useCallback, useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { AdminMessagesTab } from "@/components/admin-messages-tab";
import { AppModal } from "@/components/ui/app-modal";
import { cn } from "@/lib/utils";

type Props = {
  initialUnreadCount?: number;
  /** Mniejszy przycisk na mobilnym pasku (żeby nie nachodził na logo). */
  compact?: boolean;
};

export function AdminHeaderMessagesButton({ initialUnreadCount = 0, compact = false }: Props) {
  const [unread, setUnread] = useState(initialUnreadCount);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setUnread(initialUnreadCount);
  }, [initialUnreadCount]);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/messages");
      if (!res.ok) return;
      const data = (await res.json()) as { unread_count?: number };
      if (typeof data.unread_count === "number") setUnread(data.unread_count);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onVis = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVis);
    const id = window.setInterval(refresh, 60_000);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.clearInterval(id);
    };
  }, [refresh]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "awp-focus-ring relative inline-flex touch-manipulation items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white shadow-sm transition-colors hover:bg-white/15",
          compact ? "h-9 w-9 xs:h-10 xs:w-10" : "h-10 w-10"
        )}
        aria-label={unread > 0 ? `Wiadomości (${unread} nieprzeczytanych)` : "Wiadomości"}
        title={unread > 0 ? `Wiadomości (${unread} nieprzeczytanych)` : "Wiadomości"}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <MessageCircle className={cn(compact ? "h-4 w-4 xs:h-5 xs:w-5" : "h-5 w-5")} aria-hidden />
        {unread > 0 ? (
          <span
            className="absolute right-0 top-0 inline-flex min-h-[1rem] min-w-[1rem] translate-x-0.5 -translate-y-0.5 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold tabular-nums leading-none text-white ring-2 ring-emerald-900"
            aria-hidden
          >
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </button>

      <AppModal
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) void refresh();
        }}
        hideHeader
        title="Szatnia łączności"
        description="Rozmowy z zawodnikami i gośćmi akademii."
        size="full"
        className={cn(
          "gap-0 overflow-hidden border-2 border-[var(--mundial-gold)]/35 bg-[#0d5c45] p-0 pt-0 text-white shadow-[0_28px_90px_-28px_rgba(0,40,28,0.85)]",
          "home-pitch-tile max-h-[min(92dvh,calc(100dvh-1rem-env(safe-area-inset-top)-env(safe-area-inset-bottom)))]",
          "before:h-1 before:from-[var(--mundial-gold)] before:via-emerald-300 before:to-[var(--mundial-gold)]",
          "[&>button]:right-3 [&>button]:top-3.5 [&>button]:z-30 [&>button]:border-white/25 [&>button]:bg-black/30 [&>button]:text-white [&>button]:hover:border-white/40 [&>button]:hover:bg-black/45 [&>button]:hover:text-white"
        )}
        contentClassName="min-h-0 space-y-0 overflow-hidden p-0"
      >
        <AdminMessagesTab mode="popup" active={open} onUnreadChange={refresh} />
      </AppModal>
    </>
  );
}
