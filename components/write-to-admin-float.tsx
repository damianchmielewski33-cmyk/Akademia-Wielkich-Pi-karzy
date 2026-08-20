"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { ArrowLeft, Loader2, MessageCircle, Plus, Send, X } from "lucide-react";
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
  /** Ukryj pĹ‚ywajÄ…cy przycisk (admin â€” ikona tylko na pasku gĂłrnym). */
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
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !sending) setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, sending]);

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
          guest_locked?: boolean;
        };
        if (!res.ok) {
          if (!opts?.quiet && (opts?.markRead || openRef.current)) {
            toast.error(typeof data.error === "string" ? data.error : "Nie udaĹ‚o siÄ™ wczytaÄ‡ rozmowy.");
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
      toast.error(typeof data.error === "string" ? data.error : "Nie udaĹ‚o siÄ™ wczytaÄ‡ rozmĂłw.");
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
            toast.error(typeof data.error === "string" ? data.error : "Nie udaĹ‚o siÄ™ otworzyÄ‡ rozmowy.");
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
      toast.error("Podaj imiÄ™ i nazwisko z listy PiĹ‚karze albo ze strony Kontakt.");
      return;
    }
    const ok = await loadGuestThread({ name, markRead: true });
    if (!ok) setNameConfirmed(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text && !attachmentUrl) {
      toast.error("Napisz wiadomoĹ›Ä‡ lub doĹ‚Ä…cz grafikÄ™.");
      return;
    }

    setSending(true);
    try {
      if (isLoggedIn) {
        if (!selectedKey && threadKind !== "dm") {
          // organizator bez wybranego wÄ…tku â€” uĹĽyj domyĹ›lnego user:me po stronie API
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
          toast.error(typeof data.error === "string" ? data.error : "Nie udaĹ‚o siÄ™ wysĹ‚aÄ‡ wiadomoĹ›ci.");
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
        toast.error("Najpierw potwierdĹş imiÄ™ i nazwisko z listy PiĹ‚karze.");
        return;
      }
      if (!recipients.some((r) => r.key === recipientKey)) {
        toast.error("Wybierz odbiorcÄ™ wiadomoĹ›ci.");
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
        toast.error(typeof data.error === "string" ? data.error : "Nie udaĹ‚o siÄ™ wysĹ‚aÄ‡ wiadomoĹ›ci.");
        return;
      }
      setBody("");
      clearAttachment();
      await loadGuestThread({ markRead: true });
    } catch {
      toast.error("Nie udaĹ‚o siÄ™ wysĹ‚aÄ‡ wiadomoĹ›ci.");
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
    // WyĹ›lemy z peer_user_id przy pierwszym submit â€” ustawiamy tymczasowy marker
    setSelectedKey(`pending-dm:${peer.id}`);
  }

  async function handleLoggedInSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text && !attachmentUrl) {
      toast.error("Napisz wiadomoĹ›Ä‡ lub doĹ‚Ä…cz grafikÄ™.");
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
        toast.error(typeof data.error === "string" ? data.error : "Nie udaĹ‚o siÄ™ wysĹ‚aÄ‡ wiadomoĹ›ci.");
        return;
      }
      setBody("");
      clearAttachment();
      if (data.conversation_key) {
        await openPlayerThread(data.conversation_key, { quiet: true });
      }
      await loadPlayerThreads();
    } catch {
      toast.error("Nie udaĹ‚o siÄ™ wysĹ‚aÄ‡ wiadomoĹ›ci.");
    } finally {
      setSending(false);
    }
  }

  async function deleteChatMessage(id: number) {
    if (!isLoggedIn) return;
    if (!window.confirm("UsunÄ…Ä‡ tÄ™ wiadomoĹ›Ä‡?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/chat/messages/${id}`, { method: "DELETE" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Nie udaĹ‚o siÄ™ usunÄ…Ä‡ wiadomoĹ›ci.");
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
          ? "WiadomoĹ›ci"
          : "Czat z organizatorem";
  const modalSubtitle =
    isLoggedIn && view === "list"
      ? "Organizator albo inny gracz"
      : isLoggedIn && view === "new"
        ? "Wybierz zawodnika z listy"
        : isLoggedIn && threadKind === "dm"
          ? "Prywatna rozmowa"
          : "OdpowiedĹş zwykle w ciÄ…gu dnia";
  const showBack = isLoggedIn && (view === "chat" || view === "new");
  const headerBtn =
    "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/95 transition hover:bg-white/15 disabled:opacity-50";

  function goToThreadList() {
    setView("list");
    setSelectedKey(null);
    setMessages([]);
  }

  const sendButton = (
    <Button
      type="submit"
      size="icon"
      variant="default"
      className="h-10 w-10 shrink-0 rounded-full bg-[var(--mp-teal)] text-white hover:bg-[var(--mp-teal-dark)]"
      disabled={sending || uploadingAttachment || !canSend}
      aria-label="WyĹ›lij"
    >
      {sending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
    </Button>
  );

  const widget = (
    <>
      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={modalTitle}
          className="mp-chat-widget bottom-[max(4.75rem,calc(env(safe-area-inset-bottom)+4.5rem))] left-3 sm:bottom-[5.75rem] sm:left-5"
        >
          <header className="mp-chat-widget__header">
            {showBack ? (
              <button type="button" className={headerBtn} aria-label="WrĂłÄ‡ do listy" onClick={goToThreadList}>
                <ArrowLeft className="h-4 w-4" aria-hidden />
              </button>
            ) : (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20">
                <MessageCircle className="h-4 w-4" aria-hidden />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold leading-tight tracking-tight">{modalTitle}</p>
              <p className="truncate text-[11px] text-white/80">{modalSubtitle}</p>
            </div>
            <button
              type="button"
              className={headerBtn}
              aria-label="Zamknij czat"
              disabled={sending}
              onClick={() => setOpen(false)}
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </header>

          <div className="flex min-h-0 flex-1 flex-col bg-[#f4f5f7] dark:bg-zinc-950">
            {isLoggedIn && view === "list" ? (
              <>
                <div className="min-h-0 flex-1 overflow-y-auto p-3">
                  {threads.length === 0 ? (
                    <p className="py-10 text-center text-sm text-zinc-500">Ĺadowanie rozmĂłwâ€¦</p>
                  ) : (
                    <ul className="space-y-2">
                      {threads.map((t) => (
                        <li key={t.conversation_key}>
                          <button
                            type="button"
                            onClick={() => void openPlayerThread(t.conversation_key)}
                            className="flex w-full items-start gap-3 rounded-2xl border border-zinc-200 bg-white px-3 py-3 text-left shadow-sm transition hover:border-[var(--mp-teal)] dark:border-zinc-700 dark:bg-zinc-900"
                          >
                            <span
                              className={cn(
                                "mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full",
                                t.unread_count > 0 ? "bg-red-500" : "bg-zinc-300 dark:bg-zinc-600"
                              )}
                              aria-hidden
                            />
                            <span className="min-w-0 flex-1">
                              <span className="flex items-baseline justify-between gap-2">
                                <span className="truncate font-semibold text-zinc-950 dark:text-white">{t.title}</span>
                                {t.last_at_display ? (
                                  <time className="shrink-0 text-[10px] text-zinc-400">{t.last_at_display}</time>
                                ) : null}
                              </span>
                              <span className="mt-0.5 block text-xs text-zinc-500">
                                {t.kind === "dm" ? "Gracz" : "Organizator"}
                                {t.subtitle ? ` Â· ${t.subtitle}` : ""}
                              </span>
                              {t.preview ? (
                                <span className="mt-1 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-300">
                                  {t.preview}
                                </span>
                              ) : (
                                <span className="mt-1 text-sm text-zinc-400">Brak wiadomoĹ›ci â€” napisz pierwszÄ…</span>
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
                <div className="border-t border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
                  <Button type="button" className="w-full rounded-full" onClick={() => setView("new")}>
                    <Plus className="mr-2 h-4 w-4" aria-hidden />
                    Napisz do gracza
                  </Button>
                </div>
              </>
            ) : null}

            {isLoggedIn && view === "new" ? (
              <div className="min-h-0 flex-1 overflow-y-auto p-3">
                <ChatPeerPicker tone="light" onSelect={(peer) => startDmWithPeer(peer)} />
              </div>
            ) : null}

            {isLoggedIn && view === "chat" ? (
              <>
                <div className="min-h-0 flex-1 overflow-y-auto px-3 pt-3">
                  {threadKind === "organizer" ? (
                    <div className="mb-3 grid gap-1.5">
                      <Label htmlFor="player-chat-recipient" className="text-zinc-700 dark:text-zinc-200">
                        Do kogo piszesz? <span className="text-red-500">*</span>
                      </Label>
                      <select
                        id="player-chat-recipient"
                        className={cn(nativeSelectClasses, "w-full bg-white")}
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
                    tone="light"
                    className="min-h-[12rem] border-0 bg-transparent"
                    empty={
                      loadingThread && messages.length === 0 ? (
                        <Loader2 className="h-5 w-5 animate-spin text-[var(--mp-teal)]" aria-hidden />
                      ) : messages.length === 0 ? (
                        <p className="text-center text-sm text-zinc-500">Napisz pierwszÄ… wiadomoĹ›Ä‡.</p>
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
                              onDelete={() => void deleteChatMessage(m.id)}
                              deleting={deletingId === m.id}
                            />
                          ));
                        })()
                      : null}
                    <div ref={bottomRef} />
                  </ChatTranscript>
                </div>
                <form
                  id="player-chat-form"
                  className="border-t border-zinc-200 bg-white p-2 dark:border-zinc-800 dark:bg-zinc-900"
                  onSubmit={(e) => void handleLoggedInSubmit(e)}
                >
                  <ChatComposerShell tone="light">
                    <ChatEmojiPicker
                      tone="light"
                      disabled={sending}
                      onPick={(emoji) => {
                        setBody((prev) => insertEmojiAtCursor(prev, emoji, textareaRef.current));
                      }}
                    />
                    <ChatAttachmentControls
                      tone="light"
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
                      tone="light"
                      value={body}
                      onChange={setBody}
                      placeholder="Napisz wiadomoĹ›Ä‡â€¦"
                      disabled={sending}
                      rows={1}
                      fieldRef={textareaRef}
                    />
                    {sendButton}
                  </ChatComposerShell>
                </form>
              </>
            ) : null}

            {!isLoggedIn && !showGuestChat ? (
              <form id="guest-name-form" className="flex min-h-0 flex-1 flex-col p-4" onSubmit={(e) => void confirmGuestName(e)}>
                <div className="flex-1">
                  <FormInput
                    id="contact-admin-name"
                    label="ImiÄ™ i nazwisko"
                    required
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder="np. Jan Kowalski"
                    autoComplete="name"
                    disabled={loadingThread}
                    hint="Tak jak na liĹ›cie PiĹ‚karze albo Kontakt."
                  />
                </div>
                <Button type="submit" className="mt-4 w-full rounded-full" disabled={loadingThread}>
                  {loadingThread ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                      Sprawdzanieâ€¦
                    </>
                  ) : (
                    "Dalej"
                  )}
                </Button>
              </form>
            ) : null}

            {!isLoggedIn && showGuestChat ? (
              <>
                <div className="min-h-0 flex-1 overflow-y-auto px-3 pt-3">
                  <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-300">
                    Rozmawiasz jako <span className="font-semibold text-zinc-950 dark:text-white">{senderName}</span>
                    {" Â· "}
                    <button
                      type="button"
                      className="font-semibold text-[var(--mp-teal-dark)] underline underline-offset-2"
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
                      ZmieĹ„
                    </button>
                  </p>
                  <div className="mb-3 grid gap-1.5">
                    <Label htmlFor="contact-admin-recipient" className="text-zinc-700 dark:text-zinc-200">
                      Do kogo piszesz? <span className="text-red-500">*</span>
                    </Label>
                    <select
                      id="contact-admin-recipient"
                      className={cn(nativeSelectClasses, "w-full bg-white")}
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
                    tone="light"
                    className="min-h-[12rem] border-0 bg-transparent"
                    empty={
                      loadingThread && messages.length === 0 ? (
                        <Loader2 className="h-5 w-5 animate-spin text-[var(--mp-teal)]" aria-hidden />
                      ) : messages.length === 0 ? (
                        <p className="text-center text-sm text-zinc-500">Brak wiadomoĹ›ci â€” napisz pierwszÄ….</p>
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
                            />
                          ));
                        })()
                      : null}
                    <div ref={bottomRef} />
                  </ChatTranscript>
                </div>
                <form
                  id="write-to-admin-form"
                  className="border-t border-zinc-200 bg-white p-2 dark:border-zinc-800 dark:bg-zinc-900"
                  onSubmit={(e) => void handleSubmit(e)}
                >
                  <ChatComposerShell tone="light">
                    <ChatEmojiPicker
                      tone="light"
                      disabled={sending}
                      onPick={(emoji) => {
                        setBody((prev) => insertEmojiAtCursor(prev, emoji, textareaRef.current));
                      }}
                    />
                    <ChatAttachmentControls
                      tone="light"
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
                      tone="light"
                      value={body}
                      onChange={setBody}
                      placeholder="Napisz wiadomoĹ›Ä‡â€¦"
                      disabled={sending}
                      rows={1}
                      fieldRef={textareaRef}
                    />
                    {sendButton}
                  </ChatComposerShell>
                </form>
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "mp-chat-fab awp-focus-ring relative",
          "bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-3 sm:bottom-5 sm:left-5"
        )}
        aria-label={open ? "Zamknij czat" : "Czat â€” otwĂłrz rozmowy"}
        aria-expanded={open}
        title="WiadomoĹ›ci"
      >
        {open ? (
          <X className="h-6 w-6" strokeWidth={2.25} aria-hidden />
        ) : (
          <MessageCircle className="h-6 w-6" strokeWidth={2.25} aria-hidden />
        )}
        {!open && unreadReplies > 0 ? (
          <span
            className="absolute -right-0.5 -top-0.5 inline-flex min-h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold tabular-nums text-white ring-2 ring-white"
            aria-hidden
          >
            {unreadReplies > 99 ? "99+" : unreadReplies}
          </span>
        ) : null}
      </button>
    </>
  );

  return createPortal(widget, document.body);
}
