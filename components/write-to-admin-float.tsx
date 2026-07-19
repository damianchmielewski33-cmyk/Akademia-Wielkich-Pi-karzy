"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { ArrowLeft, Loader2, MessageCircle, Plus, Send } from "lucide-react";
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
import { AppModal } from "@/components/ui/app-modal";
import { FormInput } from "@/components/ui/form-field";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { nativeSelectClasses } from "@/lib/field-styles";
import type { ContactAdminRecipientKey, ContactAdminRecipientOption } from "@/lib/contact-admin-recipients";

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

type PlayerThread = {
  conversation_key: string;
  title: string;
  subtitle: string | null;
  peer_user_id: number | null;
  kind: "organizer" | "dm";
  last_at_display: string | null;
  unread_count: number;
  preview: string;
};

const GUEST_NAME_STORAGE_KEY = "awp-contact-admin-guest-name";

type Props = {
  defaults?: { senderName: string } | null;
  recipients: ContactAdminRecipientOption[];
  /** Ukryj pływający przycisk (admin — ikona tylko na pasku górnym). */
  hideFloat?: boolean;
};

export function WriteToAdminFloat({ defaults, recipients, hideFloat = false }: Props) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [senderName, setSenderName] = useState(defaults?.senderName ?? "");
  const [nameConfirmed, setNameConfirmed] = useState(Boolean(defaults?.senderName));
  const [recipientKey, setRecipientKey] = useState<ContactAdminRecipientKey>(
    recipients[0]?.key ?? "damian"
  );
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unreadReplies, setUnreadReplies] = useState(0);
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [threads, setThreads] = useState<PlayerThread[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [threadTitle, setThreadTitle] = useState("Organizator");
  const [threadKind, setThreadKind] = useState<"organizer" | "dm">("organizer");
  const [view, setView] = useState<"list" | "chat" | "new">("list");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const senderNameRef = useRef(senderName);
  const openRef = useRef(open);
  const isLoggedIn = Boolean(defaults?.senderName);

  useEffect(() => {
    setMounted(true);
    if (defaults?.senderName) return;
    try {
      const stored = localStorage.getItem(GUEST_NAME_STORAGE_KEY)?.trim() ?? "";
      if (stored.length >= 2) {
        setSenderName(stored);
        setNameConfirmed(true);
      }
    } catch {
      /* ignore */
    }
  }, [defaults?.senderName]);

  useEffect(() => {
    if (defaults?.senderName) {
      setSenderName(defaults.senderName);
      setNameConfirmed(true);
    }
  }, [defaults]);

  useEffect(() => {
    senderNameRef.current = senderName;
  }, [senderName]);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    if (recipients.length > 0 && !recipients.some((r) => r.key === recipientKey)) {
      setRecipientKey(recipients[0].key);
    }
  }, [recipients, recipientKey]);

  const hidden = hideFloat || pathname.startsWith("/panel-admina");

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const clearAttachment = useCallback(() => {
    if (attachmentPreview?.startsWith("blob:")) URL.revokeObjectURL(attachmentPreview);
    setAttachmentUrl(null);
    setAttachmentPreview(null);
  }, [attachmentPreview]);

  const refreshUnreadBadge = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      const res = await fetch("/api/chat/threads");
      if (!res.ok) return;
      const data = (await res.json()) as { unread_count?: number; threads?: PlayerThread[] };
      if (typeof data.unread_count === "number") setUnreadReplies(data.unread_count);
      if (data.threads) setThreads(data.threads);
    } catch {
      /* ignore */
    }
  }, [isLoggedIn]);

  const loadGuestThread = useCallback(
    async (opts?: { markRead?: boolean; name?: string; quiet?: boolean }) => {
      const name = (opts?.name ?? senderNameRef.current).trim();
      if (name.length < 2) {
        setMessages([]);
        return false;
      }
      setLoadingThread(true);
      try {
        const params = new URLSearchParams();
        params.set("sender_name", name);
        if (opts?.markRead) params.set("mark_read", "1");
        const res = await fetch(`/api/contact-admin/thread?${params.toString()}`);
        const data = (await res.json().catch(() => ({}))) as {
          messages?: ChatMessage[];
          unread_replies?: number;
          error?: string;
          sender_name?: string;
        };
        if (!res.ok) {
          if (!opts?.quiet && (opts?.markRead || openRef.current)) {
            toast.error(typeof data.error === "string" ? data.error : "Nie udało się wczytać rozmowy.");
          }
          if (opts?.quiet) {
            setNameConfirmed(false);
            try {
              localStorage.removeItem(GUEST_NAME_STORAGE_KEY);
            } catch {
              /* ignore */
            }
          }
          setMessages([]);
          return false;
        }
        setMessages(data.messages ?? []);
        setUnreadReplies(data.unread_replies ?? 0);
        if (data.sender_name) {
          setSenderName(data.sender_name);
          senderNameRef.current = data.sender_name;
        }
        setNameConfirmed(true);
        try {
          localStorage.setItem(GUEST_NAME_STORAGE_KEY, data.sender_name ?? name);
        } catch {
          /* ignore */
        }
        return true;
      } finally {
        setLoadingThread(false);
      }
    },
    []
  );

  const loadPlayerThreads = useCallback(async () => {
    const res = await fetch("/api/chat/threads");
    const data = (await res.json().catch(() => ({}))) as {
      threads?: PlayerThread[];
      unread_count?: number;
      error?: string;
    };
    if (!res.ok) {
      toast.error(typeof data.error === "string" ? data.error : "Nie udało się wczytać rozmów.");
      return;
    }
    setThreads(data.threads ?? []);
    setUnreadReplies(data.unread_count ?? 0);
  }, []);

  const openPlayerThread = useCallback(
    async (key: string, opts?: { quiet?: boolean }) => {
      setSelectedKey(key);
      setView("chat");
      setLoadingThread(true);
      setBody("");
      clearAttachment();
      try {
        const params = new URLSearchParams({ conversation_key: key, mark_read: "1" });
        const res = await fetch(`/api/chat/thread?${params.toString()}`);
        const data = (await res.json().catch(() => ({}))) as {
          messages?: ChatMessage[];
          title?: string;
          kind?: "organizer" | "dm";
          error?: string;
        };
        if (!res.ok) {
          if (!opts?.quiet) {
            toast.error(typeof data.error === "string" ? data.error : "Nie udało się otworzyć rozmowy.");
          }
          return;
        }
        setMessages(data.messages ?? []);
        setThreadTitle(data.title ?? "Rozmowa");
        setThreadKind(data.kind ?? "organizer");
        await refreshUnreadBadge();
      } finally {
        setLoadingThread(false);
      }
    },
    [clearAttachment, refreshUnreadBadge]
  );

  useEffect(() => {
    if (hidden) return;
    if (isLoggedIn) {
      void refreshUnreadBadge();
      const id = window.setInterval(() => void refreshUnreadBadge(), 45_000);
      return () => window.clearInterval(id);
    }
    if (!nameConfirmed) return;
    void loadGuestThread({ quiet: true });
    const id = window.setInterval(() => void loadGuestThread({ quiet: true }), 45_000);
    return () => window.clearInterval(id);
  }, [hidden, isLoggedIn, nameConfirmed, loadGuestThread, refreshUnreadBadge]);

  useEffect(() => {
    if (!open) return;
    if (isLoggedIn) {
      void loadPlayerThreads().then(() => {
        if (view === "chat" && selectedKey) void openPlayerThread(selectedKey, { quiet: true });
      });
      const id = window.setInterval(() => {
        void refreshUnreadBadge();
        if (view === "chat" && selectedKey) void openPlayerThread(selectedKey, { quiet: true });
      }, 12_000);
      return () => window.clearInterval(id);
    }
    if (!nameConfirmed) return;
    void loadGuestThread({ markRead: true });
    const id = window.setInterval(() => void loadGuestThread({ markRead: true, quiet: true }), 12_000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- poll selected thread while open
  }, [open, isLoggedIn, nameConfirmed, view, selectedKey]);

  useEffect(() => {
    if (open) scrollToBottom();
  }, [messages, open, scrollToBottom]);

  useEffect(() => {
    if (!open) {
      setView(isLoggedIn ? "list" : "chat");
      setSelectedKey(null);
    } else if (isLoggedIn) {
      setView("list");
      void loadPlayerThreads();
    }
  }, [open, isLoggedIn, loadPlayerThreads]);

  async function confirmGuestName(e: React.FormEvent) {
    e.preventDefault();
    const name = senderName.trim();
    if (name.length < 2) {
      toast.error("Podaj imię i nazwisko z listy Piłkarze albo ze strony Kontakt.");
      return;
    }
    const ok = await loadGuestThread({ name, markRead: true });
    if (!ok) setNameConfirmed(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text && !attachmentUrl) {
      toast.error("Napisz wiadomość lub dołącz grafikę.");
      return;
    }

    setSending(true);
    try {
      if (isLoggedIn) {
        if (!selectedKey && threadKind !== "dm") {
          // organizator bez wybranego wątku — użyj domyślnego user:me po stronie API
        }
        const res = await fetch("/api/chat/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversation_key: selectedKey ?? undefined,
            recipient_key: threadKind === "organizer" ? recipientKey : undefined,
            body: text,
            attachment_url: attachmentUrl,
          }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          conversation_key?: string;
          message?: ChatMessage;
        };
        if (!res.ok) {
          toast.error(typeof data.error === "string" ? data.error : "Nie udało się wysłać wiadomości.");
          return;
        }
        setBody("");
        clearAttachment();
        if (data.conversation_key) {
          setSelectedKey(data.conversation_key);
          await openPlayerThread(data.conversation_key, { quiet: true });
        } else if (data.message) {
          setMessages((prev) => [...prev, data.message!]);
        }
        await loadPlayerThreads();
        return;
      }

      const name = senderName.trim();
      if (!nameConfirmed || name.length < 2) {
        toast.error("Najpierw potwierdź imię i nazwisko z listy Piłkarze.");
        return;
      }
      if (!recipients.some((r) => r.key === recipientKey)) {
        toast.error("Wybierz odbiorcę wiadomości.");
        return;
      }
      const res = await fetch("/api/contact-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender_name: name,
          recipient_key: recipientKey,
          body: text,
          attachment_url: attachmentUrl,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Nie udało się wysłać wiadomości.");
        return;
      }
      setBody("");
      clearAttachment();
      await loadGuestThread({ markRead: true });
    } catch {
      toast.error("Nie udało się wysłać wiadomości.");
    } finally {
      setSending(false);
    }
  }

  function startDmWithPeer(peer: ChatPeer) {
    setView("chat");
    setThreadKind("dm");
    setThreadTitle(peer.display_name);
    setSelectedKey(null);
    setMessages([]);
    setBody("");
    clearAttachment();
    // Wyślemy z peer_user_id przy pierwszym submit — ustawiamy tymczasowy marker
    setSelectedKey(`pending-dm:${peer.id}`);
  }

  async function handleLoggedInSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text && !attachmentUrl) {
      toast.error("Napisz wiadomość lub dołącz grafikę.");
      return;
    }
    setSending(true);
    try {
      const pending = selectedKey?.startsWith("pending-dm:")
        ? Number(selectedKey.replace("pending-dm:", ""))
        : null;
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_key: pending ? undefined : selectedKey ?? undefined,
          peer_user_id: pending && Number.isFinite(pending) ? pending : undefined,
          recipient_key: !pending && threadKind === "organizer" ? recipientKey : undefined,
          body: text,
          attachment_url: attachmentUrl,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        conversation_key?: string;
      };
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Nie udało się wysłać wiadomości.");
        return;
      }
      setBody("");
      clearAttachment();
      if (data.conversation_key) {
        await openPlayerThread(data.conversation_key, { quiet: true });
      }
      await loadPlayerThreads();
    } catch {
      toast.error("Nie udało się wysłać wiadomości.");
    } finally {
      setSending(false);
    }
  }

  async function deleteChatMessage(id: number) {
    if (!isLoggedIn) return;
    if (!window.confirm("Usunąć tę wiadomość?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/chat/messages/${id}`, { method: "DELETE" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Nie udało się usunąć wiadomości.");
        return;
      }
      setMessages((prev) => prev.filter((m) => m.id !== id));
      await loadPlayerThreads();
    } finally {
      setDeletingId(null);
    }
  }

  if (!mounted || hidden || recipients.length === 0) return null;

  const showGuestChat = !isLoggedIn && nameConfirmed;
  const canSend = Boolean(body.trim() || attachmentUrl);

  const modalTitle =
    isLoggedIn && view === "chat"
      ? threadTitle
      : isLoggedIn && view === "new"
        ? "Nowa rozmowa"
        : isLoggedIn
          ? "Wiadomości"
          : "Czat z organizatorem";

  const floatButton = (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "group fixed z-[60] flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-[var(--mundial-gold)]/65 bg-gradient-to-br from-emerald-800 via-emerald-900 to-emerald-950 text-white shadow-lg ring-1 ring-emerald-300/25 transition-[transform,box-shadow] motion-safe:hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
          "bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-3 sm:bottom-5 sm:left-5 sm:h-12 sm:w-12"
        )}
        aria-label="Czat — otwórz rozmowy"
        title="Wiadomości"
      >
        <MessageCircle className="h-5 w-5 text-[var(--mundial-gold)] sm:h-[1.35rem] sm:w-[1.35rem]" strokeWidth={2.25} aria-hidden />
        {unreadReplies > 0 ? (
          <span
            className="absolute -right-0.5 -top-0.5 inline-flex min-h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold tabular-nums text-white ring-2 ring-emerald-950"
            aria-hidden
          >
            {unreadReplies > 99 ? "99+" : unreadReplies}
          </span>
        ) : null}
      </button>

      <AppModal
        open={open}
        onOpenChange={(next) => {
          if (!sending) setOpen(next);
        }}
        title={modalTitle}
        description={
          isLoggedIn
            ? view === "list"
              ? "Napisz do organizatora albo do innego gracza."
              : view === "new"
                ? "Wybierz zawodnika z akademii."
                : threadKind === "dm"
                  ? "Prywatna rozmowa między graczami."
                  : "Wiadomość do organizatora Akademii."
            : "Podaj imię i nazwisko z listy Piłkarze (lub organizatora z Kontakt), aby pisać i czytać odpowiedzi."
        }
        icon={<MessageCircle className="h-6 w-6 text-[var(--mundial-gold)]" aria-hidden />}
        headerKicker="Czat"
        size={isLoggedIn ? "lg" : "md"}
        scrollable
        footer={
          isLoggedIn && view === "list" ? (
            <>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Zamknij
              </Button>
              <Button type="button" variant="stadium" onClick={() => setView("new")}>
                <Plus className="mr-2 h-4 w-4" aria-hidden />
                Napisz do gracza
              </Button>
            </>
          ) : isLoggedIn && view === "new" ? (
            <Button type="button" variant="outline" onClick={() => setView("list")}>
              Wróć
            </Button>
          ) : isLoggedIn && view === "chat" ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setView("list");
                  setSelectedKey(null);
                  setMessages([]);
                }}
              >
                Lista rozmów
              </Button>
              <Button
                type="submit"
                form="player-chat-form"
                variant="stadium"
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
                    Wyślij
                  </>
                )}
              </Button>
            </>
          ) : showGuestChat ? (
            <>
              <Button type="button" variant="outline" disabled={sending} onClick={() => setOpen(false)}>
                Zamknij
              </Button>
              <Button
                type="submit"
                form="write-to-admin-form"
                variant="stadium"
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
                    Wyślij
                  </>
                )}
              </Button>
            </>
          ) : (
            <Button type="submit" form="guest-name-form" variant="stadium" disabled={loadingThread}>
              {loadingThread ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  Sprawdzanie…
                </>
              ) : (
                "Dalej"
              )}
            </Button>
          )
        }
      >
        {isLoggedIn && view === "list" ? (
          <div className="space-y-2">
            {threads.length === 0 ? (
              <p className="py-8 text-center text-sm text-emerald-100/70">Ładowanie rozmów…</p>
            ) : (
              <ul className="space-y-2">
                {threads.map((t) => (
                  <li key={t.conversation_key}>
                    <button
                      type="button"
                      onClick={() => void openPlayerThread(t.conversation_key)}
                      className="flex w-full items-start gap-3 rounded-xl border border-white/15 bg-black/15 px-3 py-3 text-left transition hover:bg-white/10"
                    >
                      <span
                        className={cn(
                          "mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full",
                          t.unread_count > 0 ? "bg-red-500" : "bg-white/20"
                        )}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="truncate font-semibold text-white">{t.title}</span>
                          {t.last_at_display ? (
                            <time className="shrink-0 text-[10px] text-emerald-100/55">{t.last_at_display}</time>
                          ) : null}
                        </span>
                        <span className="mt-0.5 block text-xs text-emerald-100/55">
                          {t.kind === "dm" ? "Gracz" : "Organizator"}
                          {t.subtitle ? ` · ${t.subtitle}` : ""}
                        </span>
                        {t.preview ? (
                          <span className="mt-1 line-clamp-2 text-sm text-emerald-100/80">{t.preview}</span>
                        ) : (
                          <span className="mt-1 text-sm text-emerald-100/45">Brak wiadomości — napisz pierwszą</span>
                        )}
                      </span>
                      {t.unread_count > 0 ? (
                        <Badge className="bg-red-500 text-white hover:bg-red-500">
                          {t.unread_count > 99 ? "99+" : t.unread_count}
                        </Badge>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        {isLoggedIn && view === "new" ? (
          <ChatPeerPicker
            tone="pitch"
            onSelect={(peer) => {
              startDmWithPeer(peer);
            }}
          />
        ) : null}

        {isLoggedIn && view === "chat" ? (
          <div className="space-y-3">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-100/80 hover:text-white lg:hidden"
              onClick={() => {
                setView("list");
                setSelectedKey(null);
              }}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Wróć
            </button>

            {threadKind === "organizer" ? (
              <div className="grid gap-1.5">
                <Label htmlFor="player-chat-recipient">
                  Do kogo piszesz? <span className="text-red-400">*</span>
                </Label>
                <select
                  id="player-chat-recipient"
                  className={cn(nativeSelectClasses, "w-full")}
                  value={recipientKey}
                  disabled={sending}
                  required
                  onChange={(e) => setRecipientKey(e.target.value as ContactAdminRecipientKey)}
                >
                  {recipients.map((r) => (
                    <option key={r.key} value={r.key}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <ChatTranscript
              tone="pitch"
              className="max-h-[min(300px,40vh)] min-h-[11rem]"
              empty={
                loadingThread && messages.length === 0 ? (
                  <Loader2 className="h-5 w-5 animate-spin text-emerald-100/70" aria-hidden />
                ) : messages.length === 0 ? (
                  <p className="text-center text-sm text-emerald-100/65">Napisz pierwszą wiadomość.</p>
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
                        tone="pitch"
                        cluster={chatClusterForIndex(clustered, i)}
                        onDelete={() => void deleteChatMessage(m.id)}
                        deleting={deletingId === m.id}
                      />
                    ));
                  })()
                : null}
              <div ref={bottomRef} />
            </ChatTranscript>

            <form id="player-chat-form" onSubmit={(e) => void handleLoggedInSubmit(e)}>
              <ChatComposerShell tone="pitch">
                <ChatEmojiPicker
                  tone="pitch"
                  disabled={sending}
                  onPick={(emoji) => {
                    setBody((prev) => insertEmojiAtCursor(prev, emoji, textareaRef.current));
                  }}
                />
                <ChatAttachmentControls
                  tone="pitch"
                  disabled={sending}
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
                  id="player-chat-body"
                  tone="pitch"
                  value={body}
                  onChange={setBody}
                  placeholder="Aa"
                  disabled={sending}
                  rows={2}
                  fieldRef={textareaRef}
                />
                <Button
                  type="submit"
                  size="icon"
                  variant="stadium"
                  className="h-10 w-10 shrink-0 rounded-full"
                  disabled={sending || uploadingAttachment || !canSend}
                  aria-label="Wyślij"
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
        ) : null}

        {!isLoggedIn && !showGuestChat ? (
          <form id="guest-name-form" className="space-y-4" onSubmit={(e) => void confirmGuestName(e)}>
            <FormInput
              id="contact-admin-name"
              label="Imię i nazwisko"
              required
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder="np. Jan Kowalski"
              autoComplete="name"
              disabled={loadingThread}
              hint="Tak jak na liście Piłkarze albo Kontakt. Wielkość liter i polskie znaki nie mają znaczenia."
            />
          </form>
        ) : null}

        {!isLoggedIn && showGuestChat ? (
          <div className="space-y-4">
            <p className="text-sm text-emerald-100/75">
              Rozmawiasz jako <span className="font-semibold text-white">{senderName}</span>
              {" · "}
              <button
                type="button"
                className="underline underline-offset-2 hover:text-white"
                onClick={() => {
                  setNameConfirmed(false);
                  setMessages([]);
                  setUnreadReplies(0);
                  clearAttachment();
                  try {
                    localStorage.removeItem(GUEST_NAME_STORAGE_KEY);
                  } catch {
                    /* ignore */
                  }
                }}
              >
                Zmień
              </button>
            </p>

            <div className="grid gap-1.5">
              <Label htmlFor="contact-admin-recipient">
                Do kogo piszesz? <span className="text-red-400">*</span>
              </Label>
              <select
                id="contact-admin-recipient"
                className={cn(nativeSelectClasses, "w-full")}
                value={recipientKey}
                disabled={sending}
                required
                onChange={(e) => setRecipientKey(e.target.value as ContactAdminRecipientKey)}
              >
                {recipients.map((r) => (
                  <option key={r.key} value={r.key}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <ChatTranscript
              tone="pitch"
              className="max-h-[min(320px,42vh)] min-h-[12rem]"
              empty={
                loadingThread && messages.length === 0 ? (
                  <Loader2 className="h-5 w-5 animate-spin text-emerald-100/70" aria-hidden />
                ) : messages.length === 0 ? (
                  <p className="text-center text-sm text-emerald-100/65">
                    Brak wiadomości — napisz pierwszą.
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
                        tone="pitch"
                        cluster={chatClusterForIndex(clustered, i)}
                      />
                    ));
                  })()
                : null}
              <div ref={bottomRef} />
            </ChatTranscript>

            <form id="write-to-admin-form" className="space-y-2" onSubmit={(e) => void handleSubmit(e)}>
              <ChatComposerShell tone="pitch">
                <ChatEmojiPicker
                  tone="pitch"
                  disabled={sending}
                  onPick={(emoji) => {
                    setBody((prev) => insertEmojiAtCursor(prev, emoji, textareaRef.current));
                  }}
                />
                <ChatAttachmentControls
                  tone="pitch"
                  disabled={sending}
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
                  id="contact-admin-body"
                  tone="pitch"
                  value={body}
                  onChange={setBody}
                  placeholder="Aa"
                  disabled={sending}
                  rows={2}
                  fieldRef={textareaRef}
                />
                <Button
                  type="submit"
                  size="icon"
                  variant="stadium"
                  className="h-10 w-10 shrink-0 rounded-full"
                  disabled={sending || uploadingAttachment || !canSend}
                  aria-label="Wyślij"
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
        ) : null}
      </AppModal>
    </>
  );

  return createPortal(floatButton, document.body);
}
