"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  initialUnreadCount?: number;
};

export function AdminHeaderMessagesButton({ initialUnreadCount = 0 }: Props) {
  const [unread, setUnread] = useState(initialUnreadCount);

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
    <Link
      href="/panel-admina?tab=messages"
      className={cn(
        "awp-focus-ring relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white shadow-sm transition-colors hover:bg-white/15"
      )}
      aria-label={unread > 0 ? `Wiadomości (${unread} nieprzeczytanych)` : "Wiadomości"}
      title={unread > 0 ? `Wiadomości (${unread} nieprzeczytanych)` : "Wiadomości"}
    >
      <MessageCircle className="h-5 w-5" aria-hidden />
      {unread > 0 ? (
        <span
          className="absolute -right-1 -top-1 inline-flex min-h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold tabular-nums text-white ring-2 ring-emerald-900"
          aria-hidden
        >
          {unread > 99 ? "99+" : unread}
        </span>
      ) : null}
    </Link>
  );
}
