"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Loader2, MessageCircle, Plus, Send, Trash2, UserPlus, Users } from "lucide-react";
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
import { ChatPeerPicker, type ChatPeer } from "@/components/chat-peer-picker";
import {
  AdminCard,
  AdminToolbar,
  adminEmptyStateClass,
} from "@/components/admin-ui";
import { PlayerAvatar } from "@/components/player-avatar";
import { SiteAssetImage } from "@/components/site-asset-image";
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
  /** Popup jest na murawie — zawsze ton pitch (nie jasny formularz). */
  const chatTone = "pitch" as const;

  function threadAvatar(t: ThreadItem | null, peer?: ChatPeer | null) {
    if (peer) {
      return (
        <PlayerAvatar
          photoPath={peer.profile_photo_path}
          firstName={peer.first_name}
          lastName={peer.last_name}
          size="md"
          ringClassName="ring-2 ring-[var(--mundial-gold)]/45"
        />
      );
    }
    if (!t) return null;
    if (t.is_guest) {
      return (
        <span
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-600/90 to-amber-800 ring-2 ring-[var(--mundial-gold)]/40"
          aria-hidden
        >
          <Users className="h-4 w-4 text-amber-50" />
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
        ringClassName="ring-2 ring-white/40"
      />
    );
  }

  const threadList = (
    <>
      {!isPopup ? (
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
      ) : null}

      {composingNew ? (
        <div className={cn("space-y-3", isPopup && "px-1")}>
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
        <div
          className={cn(
            "flex flex-col items-center justify-center gap-3 px-4 py-12 text-center",
            !isPopup && adminEmptyStateClass
          )}
        >
          {isPopup ? (
            <span className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-black/20 ring-1 ring-white/20">
              <SiteAssetImage asset="logo_crest" decorative width={48} height={48} className="h-10 w-10" />
            </span>
          ) : null}
          <p className={cn("text-sm", isPopup ? "text-emerald-100/75" : undefined)}>
            Brak wiadomości. Kliknij „Nowa”, aby napisać do gracza.
          </p>
        </div>
      ) : (
        <ul className={cn(isPopup ? "divide-y divide-white/10" : "space-y-2")} role="list">
          {threads.map((t) => {
            const activeThread = selectedKey === t.conversation_key;
            const unread = t.unread_count > 0;
            const threadBusy = deletingThreadKey === t.conversation_key;
            return (
              <li key={t.conversation_key}>
                <div
                  className={cn(
                    "flex items-stretch gap-1",
                    isPopup
                      ? cn(
                          activeThread ? "bg-white/15" : "hover:bg-white/8",
                          unread && !activeThread && "bg-emerald-950/35"
                        )
                      : cn(
                          "rounded-xl border",
                          activeThread
                            ? "border-[var(--mundial-gold)]/60 bg-white/15"
                            : "border-white/20 bg-black/10 hover:bg-white/10",
                          unread && !activeThread && "border-emerald-300/35 bg-emerald-950/25"
                        )
                  )}
                >
                  <button
                    type="button"
                    onClick={() => void openThread(t.conversation_key)}
                    className={cn(
                      "min-w-0 flex-1 text-left transition-colors",
                      isPopup ? "flex items-center gap-3 px-3 py-3 sm:px-4" : "px-3 py-3"
                    )}
                  >
                    {isPopup ? (
                      <>
                        <span className="relative shrink-0">
                          {threadAvatar(t)}
                          {unread ? (
                            <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-red-500 ring-2 ring-[#0a4a38]" />
                          ) : null}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline justify-between gap-2">
                            <span
                              className={cn(
                                "truncate text-sm font-semibold",
                                unread ? "text-white" : "text-emerald-50"
                              )}
                            >
                              {t.sender_name}
                            </span>
                            <time className="shrink-0 text-[10px] tabular-nums text-emerald-100/50">
                              {t.last_at_display}
                            </time>
                          </span>
                          <span className="mt-0.5 block truncate text-[11px] text-emerald-100/55">
                            {t.is_guest
                              ? "Gość z boiska"
                              : t.user_alias
                                ? `@${t.user_alias}`
                                : "Zawodnik"}
                            {t.recipient_label ? ` · do ${t.recipient_label}` : ""}
                          </span>
                          <span
                            className={cn(
                              "mt-1 line-clamp-1 text-sm",
                              unread ? "font-medium text-emerald-50" : "text-emerald-100/70"
                            )}
                          >
                            {t.preview || "Brak wiadomości"}
                          </span>
                        </span>
                        {unread ? (
                          <span className="inline-flex min-h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                            {t.unread_count > 99 ? "99+" : t.unread_count}
                          </span>
                        ) : null}
                      </>
                    ) : (
                      <div className="flex items-start gap-2">
                        {unread ? (
                          <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-red-500" aria-hidden />
                        ) : (
                          <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-white/20" aria-hidden />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                            <p
                              className={cn(
                                "truncate font-semibold",
                                unread ? "text-white" : "text-emerald-50/90"
                              )}
                            >
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
                    )}
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
      <div
        className={cn(
          "flex flex-wrap items-center gap-3 border-b border-white/15 pb-3",
          isPopup && "px-1"
        )}
      >
        {isPopup ? (
          <button
            type="button"
            onClick={() => {
              setSelectedKey(null);
              setDraftPeer(null);
              setMessages([]);
              clearAttachment();
              setReply("");
            }}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-black/20 text-white hover:bg-white/10 lg:hidden"
            aria-label="Wróć do listy"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
          </button>
        ) : null}
        <span className="shrink-0">{threadAvatar(selected, draftPeer)}</span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-bold text-white sm:text-lg">{selectedTitle}</h3>
          {selected?.recipient_label ? (
            <p className="truncate text-xs font-medium text-[var(--mundial-gold)]">
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

      <div
        className={cn(
          isPopup ? "min-h-0 flex-1" : "max-h-[min(380px,48vh)] min-h-[16rem]"
        )}
      >
        <ChatTranscript
          tone={chatTone}
          className={cn(
            "h-full",
            isPopup ? "max-h-[min(42vh,22rem)] min-h-[12rem] lg:max-h-none lg:min-h-[18rem]" : "max-h-[inherit] min-h-[inherit]"
          )}
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
            id={isPopup ? "admin-chat-reply-popup" : "admin-chat-reply"}
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
        "flex h-full min-h-[12rem] flex-col items-center justify-center gap-4 px-6 text-center",
        isPopup && "hidden lg:flex"
      )}
    >
      {isPopup ? (
        <span className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-black/25 ring-1 ring-[var(--mundial-gold)]/35">
          <SiteAssetImage asset="logo_crest" decorative width={64} height={64} className="h-12 w-12 drop-shadow" />
          <SiteAssetImage
            asset="bg_soccer_ball"
            decorative
            width={28}
            height={28}
            className="absolute -bottom-1 -right-1 h-7 w-7 opacity-90"
          />
        </span>
      ) : (
        <MessageCircle className="h-10 w-10 text-emerald-100/35" aria-hidden />
      )}
      <div>
        <p className="text-sm font-semibold text-white">Wybierz rozmowę</p>
        <p className="mt-1 max-w-[16rem] text-xs leading-relaxed text-emerald-100/65">
          Odpisz zawodnikowi albo zacznij nową rozmowę z listy.
        </p>
      </div>
    </div>
  );

  if (isPopup) {
    return (
      <div className="flex min-h-[min(78dvh,36rem)] flex-col text-white">
        <header className="relative z-[1] shrink-0 border-b border-white/15 px-4 pb-3.5 pt-4 pr-14 sm:px-5 sm:pt-5">
          <div className="flex items-center gap-3">
            <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-black/25 shadow-inner ring-1 ring-[var(--mundial-gold)]/45">
              <SiteAssetImage asset="logo_crest" decorative width={40} height={40} className="h-8 w-8" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-[var(--mundial-gold)]">
                Szatnia łączności
              </p>
              <h2 className="truncate text-lg font-bold tracking-tight text-white sm:text-xl">
                Wiadomości
              </h2>
              <p className="mt-0.5 truncate text-xs text-emerald-100/70">
                {unreadCount > 0
                  ? `${unreadCount > 99 ? "99+" : unreadCount} nieprzeczytanych na murawie`
                  : "Wszystkie rozmowy na bieżąco"}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="stadium"
              className="h-9 shrink-0 gap-1.5 rounded-xl px-3"
              onClick={() => {
                setComposingNew(true);
                setSelectedKey(null);
                setDraftPeer(null);
                setMessages([]);
              }}
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              <span className="hidden xs:inline">Nowa</span>
            </Button>
          </div>
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[var(--mundial-gold)]/50 to-transparent"
            aria-hidden
          />
        </header>

        <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(15rem,0.95fr)_minmax(0,1.2fr)]">
          <aside
            className={cn(
              "min-h-0 overflow-y-auto overscroll-contain border-white/10 lg:border-r",
              showChatPane ? "hidden lg:block" : "block"
            )}
          >
            {threadList}
          </aside>
          <section
            className={cn(
              "flex min-h-0 flex-col overflow-hidden p-3 sm:p-4",
              showChatPane ? "block" : "hidden lg:flex"
            )}
          >
            {chatPane}
          </section>
        </div>
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
