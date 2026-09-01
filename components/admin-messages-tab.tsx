"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Loader2, MessageCircle, Plus, Send, Trash2, UserPlus, Users, X } from "lucide-react";
import { toast } from "@/lib/app-toast";
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
import { ChatPeerPicker, type ChatPeer } from "@/components/chat-peer-picker";
import {
  AdminCard,
  AdminToolbar,
  adminEmptyStateClass,
} from "@/components/admin-ui";
import { PlayerAvatar } from "@/components/player-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function conversationKeyForUser(userId: number) {
  return `user:${userId}`;
}

function splitDisplayName(name: string): { first: string; last: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: "?", last: "" };
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

type ThreadItem = {
  conversation_key: string;
  sender_name: string;
  user_id: number | null;
  user_alias: string | null;
  profile_photo_path?: string | null;
  first_name?: string | null;
  last_name?: string | null;
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
  /** `popup` — dymek czatu V2 (bez toolbaru panelu). */
  mode?: "page" | "popup";
  /** Gdy true, odświeża listę wątków (np. po otwarciu dymka). */
  active?: boolean;
  /** Zamknięcie dymka (tylko mode=popup). */
  onClose?: () => void;
};

export function AdminMessagesTab({
  onUnreadChange,
  mode = "page",
  active = true,
  onClose,
}: Props) {
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
  const [composingNew, setComposingNew] = useState(false);
  const [draftPeer, setDraftPeer] = useState<ChatPeer | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deletingThreadKey, setDeletingThreadKey] = useState<string | null>(null);
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
  const selectedTitle =
    selected?.sender_name ??
    draftPeer?.display_name ??
    (selectedKey ? "Rozmowa" : null);

  const openThread = useCallback(
    async (key: string) => {
      setComposingNew(false);
      setDraftPeer(null);
      setSelectedKey(key);
      setLoadingThread(true);
      setReply("");
      clearAttachment();
      try {
        const params = new URLSearchParams({ conversation_key: key });
        const res = await fetch(`/api/admin/messages/thread?${params.toString()}`);
        const data = (await res.json().catch(() => ({}))) as {
          messages?: ChatMessage[];
          peer?: { display_name: string; user_id: number | null; player_alias: string | null } | null;
          error?: string;
        };
        if (!res.ok) {
          toast.error(typeof data.error === "string" ? data.error : "Nie udało się otworzyć rozmowy");
          return;
        }
        setMessages(data.messages ?? []);
        if (data.peer?.user_id) {
          const fromList = threads.find((t) => t.conversation_key === key);
          const nameBits = splitDisplayName(data.peer.display_name);
          setDraftPeer({
            id: data.peer.user_id,
            display_name: data.peer.display_name,
            player_alias: data.peer.player_alias ?? "",
            first_name: fromList?.first_name || nameBits.first,
            last_name: fromList?.last_name || nameBits.last,
            profile_photo_path: fromList?.profile_photo_path ?? null,
          });
        }
        setThreads((prev) =>
          prev.map((t) => (t.conversation_key === key ? { ...t, unread_count: 0 } : t))
        );
        onUnreadChange?.();
      } finally {
        setLoadingThread(false);
      }
    },
    [onUnreadChange, clearAttachment, threads]
  );

  function startNewWithPeer(peer: ChatPeer) {
    const key = conversationKeyForUser(peer.id);
    setComposingNew(false);
    setDraftPeer(peer);
    setSelectedKey(key);
    setMessages([]);
    setReply("");
    clearAttachment();
    const existing = threads.find((t) => t.conversation_key === key);
    if (existing) {
      void openThread(key);
    }
  }

  function goToThreadList() {
    setSelectedKey(null);
    setDraftPeer(null);
    setMessages([]);
    clearAttachment();
    setReply("");
    setComposingNew(false);
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedKey && !draftPeer) return;
    const text = reply.trim();
    if (!text && !attachmentUrl) return;
    setSending(true);
    try {
      const payload: Record<string, unknown> = {
        body: text,
        attachment_url: attachmentUrl,
      };
      if (draftPeer && !threads.some((t) => t.conversation_key === selectedKey)) {
        payload.target_user_id = draftPeer.id;
      } else {
        payload.conversation_key = selectedKey;
      }
      const res = await fetch("/api/admin/messages/thread", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as {
        message?: ChatMessage;
        conversation_key?: string;
        error?: string;
      };
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Nie udało się wysłać odpowiedzi");
        return;
      }
      if (data.conversation_key) setSelectedKey(data.conversation_key);
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

  async function deleteMessage(id: number) {
    if (!window.confirm("Usunąć tę wiadomość?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/messages/${id}`, { method: "DELETE" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Nie udało się usunąć wiadomości");
        return;
      }
      setMessages((prev) => prev.filter((m) => m.id !== id));
      await load();
      onUnreadChange?.();
    } finally {
      setDeletingId(null);
    }
  }

  async function deleteThread(key: string, label: string) {
    if (!window.confirm(`Usunąć całą rozmowę z „${label}”? Tej operacji nie da się cofnąć.`)) return;
    setDeletingThreadKey(key);
    try {
      const params = new URLSearchParams({ conversation_key: key });
      const res = await fetch(`/api/admin/messages/thread?${params.toString()}`, { method: "DELETE" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Nie udało się usunąć rozmowy");
        return;
      }
      if (selectedKey === key) {
        setSelectedKey(null);
        setDraftPeer(null);
        setMessages([]);
        clearAttachment();
        setReply("");
      }
      toast.success("Rozmowa usunięta");
      await load();
      onUnreadChange?.();
    } finally {
      setDeletingThreadKey(null);
    }
  }

  const canSend = Boolean(reply.trim() || attachmentUrl);
  const showChatPane = Boolean(selectedKey || draftPeer);
  const chatTone = isPopup ? ("light" as const) : ("pitch" as const);

  function threadAvatar(t: ThreadItem | null, peer?: ChatPeer | null, ring = "ring-2 ring-[var(--mp-teal)]/35") {
    if (peer) {
      return (
        <PlayerAvatar
          photoPath={peer.profile_photo_path}
          firstName={peer.first_name}
          lastName={peer.last_name}
          size="md"
          ringClassName={isPopup ? ring : "ring-2 ring-[var(--mp-teal)]/45"}
        />
      );
    }
    if (!t) return null;
    if (t.is_guest) {
      return (
        <span
          className={cn(
            "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
            isPopup
              ? "bg-amber-100 text-amber-800 ring-2 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-200 dark:ring-amber-800"
              : "bg-gradient-to-br from-teal-600/90 to-teal-800 ring-2 ring-[var(--mp-teal)]/40"
          )}
          aria-hidden
        >
          <Users className="h-4 w-4" />
        </span>
      );
    }
    const fromUser = Boolean(t.first_name || t.last_name);
    const parts = fromUser
      ? { first: t.first_name || "", last: t.last_name || "" }
      : splitDisplayName(t.sender_name);
    return (
      <PlayerAvatar
        photoPath={t.profile_photo_path}
        firstName={parts.first}
        lastName={parts.last}
        size="md"
        ringClassName={isPopup ? ring : "ring-2 ring-white/40"}
      />
    );
  }

  const headerBtn =
    "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 text-white transition hover:bg-white/30 disabled:opacity-50";

  /* ========== POPUP: dymek V2 ========== */
  if (isPopup) {
    const inChat = showChatPane;
    const inNew = composingNew;
    const showBack = inChat || inNew;
    const title = inNew
      ? "Nowa rozmowa"
      : inChat
        ? selectedTitle || "Rozmowa"
        : "Szatnia łączności";
    const subtitle = inNew
      ? "Wybierz zawodnika"
      : inChat
        ? selected?.is_guest
          ? "Gość — bez konta"
          : selected?.user_alias
            ? `@${selected.user_alias}`
            : draftPeer && !selected
              ? "Nowa rozmowa"
              : selected?.recipient_label
                ? `Do: ${selected.recipient_label}`
                : "Wiadomość do gracza"
        : unreadCount > 0
          ? `${unreadCount > 99 ? "99+" : unreadCount} nieprzeczytanych`
          : "Rozmowy z akademią";

    return (
      <div className="flex h-full min-h-0 flex-1 flex-col text-zinc-900 dark:text-zinc-50">
        <header className="mp-chat-widget__header">
          {showBack ? (
            <button type="button" className={headerBtn} aria-label="Wróć do listy" onClick={goToThreadList}>
              <ArrowLeft className="h-4 w-4" aria-hidden />
            </button>
          ) : (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20">
              <MessageCircle className="h-4 w-4" aria-hidden />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold leading-tight tracking-tight">{title}</p>
            <p className="truncate text-[11px] text-white/80">{subtitle}</p>
          </div>
          {!showBack ? (
            <button
              type="button"
              className={cn(headerBtn, "gap-0")}
              aria-label="Nowa rozmowa"
              onClick={() => {
                setComposingNew(true);
                setSelectedKey(null);
                setDraftPeer(null);
                setMessages([]);
              }}
            >
              <Plus className="h-4 w-4" aria-hidden />
            </button>
          ) : null}
          <button type="button" className={headerBtn} aria-label="Zamknij czat" onClick={() => onClose?.()}>
            <X className="h-4 w-4" aria-hidden />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col bg-[#f4f5f7] dark:bg-zinc-950">
          {inNew ? (
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
              <p className="text-xs font-medium text-zinc-500">Wybierz zawodnika z akademii</p>
              <ChatPeerPicker tone="light" onSelect={startNewWithPeer} />
              <Button type="button" variant="outline" size="sm" onClick={() => setComposingNew(false)}>
                Anuluj
              </Button>
            </div>
          ) : inChat ? (
            <>
              <div className="flex items-center gap-2 border-b border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900">
                <span className="shrink-0">{threadAvatar(selected, draftPeer)}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-zinc-950 dark:text-white">{selectedTitle}</p>
                  {draftPeer && !selected ? (
                    <p className="truncate text-[11px] text-zinc-500">
                      Nowa · {draftPeer.player_alias || "gracz"}
                    </p>
                  ) : null}
                </div>
                {selectedKey ? (
                  <button
                    type="button"
                    onClick={() =>
                      void deleteThread(selectedKey, selectedTitle || selected?.sender_name || "rozmowę")
                    }
                    disabled={deletingThreadKey === selectedKey}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                    aria-label="Usuń całą rozmowę"
                    title="Usuń rozmowę"
                  >
                    {deletingThreadKey === selectedKey ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      <Trash2 className="h-4 w-4" aria-hidden />
                    )}
                  </button>
                ) : (
                  <Badge className="border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                    <UserPlus className="mr-1 h-3 w-3" aria-hidden />
                    Nowa
                  </Badge>
                )}
              </div>

              <ChatTranscript
                tone="light"
                className="min-h-0 flex-1 border-0 bg-transparent"
                empty={
                  loadingThread ? (
                    <Loader2 className="h-5 w-5 animate-spin text-[var(--mp-teal)]" aria-hidden />
                  ) : messages.length === 0 ? (
                    <p className="text-center text-sm text-zinc-500">
                      {draftPeer && !selected
                        ? "Napisz pierwszą wiadomość do gracza."
                        : "Brak wiadomości w wątku."}
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
                          tone="light"
                          cluster={chatClusterForIndex(clustered, i)}
                          onDelete={() => void deleteMessage(m.id)}
                          deleting={deletingId === m.id}
                        />
                      ));
                    })()
                  : null}
                <div ref={bottomRef} />
              </ChatTranscript>

              <form
                className="border-t border-zinc-200 bg-white p-2 dark:border-zinc-800 dark:bg-zinc-900"
                onSubmit={(e) => void sendReply(e)}
              >
                <ChatComposerShell tone="light">
                  <ChatEmojiPicker
                    tone="light"
                    disabled={sending || loadingThread}
                    onPick={(emoji) => {
                      setReply((prev) => insertEmojiAtCursor(prev, emoji, textareaRef.current));
                    }}
                  />
                  <ChatAttachmentControls
                    tone="light"
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
                    id="admin-chat-reply-popup"
                    tone="light"
                    value={reply}
                    onChange={setReply}
                    placeholder="Napisz do zawodnika…"
                    disabled={sending || loadingThread}
                    rows={1}
                    fieldRef={textareaRef}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    variant="default"
                    className="h-10 w-10 shrink-0 rounded-full bg-[var(--mp-teal)] text-white hover:bg-[var(--mp-teal-dark)]"
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
            </>
          ) : (
            <>
              <div className="min-h-0 flex-1 overflow-y-auto p-3">
                {loading ? (
                  <div className="flex items-center justify-center py-16 text-zinc-400">
                    <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
                  </div>
                ) : threads.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 px-4 py-12 text-center">
                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--mp-teal)]/12 text-[var(--mp-teal-dark)]">
                      <MessageCircle className="h-7 w-7" aria-hidden />
                    </span>
                    <p className="text-sm text-zinc-500">
                      Brak wiadomości. Kliknij „+”, aby napisać do gracza.
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {threads.map((t) => {
                      const unread = t.unread_count > 0;
                      const threadBusy = deletingThreadKey === t.conversation_key;
                      return (
                        <li key={t.conversation_key}>
                          <div className="flex items-stretch gap-1">
                            <button
                              type="button"
                              onClick={() => void openThread(t.conversation_key)}
                              className="flex min-w-0 flex-1 items-start gap-3 rounded-2xl border border-zinc-200 bg-white px-3 py-3 text-left shadow-sm transition hover:border-[var(--mp-teal)] dark:border-zinc-700 dark:bg-zinc-900"
                            >
                              <span className="relative mt-0.5 shrink-0">
                                {threadAvatar(t)}
                                {unread ? (
                                  <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-red-500 ring-2 ring-white dark:ring-zinc-900" />
                                ) : null}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="flex items-baseline justify-between gap-2">
                                  <span className="truncate font-semibold text-zinc-950 dark:text-white">
                                    {t.sender_name}
                                  </span>
                                  <time className="shrink-0 text-[10px] text-zinc-400">{t.last_at_display}</time>
                                </span>
                                <span className="mt-0.5 block text-xs text-zinc-500">
                                  {t.is_guest ? "Gość" : t.user_alias ? `@${t.user_alias}` : "Zawodnik"}
                                  {t.recipient_label ? ` · do ${t.recipient_label}` : ""}
                                </span>
                                <span
                                  className={cn(
                                    "mt-1 line-clamp-2 text-sm",
                                    unread ? "font-medium text-zinc-800 dark:text-zinc-100" : "text-zinc-600 dark:text-zinc-300"
                                  )}
                                >
                                  {t.preview || "Brak wiadomości"}
                                </span>
                              </span>
                              {unread ? (
                                <Badge className="bg-red-500 text-white hover:bg-red-500">
                                  {t.unread_count > 99 ? "99+" : t.unread_count}
                                </Badge>
                              ) : null}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                void deleteThread(t.conversation_key, t.sender_name);
                              }}
                              disabled={threadBusy}
                              className="m-1 inline-flex h-9 w-9 shrink-0 items-center justify-center self-center rounded-xl text-zinc-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                              aria-label={`Usuń rozmowę z ${t.sender_name}`}
                              title="Usuń rozmowę"
                            >
                              {threadBusy ? (
                                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                              ) : (
                                <Trash2 className="h-4 w-4" aria-hidden />
                              )}
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              <div className="border-t border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
                <Button
                  type="button"
                  className="w-full rounded-full bg-[var(--mp-teal)] font-bold text-white hover:bg-[var(--mp-teal-dark)]"
                  onClick={() => {
                    setComposingNew(true);
                    setSelectedKey(null);
                    setDraftPeer(null);
                    setMessages([]);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" aria-hidden />
                  Nowa rozmowa
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  /* ========== PAGE: panel admina (stadion) ========== */
  const threadList = (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-white">Rozmowy</p>
        <div className="flex items-center gap-2">
          {unreadCount > 0 ? (
            <Badge className="bg-red-500 text-white hover:bg-red-500">
              {unreadCount > 99 ? "99+" : unreadCount} nowe
            </Badge>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-8 gap-1.5 border-white/25 bg-white/10 text-white hover:bg-white/15"
            onClick={() => {
              setComposingNew(true);
              setSelectedKey(null);
              setDraftPeer(null);
              setMessages([]);
            }}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Nowa
          </Button>
        </div>
      </div>

      {composingNew ? (
        <div className="space-y-3">
          <p className="text-xs font-medium tracking-wide text-emerald-100/75">
            Wybierz zawodnika z akademii
          </p>
          <ChatPeerPicker tone="pitch" onSelect={startNewWithPeer} />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-emerald-100/80 hover:bg-white/10 hover:text-white"
            onClick={() => setComposingNew(false)}
          >
            Anuluj
          </Button>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-16 text-emerald-100/70">
          <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
        </div>
      ) : threads.length === 0 ? (
        <div className={cn("flex flex-col items-center justify-center gap-3 px-4 py-12 text-center", adminEmptyStateClass)}>
          <p className="text-sm">Brak wiadomości. Kliknij „Nowa”, aby napisać do gracza.</p>
        </div>
      ) : (
        <ul className="space-y-2" role="list">
          {threads.map((t) => {
            const activeThread = selectedKey === t.conversation_key;
            const unread = t.unread_count > 0;
            const threadBusy = deletingThreadKey === t.conversation_key;
            return (
              <li key={t.conversation_key}>
                <div
                  className={cn(
                    "flex items-stretch gap-1 rounded-xl border",
                    activeThread
                      ? "border-[var(--mp-teal)]/60 bg-teal-50/80 dark:bg-teal-950/30"
                      : "border-white/20 bg-black/10 hover:bg-white/10",
                    unread && !activeThread && "border-emerald-300/35 bg-emerald-950/25"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => void openThread(t.conversation_key)}
                    className="min-w-0 flex-1 px-3 py-3 text-left transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      {unread ? (
                        <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-red-500" aria-hidden />
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
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void deleteThread(t.conversation_key, t.sender_name);
                    }}
                    disabled={threadBusy}
                    className={cn(
                      "m-2 inline-flex h-9 w-9 shrink-0 items-center justify-center self-center rounded-xl border border-white/15 bg-black/20 text-emerald-100/70 transition hover:border-red-400/40 hover:bg-red-500/20 hover:text-red-200",
                      threadBusy && "opacity-60"
                    )}
                    aria-label={`Usuń rozmowę z ${t.sender_name}`}
                    title="Usuń rozmowę"
                  >
                    {threadBusy ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      <Trash2 className="h-4 w-4" aria-hidden />
                    )}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );

  const chatPane = showChatPane ? (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3 border-b border-white/15 pb-3">
        <span className="shrink-0">{threadAvatar(selected, draftPeer)}</span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-bold text-white sm:text-lg">{selectedTitle}</h3>
          {selected?.recipient_label ? (
            <p className="truncate text-xs font-medium text-[var(--mp-teal-dark)]">
              Do: {selected.recipient_label}
            </p>
          ) : draftPeer && !selected ? (
            <p className="truncate text-xs text-emerald-100/60">
              Nowa rozmowa · {draftPeer.player_alias || "gracz"}
            </p>
          ) : selected?.user_alias ? (
            <p className="truncate text-xs text-emerald-100/55">@{selected.user_alias}</p>
          ) : selected?.is_guest ? (
            <p className="truncate text-xs text-emerald-100/45">Gość — bez konta</p>
          ) : null}
        </div>
        {selected && selected.unread_count > 0 ? (
          <Badge className="bg-red-500 text-white hover:bg-red-500">Nowe</Badge>
        ) : selected ? (
          <Badge className="border-white/25 bg-black/20 text-emerald-100/80">Przeczytane</Badge>
        ) : (
          <Badge className="border-white/25 bg-black/20 text-emerald-100/80">
            <UserPlus className="mr-1 h-3 w-3" aria-hidden />
            Nowa
          </Badge>
        )}
        {selectedKey ? (
          <button
            type="button"
            onClick={() =>
              void deleteThread(selectedKey, selectedTitle || selected?.sender_name || "rozmowę")
            }
            disabled={deletingThreadKey === selectedKey}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-black/20 text-emerald-100/70 transition hover:border-red-400/40 hover:bg-red-500/20 hover:text-red-200 disabled:opacity-60"
            aria-label="Usuń całą rozmowę"
            title="Usuń całą rozmowę"
          >
            {deletingThreadKey === selectedKey ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Trash2 className="h-4 w-4" aria-hidden />
            )}
          </button>
        ) : null}
      </div>

      <div className="max-h-[min(380px,48vh)] min-h-[8rem]">
        <ChatTranscript
          tone={chatTone}
          className="h-full max-h-[inherit] min-h-[inherit]"
          empty={
            loadingThread ? (
              <Loader2 className="h-5 w-5 animate-spin text-emerald-100/70" aria-hidden />
            ) : messages.length === 0 ? (
              <p className="text-center text-sm text-emerald-100/60">
                {draftPeer && !selected
                  ? "Napisz pierwszą wiadomość do gracza."
                  : "Brak wiadomości w wątku."}
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
                    tone={chatTone}
                    cluster={chatClusterForIndex(clustered, i)}
                    onDelete={() => void deleteMessage(m.id)}
                    deleting={deletingId === m.id}
                  />
                ));
              })()
            : null}
          <div ref={bottomRef} />
        </ChatTranscript>
      </div>

      <form className="space-y-2" onSubmit={(e) => void sendReply(e)}>
        <ChatComposerShell tone={chatTone}>
          <ChatEmojiPicker
            tone={chatTone}
            disabled={sending || loadingThread}
            onPick={(emoji) => {
              setReply((prev) => insertEmojiAtCursor(prev, emoji, textareaRef.current));
            }}
          />
          <ChatAttachmentControls
            tone={chatTone}
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
            id="admin-chat-reply"
            tone={chatTone}
            value={reply}
            onChange={setReply}
            placeholder="Napisz do zawodnika…"
            disabled={sending || loadingThread}
            rows={2}
            fieldRef={textareaRef}
          />
          <Button
            type="submit"
            size="icon"
            variant="default"
            className="h-10 w-10 shrink-0 rounded-full font-bold"
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
    <div className="flex h-full min-h-[12rem] flex-col items-center justify-center gap-4 px-6 text-center">
      <MessageCircle className="h-10 w-10 text-emerald-100/35" aria-hidden />
      <div>
        <p className="text-sm font-semibold text-white">Wybierz rozmowę</p>
        <p className="mt-1 max-w-[16rem] text-xs leading-relaxed text-emerald-100/65">
          Odpisz zawodnikowi albo zacznij nową rozmowę z listy.
        </p>
      </div>
    </div>
  );

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
