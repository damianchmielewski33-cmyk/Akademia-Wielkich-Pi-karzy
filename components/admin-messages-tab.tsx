"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Mail, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import {
  AdminCard,
  AdminToolbar,
  adminEmptyStateClass,
  adminInnerPanelClass,
} from "@/components/admin-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type MessageItem = {
  id: number;
  user_id: number | null;
  sender_name: string;
  sender_email: string | null;
  recipient_key: string | null;
  recipient_label: string | null;
  body: string;
  status: "unread" | "read";
  created_at_display: string;
  user_alias: string | null;
  preview: string;
};

type Props = {
  onUnreadChange?: () => void;
};

export function AdminMessagesTab({ onUnreadChange }: Props) {
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [markingRead, setMarkingRead] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/messages");
      const data = (await res.json().catch(() => ({}))) as {
        messages?: MessageItem[];
        error?: string;
      };
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Nie udało się wczytać wiadomości");
        return;
      }
      setMessages(data.messages ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const unreadCount = messages.filter((m) => m.status === "unread").length;
  const selected = messages.find((m) => m.id === selectedId) ?? null;

  async function openMessage(id: number) {
    setSelectedId(id);
    const msg = messages.find((m) => m.id === id);
    if (!msg || msg.status === "read") return;

    setMarkingRead(true);
    try {
      const res = await fetch(`/api/admin/messages/${id}`, { method: "PATCH" });
      if (!res.ok) {
        toast.error("Nie udało się oznaczyć wiadomości jako przeczytanej");
        return;
      }
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, status: "read" as const } : m))
      );
      onUnreadChange?.();
    } finally {
      setMarkingRead(false);
    }
  }

  return (
    <div>
      <AdminToolbar
        title="Wiadomości"
        description="Wiadomości od graczy i gości witryny. Liczba nieprzeczytanych pojawia się też na przycisku tej zakładki."
        onReload={load}
        loading={loading}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <AdminCard className="min-h-[20rem]">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-white">Skrzynka odbiorcza</p>
            {unreadCount > 0 ? (
              <Badge className="bg-red-500 text-white hover:bg-red-500">
                {unreadCount > 99 ? "99+" : unreadCount} nowe
              </Badge>
            ) : (
              <Badge variant="outline" className="border-white/25 text-emerald-100/80">
                Brak nowych
              </Badge>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-emerald-100/70">
              <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
            </div>
          ) : messages.length === 0 ? (
            <p className={adminEmptyStateClass}>Brak wiadomości.</p>
          ) : (
            <ul className="space-y-2" role="list">
              {messages.map((m) => {
                const active = selectedId === m.id;
                const unread = m.status === "unread";
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => void openMessage(m.id)}
                      className={cn(
                        "w-full rounded-xl border px-3 py-3 text-left transition-colors",
                        active
                          ? "border-[var(--mundial-gold)]/60 bg-white/15"
                          : "border-white/20 bg-black/10 hover:bg-white/10",
                        unread && !active && "border-emerald-300/35 bg-emerald-950/25"
                      )}
                    >
                      <div className="flex items-start gap-2">
                        {unread ? (
                          <span
                            className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-red-500"
                            aria-hidden
                          />
                        ) : (
                          <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-white/20" aria-hidden />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                            <p className={cn("truncate font-semibold", unread ? "text-white" : "text-emerald-50/90")}>
                              {m.sender_name}
                            </p>
                            <time className="shrink-0 text-[0.7rem] tabular-nums text-emerald-100/60">
                              {m.created_at_display}
                            </time>
                          </div>
                          {m.recipient_label ? (
                            <p className="truncate text-xs text-emerald-100/55">Do: {m.recipient_label}</p>
                          ) : null}
                          {m.user_alias ? (
                            <p className="truncate text-xs text-emerald-100/55">Konto: {m.user_alias}</p>
                          ) : null}
                          <p className="mt-1 line-clamp-2 text-sm text-emerald-100/75">{m.preview}</p>
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </AdminCard>

        <AdminCard className="min-h-[20rem]">
          {selected ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/15 pb-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5 shrink-0 text-[var(--mundial-gold)]" aria-hidden />
                    <h3 className="truncate text-lg font-bold text-white">{selected.sender_name}</h3>
                  </div>
                  <p className="mt-1 text-sm text-emerald-100/70">{selected.created_at_display}</p>
                  {selected.recipient_label ? (
                    <p className="mt-2 text-sm font-medium text-[var(--mundial-gold)]">
                      Adresat: {selected.recipient_label}
                    </p>
                  ) : null}
                  {selected.user_alias ? (
                    <p className="mt-1 text-xs text-emerald-100/55">Powiązane konto: {selected.user_alias}</p>
                  ) : (
                    <p className="mt-1 text-xs text-emerald-100/45">Wiadomość od gościa (bez konta)</p>
                  )}
                </div>
                <Badge
                  className={cn(
                    selected.status === "unread"
                      ? "bg-red-500 text-white hover:bg-red-500"
                      : "border-white/25 bg-black/20 text-emerald-100/80"
                  )}
                >
                  {selected.status === "unread" ? "Nowa" : "Przeczytana"}
                </Badge>
              </div>

              <div className={cn(adminInnerPanelClass, "whitespace-pre-wrap text-sm leading-relaxed text-emerald-50/95")}>
                {selected.body}
              </div>

              {selected.sender_email ? (
                <Button asChild variant="stadium" className="w-full sm:w-auto">
                  <a
                    href={`mailto:${encodeURIComponent(selected.sender_email)}?subject=${encodeURIComponent("Odpowiedź — Akademia Wielkich Piłkarzy")}`}
                  >
                    <Mail className="mr-2 h-4 w-4" aria-hidden />
                    Odpowiedz e-mailem
                  </a>
                </Button>
              ) : null}

              {markingRead && selected.status === "unread" ? (
                <p className="text-xs text-emerald-100/55">
                  <Loader2 className="mr-1 inline h-3.5 w-3.5 animate-spin" aria-hidden />
                  Oznaczanie jako przeczytane…
                </p>
              ) : null}
            </div>
          ) : (
            <div className="flex h-full min-h-[16rem] flex-col items-center justify-center gap-3 px-4 text-center">
              <MessageCircle className="h-10 w-10 text-emerald-100/35" aria-hidden />
              <p className="text-sm text-emerald-100/70">Wybierz wiadomość z listy po lewej, aby ją otworzyć.</p>
            </div>
          )}
        </AdminCard>
      </div>
    </div>
  );
}
