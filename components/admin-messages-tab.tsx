"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Loader2, MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";
import {
  ChatAttachmentControls,
  ChatBubble,
  ChatComposerField,
  ChatComposerShell,
  ChatEmojiPicker,
  ChatTranscript,
  chatClusterForIndex,
  insertEmojiAtCursor,
} from "@/components/chat-composer-extras";
import {
  AdminCard,
  AdminToolbar,
  adminEmptyStateClass,
} from "@/components/admin-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  /** `popup` — układ pod modal (bez toolbaru panelu). */
  mode?: "page" | "popup";
  /** Gdy true, odświeża listę wątków (np. po otwarciu popupu). */
  active?: boolean;
};

export function AdminMessagesTab({ onUnreadChange, mode = "page", active = true }: Props) {
  const isPopup = mode === "popup";
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
    if (!active) return;
    void load();
  }, [active, load]);

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

  const threadList = (
    <>
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className={cn("text-sm font-semibold", isPopup ? "text-zinc-900 dark:text-zinc-50" : "text-white")}>
          Rozmowy
        </p>
        {unreadCount > 0 ? (
          <Badge className="bg-red-500 text-white hover:bg-red-500">
            {unreadCount > 99 ? "99+" : unreadCount} nowe
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className={
              isPopup
                ? "border-zinc-300 text-zinc-600 dark:border-zinc-600 dark:text-zinc-300"
                : "border-white/25 text-emerald-100/80"
            }
          >
            Brak nowych
          </Badge>
        )}
      </div>

      {loading ? (
        <div
          className={cn(
            "flex items-center justify-center py-16",
            isPopup ? "text-zinc-500" : "text-emerald-100/70"
          )}
        >
          <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
        </div>
      ) : threads.length === 0 ? (
        <p
          className={
            isPopup
              ? "rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-400"
              : adminEmptyStateClass
          }
        >
          Brak wiadomości.
        </p>
      ) : (
        <ul className="space-y-2" role="list">
          {threads.map((t) => {
            const activeThread = selectedKey === t.conversation_key;
            const unread = t.unread_count > 0;
            return (
              <li key={t.conversation_key}>
                <button
                  type="button"
                  onClick={() => void openThread(t.conversation_key)}
                  className={cn(
                    "w-full rounded-xl border px-3 py-3 text-left transition-colors",
                    isPopup
                      ? activeThread
                        ? "border-emerald-500/70 bg-emerald-50 dark:border-emerald-500/50 dark:bg-emerald-950/40"
                        : "border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/60 dark:hover:bg-zinc-800/60"
                      : activeThread
                        ? "border-[var(--mundial-gold)]/60 bg-white/15"
                        : "border-white/20 bg-black/10 hover:bg-white/10",
                    unread &&
                      !activeThread &&
                      (isPopup
                        ? "border-emerald-300/60 bg-emerald-50/70 dark:border-emerald-700/50 dark:bg-emerald-950/30"
                        : "border-emerald-300/35 bg-emerald-950/25")
                  )}
                >
                  <div className="flex items-start gap-2">
                    {unread ? (
                      <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-red-500" aria-hidden />
                    ) : (
                      <span
                        className={cn(
                          "mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full",
                          isPopup ? "bg-zinc-300 dark:bg-zinc-600" : "bg-white/20"
                        )}
                        aria-hidden
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                        <p
                          className={cn(
                            "truncate font-semibold",
                            isPopup
                              ? unread
                                ? "text-zinc-900 dark:text-zinc-50"
                                : "text-zinc-800 dark:text-zinc-100"
                              : unread
                                ? "text-white"
                                : "text-emerald-50/90"
                          )}
                        >
                          {t.sender_name}
                        </p>
                        <time
                          className={cn(
                            "shrink-0 text-[0.7rem] tabular-nums",
                            isPopup ? "text-zinc-500 dark:text-zinc-400" : "text-emerald-100/60"
                          )}
                        >
                          {t.last_at_display}
                        </time>
                      </div>
                      {t.recipient_label ? (
                        <p
                          className={cn(
                            "truncate text-xs",
                            isPopup ? "text-zinc-500 dark:text-zinc-400" : "text-emerald-100/55"
                          )}
                        >
                          Do: {t.recipient_label}
                        </p>
                      ) : null}
                      {t.user_alias ? (
                        <p
                          className={cn(
                            "truncate text-xs",
                            isPopup ? "text-zinc-500 dark:text-zinc-400" : "text-emerald-100/55"
                          )}
                        >
                          Konto: {t.user_alias}
                        </p>
                      ) : t.is_guest ? (
                        <p
                          className={cn(
                            "truncate text-xs",
                            isPopup ? "text-zinc-400 dark:text-zinc-500" : "text-emerald-100/45"
                          )}
                        >
                          Gość (bez konta)
                        </p>
                      ) : null}
                      <p
                        className={cn(
                          "mt-1 line-clamp-2 text-sm",
                          isPopup ? "text-zinc-600 dark:text-zinc-300" : "text-emerald-100/75"
                        )}
                      >
                        {t.preview}
                      </p>
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );

  const chatPane = selected ? (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div
        className={cn(
          "flex flex-wrap items-start justify-between gap-3 border-b pb-4",
          isPopup ? "border-zinc-200 dark:border-zinc-700" : "border-white/15"
        )}
      >
        <div className="min-w-0">
          {isPopup ? (
            <button
              type="button"
              onClick={() => {
                setSelectedKey(null);
                setMessages([]);
                clearAttachment();
                setReply("");
              }}
              className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-300 lg:hidden"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Wróć do listy
            </button>
          ) : null}
          <div className="flex items-center gap-2">
            <MessageCircle
              className={cn(
                "h-5 w-5 shrink-0",
                isPopup ? "text-emerald-600 dark:text-emerald-400" : "text-[var(--mundial-gold)]"
              )}
              aria-hidden
            />
            <h3
              className={cn(
                "truncate text-lg font-bold",
                isPopup ? "text-zinc-900 dark:text-zinc-50" : "text-white"
              )}
            >
              {selected.sender_name}
            </h3>
          </div>
          {selected.recipient_label ? (
            <p
              className={cn(
                "mt-2 text-sm font-medium",
                isPopup ? "text-emerald-700 dark:text-emerald-300" : "text-[var(--mundial-gold)]"
              )}
            >
              Adresat: {selected.recipient_label}
            </p>
          ) : null}
          {selected.user_alias ? (
            <p
              className={cn(
                "mt-1 text-xs",
                isPopup ? "text-zinc-500 dark:text-zinc-400" : "text-emerald-100/55"
              )}
            >
              Powiązane konto: {selected.user_alias}
            </p>
          ) : (
            <p
              className={cn(
                "mt-1 text-xs",
                isPopup ? "text-zinc-400 dark:text-zinc-500" : "text-emerald-100/45"
              )}
            >
              Gość — imię i nazwisko z listy Piłkarze
            </p>
          )}
        </div>
        {selected.unread_count > 0 ? (
          <Badge className="bg-red-500 text-white hover:bg-red-500">Nowe</Badge>
        ) : (
          <Badge
            className={
              isPopup
                ? "border-zinc-300 bg-zinc-100 text-zinc-600 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                : "border-white/25 bg-black/20 text-emerald-100/80"
            }
          >
            Przeczytane
          </Badge>
        )}
      </div>

      <div
        className={cn(
          isPopup ? "max-h-[min(340px,42vh)] min-h-[14rem]" : "max-h-[min(380px,48vh)] min-h-[16rem]"
        )}
      >
        <ChatTranscript
          tone={isPopup ? "light" : "pitch"}
          className="h-full max-h-[inherit] min-h-[inherit]"
          empty={
            loadingThread ? (
              <Loader2
                className={cn(
                  "h-5 w-5 animate-spin",
                  isPopup ? "text-zinc-500" : "text-emerald-100/70"
                )}
                aria-hidden
              />
            ) : messages.length === 0 ? (
              <p
                className={cn(
                  "text-center text-sm",
                  isPopup ? "text-zinc-500 dark:text-zinc-400" : "text-emerald-100/60"
                )}
              >
                Brak wiadomości w wątku.
              </p>
            ) : undefined
          }
        >
          {messages.length > 0
            ? (() => {
                const clustered = messages.map((m) => ({
                  mine: m.mine,
                  senderKey: m.mine ? "me" : m.sender_name,
                }));
                return messages.map((m, i) => (
                  <ChatBubble
                    key={m.id}
                    body={m.body}
                    attachmentUrl={m.attachment_url}
                    senderLabel={m.mine ? null : m.sender_name}
                    timeLabel={m.created_at_display}
                    mine={m.mine}
                    tone={isPopup ? "light" : "pitch"}
                    cluster={chatClusterForIndex(clustered, i)}
                  />
                ));
              })()
            : null}
          <div ref={bottomRef} />
        </ChatTranscript>
      </div>

      <form className="space-y-2" onSubmit={(e) => void sendReply(e)}>
        <ChatComposerShell tone={isPopup ? "light" : "pitch"}>
          <ChatEmojiPicker
            tone={isPopup ? "light" : "pitch"}
            disabled={sending || loadingThread}
            onPick={(emoji) => {
              setReply((prev) => insertEmojiAtCursor(prev, emoji, textareaRef.current));
            }}
          />
          <ChatAttachmentControls
            tone={isPopup ? "light" : "pitch"}
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
          <ChatComposerField
            id={isPopup ? "admin-chat-reply-popup" : "admin-chat-reply"}
            tone={isPopup ? "light" : "pitch"}
            value={reply}
            onChange={setReply}
            placeholder="Aa"
            disabled={sending || loadingThread}
            rows={2}
            fieldRef={textareaRef}
          />
          <Button
            type="submit"
            size="icon"
            variant="stadium"
            className="h-10 w-10 shrink-0 rounded-full"
            disabled={sending || uploadingAttachment || !canSend}
            aria-label="Odpisz"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Send className="h-4 w-4" aria-hidden />
            )}
          </Button>
        </ChatComposerShell>
      </form>
    </div>
  ) : (
    <div
      className={cn(
        "flex h-full min-h-[12rem] flex-col items-center justify-center gap-3 px-4 text-center",
        isPopup && "hidden lg:flex"
      )}
    >
      <MessageCircle
        className={cn("h-10 w-10", isPopup ? "text-zinc-300 dark:text-zinc-600" : "text-emerald-100/35")}
        aria-hidden
      />
      <p className={cn("text-sm", isPopup ? "text-zinc-500 dark:text-zinc-400" : "text-emerald-100/70")}>
        Wybierz rozmowę z listy, aby odpisać.
      </p>
    </div>
  );

  if (isPopup) {
    return (
      <div className="grid min-h-0 gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.15fr)]">
        <div className={cn("min-h-0", selectedKey ? "hidden lg:block" : "block")}>{threadList}</div>
        <div className={cn("min-h-0", selectedKey ? "block" : "hidden lg:block")}>{chatPane}</div>
      </div>
    );
  }

  return (
    <div>
      <AdminToolbar
        title="Wiadomości"
        description="Rozmowy z graczami i gośćmi. Możesz odpisywać tekstem, emotkami i grafikami."
        onReload={load}
        loading={loading}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <AdminCard className="min-h-[20rem]">{threadList}</AdminCard>
        <AdminCard className="min-h-[20rem]">{chatPane}</AdminCard>
      </div>
    </div>
  );
}
