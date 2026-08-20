"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { MessageCircle, X } from "lucide-react";
import { AdminMessagesTab } from "@/components/admin-messages-tab";
import { cn } from "@/lib/utils";

type Props = {
  initialUnreadCount?: number;
  /** Mniejszy przycisk na mobilnym pasku (żeby nie nachodził na logo). */
  compact?: boolean;
};

export function AdminHeaderMessagesButton({ initialUnreadCount = 0, compact = false }: Props) {
  const [mounted, setMounted] = useState(false);
  const [unread, setUnread] = useState(initialUnreadCount);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function closeBubble() {
    setOpen(false);
    void refresh();
  }

  const bubble =
    mounted && open
      ? createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Szatnia łączności"
            className="mp-chat-widget bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-3 sm:bottom-5 sm:left-5"
          >
            <AdminMessagesTab
              mode="popup"
              active={open}
              onUnreadChange={refresh}
              onClose={closeBubble}
            />
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "awp-focus-ring relative inline-flex touch-manipulation items-center justify-center rounded-full border shadow-sm transition-colors",
          open
            ? "border-[var(--mp-teal)] bg-[var(--mp-teal)] text-white hover:bg-[var(--mp-teal-dark)]"
            : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:text-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200",
          compact ? "h-9 w-9 xs:h-10 xs:w-10" : "h-10 w-10"
        )}
        aria-label={
          unread > 0
            ? `Szatnia łączności (${unread} nieprzeczytanych)`
            : open
              ? "Zamknij szatnię łączności"
              : "Szatnia łączności"
        }
        title="Szatnia łączności"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        {open ? (
          <X className={cn(compact ? "h-4 w-4 xs:h-5 xs:w-5" : "h-5 w-5")} aria-hidden />
        ) : (
          <MessageCircle className={cn(compact ? "h-4 w-4 xs:h-5 xs:w-5" : "h-5 w-5")} aria-hidden />
        )}
        {!open && unread > 0 ? (
          <span
            className="absolute right-0 top-0 inline-flex min-h-[1rem] min-w-[1rem] translate-x-0.5 -translate-y-0.5 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold tabular-nums leading-none text-white ring-2 ring-white dark:ring-zinc-900"
            aria-hidden
          >
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </button>
      {bubble}
    </>
  );
}
