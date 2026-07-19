"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";
import {
  ChatAttachmentControls,
  ChatBubble,
  ChatEmojiPicker,
  insertEmojiAtCursor,
} from "@/components/chat-composer-extras";
import {
  AdminCard,
  AdminToolbar,
  adminEmptyStateClass,
  adminInnerPanelClass,
} from "@/components/admin-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormTextarea } from "@/components/ui/form-field";
import { cn } from "@/lib/utils";

type ThreadItem = {
  conversation_key: string;
  sender_name: string;
  user_id: number | null;
  user_alias: string | null;
  recipient_label: string | null;
  last_at_display: string;
  unread_count: number;
  preview: string;
  is_guest: boolean;
};

type ChatMessage = {
  id: number;
  body: string;
  attachment_url?: string | null;
  direction: "inbound" | "outbound";
  status: string;
  sender_name: string;
  created_at_display: string;
  mine: boolean;
};

type Props = {
  onUnreadChange?: () => void;
};

export function AdminMessagesTab({ onUnreadChange }: Props) {
  const [threads, setThreads] = useState<ThreadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const clearAttachment = useCallback(() => {
    if (attachmentPreview?.startsWith("blob:")) URL.revokeObjectURL(attachmentPreview);
    setAttachmentUrl(null);
    setAttachmentPreview(null);
  }, [attachmentPreview]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/messages");
      const data = (await res.json().catch(() => ({}))) as {
        threads?: ThreadItem[];
        error?: string;
      };
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Nie udało się wczytać wiadomości");
        return;
      }
      setThreads(data.threads ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const unreadCount = threads.reduce((sum, t) => sum + t.unread_count, 0);
  const selected = threads.find((t) => t.conversation_key === selectedKey) ?? null;

  const openThread = useCallback(
    async (key: string) => {
      setSelectedKey(key);
      setLoadingThread(true);
      setReply("");
      clearAttachment();
      try {
        const params = new URLSearchParams({ conversation_key: key });
        const res = await fetch(`/api/admin/messages/thread?${params.toString()}`);
        const data = (await res.json().catch(() => ({}))) as {
          messages?: ChatMessage[];
          error?: string;
        };
        if (!res.ok) {
          toast.error(typeof data.error === "string" ? data.error : "Nie udało się otworzyć rozmowy");
          return;
        }
        setMessages(data.messages ?? []);
        setThreads((prev) =>
          prev.map((t) => (t.conversation_key === key ? { ...t, unread_count: 0 } : t))
        );
        onUnreadChange?.();
      } finally {
        setLoadingThread(false);
      }
    },
    [onUnreadChange, clearAttachment]
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedKey) return;
    const text = reply.trim();
    if (!text && !attachmentUrl) return;
    setSending(true);
    try {
      const res = await fetch("/api/admin/messages/thread", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_key: selectedKey,
          body: text,
          attachment_url: attachmentUrl,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        message?: ChatMessage;
        error?: string;
      };
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Nie udało się wysłać odpowiedzi");
        return;
      }
      if (data.message) {
        setMessages((prev) => [...prev, data.message!]);
      }
      setReply("");
      clearAttachment();
      await load();
      onUnreadChange?.();
    } finally {
      setSending(false);
    }
  }

  const canSend = Boolean(reply.trim() || attachmentUrl);

  return (
    <div>
      <AdminToolbar
        title="Wiadomości"
        description="Rozmowy z graczami i gośćmi. Możesz odpisywać tekstem, emotkami i grafikami."
        onReload={load}
        loading={loading}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <AdminCard className="min-h-[20rem]">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-white">Rozmowy</p>
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
          ) : threads.length === 0 ? (
            <p className={adminEmptyStateClass}>Brak wiadomości.</p>
          ) : (
            <ul className="space-y-2" role="list">
              {threads.map((t) => {
                const active = selectedKey === t.conversation_key;
                const unread = t.unread_count > 0;
                return (
                  <li key={t.conversation_key}>
                    <button
                      type="button"
                      onClick={() => void openThread(t.conversation_key)}
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
                              {t.sender_name}
                            </p>
                            <time className="shrink-0 text-[0.7rem] tabular-nums text-emerald-100/60">
                              {t.last_at_display}
                            </time>
                          </div>
                          {t.recipient_label ? (
                            <p className="truncate text-xs text-emerald-100/55">Do: {t.recipient_label}</p>
                          ) : null}
                          {t.user_alias ? (
                            <p className="truncate text-xs text-emerald-100/55">Konto: {t.user_alias}</p>
                          ) : t.is_guest ? (
                            <p className="truncate text-xs text-emerald-100/45">Gość (bez konta)</p>
                          ) : null}
                          <p className="mt-1 line-clamp-2 text-sm text-emerald-100/75">{t.preview}</p>
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
            <div className="flex h-full min-h-[20rem] flex-col gap-4">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/15 pb-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5 shrink-0 text-[var(--mundial-gold)]" aria-hidden />
                    <h3 className="truncate text-lg font-bold text-white">{selected.sender_name}</h3>
                  </div>
                  {selected.recipient_label ? (
                    <p className="mt-2 text-sm font-medium text-[var(--mundial-gold)]">
                      Adresat: {selected.recipient_label}
                    </p>
                  ) : null}
                  {selected.user_alias ? (
                    <p className="mt-1 text-xs text-emerald-100/55">Powiązane konto: {selected.user_alias}</p>
                  ) : (
                    <p className="mt-1 text-xs text-emerald-100/45">Gość — imię i nazwisko z listy Piłkarze</p>
                  )}
                </div>
                {selected.unread_count > 0 ? (
                  <Badge className="bg-red-500 text-white hover:bg-red-500">Nowe</Badge>
                ) : (
                  <Badge className="border-white/25 bg-black/20 text-emerald-100/80">Przeczytane</Badge>
                )}
              </div>

              <div className={cn(adminInnerPanelClass, "max-h-[min(360px,45vh)] flex-1 space-y-2 overflow-y-auto")}>
                {loadingThread ? (
                  <div className="flex justify-center py-10 text-emerald-100/70">
                    <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                  </div>
                ) : messages.length === 0 ? (
                  <p className="py-8 text-center text-sm text-emerald-100/60">Brak wiadomości w wątku.</p>
                ) : (
                  messages.map((m) => (
                    <ChatBubble
                      key={m.id}
                      body={m.body}
                      attachmentUrl={m.attachment_url}
                      senderLabel={m.mine ? "Ty" : m.sender_name}
                      timeLabel={m.created_at_display}
                      mine={m.mine}
                    />
                  ))
                )}
                <div ref={bottomRef} />
              </div>

              <form className="space-y-3" onSubmit={(e) => void sendReply(e)}>
                <FormTextarea
                  id="admin-chat-reply"
                  label="Odpowiedź"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Napisz odpowiedź do gracza…"
                  rows={3}
                  disabled={sending || loadingThread}
                  ref={textareaRef}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <ChatEmojiPicker
                    disabled={sending || loadingThread}
                    onPick={(emoji) => {
                      setReply((prev) => insertEmojiAtCursor(prev, emoji, textareaRef.current));
                    }}
                  />
                  <ChatAttachmentControls
                    disabled={sending || loadingThread}
                    attachmentUrl={attachmentUrl}
                    previewUrl={attachmentPreview}
                    onUploadingChange={setUploadingAttachment}
                    onUploaded={(url, preview) => {
                      if (attachmentPreview?.startsWith("blob:")) URL.revokeObjectURL(attachmentPreview);
                      setAttachmentUrl(url);
                      setAttachmentPreview(preview);
                    }}
                    onClear={clearAttachment}
                  />
                  <Button
                    type="submit"
                    variant="stadium"
                    className="ml-auto"
                    disabled={sending || uploadingAttachment || !canSend}
                  >
                    {sending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                        Wysyłanie…
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" aria-hidden />
                        Odpisz
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          ) : (
            <div className="flex h-full min-h-[16rem] flex-col items-center justify-center gap-3 px-4 text-center">
              <MessageCircle className="h-10 w-10 text-emerald-100/35" aria-hidden />
              <p className="text-sm text-emerald-100/70">Wybierz rozmowę z listy po lewej, aby odpisać.</p>
            </div>
          )}
        </AdminCard>
      </div>
    </div>
  );
}
