"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { Loader2, MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";
import {
  ChatAttachmentControls,
  ChatBubble,
  ChatEmojiPicker,
  insertEmojiAtCursor,
} from "@/components/chat-composer-extras";
import { AppModal } from "@/components/ui/app-modal";
import { FormInput, FormTextarea } from "@/components/ui/form-field";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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

  const loadThread = useCallback(
    async (opts?: { markRead?: boolean; name?: string; quiet?: boolean }) => {
      const name = (opts?.name ?? senderNameRef.current).trim();
      if (!isLoggedIn && name.length < 2) {
        setMessages([]);
        return false;
      }

      setLoadingThread(true);
      try {
        const params = new URLSearchParams();
        if (!isLoggedIn) params.set("sender_name", name);
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
          if (!isLoggedIn && opts?.quiet) {
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
        if (!isLoggedIn) {
          setNameConfirmed(true);
          try {
            localStorage.setItem(GUEST_NAME_STORAGE_KEY, data.sender_name ?? name);
          } catch {
            /* ignore */
          }
        }
        return true;
      } finally {
        setLoadingThread(false);
      }
    },
    [isLoggedIn]
  );

  useEffect(() => {
    if (hidden) return;
    if (!isLoggedIn && !nameConfirmed) return;
    void loadThread({ quiet: true });
    const id = window.setInterval(() => void loadThread({ quiet: true }), 45_000);
    return () => window.clearInterval(id);
  }, [hidden, isLoggedIn, nameConfirmed, loadThread]);

  useEffect(() => {
    if (!open) return;
    if (!isLoggedIn && !nameConfirmed) return;
    void loadThread({ markRead: true });
    const id = window.setInterval(() => void loadThread({ markRead: true, quiet: true }), 12_000);
    return () => window.clearInterval(id);
  }, [open, isLoggedIn, nameConfirmed, loadThread]);

  useEffect(() => {
    if (open) scrollToBottom();
  }, [messages, open, scrollToBottom]);

  async function confirmGuestName(e: React.FormEvent) {
    e.preventDefault();
    const name = senderName.trim();
    if (name.length < 2) {
      toast.error("Podaj imię i nazwisko z listy Piłkarze albo ze strony Kontakt.");
      return;
    }
    const ok = await loadThread({ name, markRead: true });
    if (!ok) setNameConfirmed(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = senderName.trim();
    const text = body.trim();

    if (!isLoggedIn && !nameConfirmed) {
      toast.error("Najpierw potwierdź imię i nazwisko z listy Piłkarze.");
      return;
    }
    if (name.length < 2) {
      toast.error("Podaj imię i nazwisko (min. 2 znaki).");
      return;
    }
    if (!text && !attachmentUrl) {
      toast.error("Napisz wiadomość lub dołącz grafikę.");
      return;
    }
    if (!recipients.some((r) => r.key === recipientKey)) {
      toast.error("Wybierz odbiorcę wiadomości.");
      return;
    }

    setSending(true);
    try {
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
      await loadThread({ markRead: true });
    } catch {
      toast.error("Nie udało się wysłać wiadomości.");
    } finally {
      setSending(false);
    }
  }

  if (!mounted || hidden || recipients.length === 0) return null;

  const showChat = isLoggedIn || nameConfirmed;
  const canSend = Boolean(body.trim() || attachmentUrl);

  const floatButton = (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "group fixed z-[60] flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-[var(--mundial-gold)]/65 bg-gradient-to-br from-emerald-800 via-emerald-900 to-emerald-950 text-white shadow-lg ring-1 ring-emerald-300/25 transition-[transform,box-shadow] motion-safe:hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
          "bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-3 sm:bottom-5 sm:left-5 sm:h-12 sm:w-12"
        )}
        aria-label="Czat z organizatorem — otwórz rozmowę"
        title="Napisz do organizatora"
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
        title="Czat z organizatorem"
        description={
          isLoggedIn
            ? "Napisz do organizatora, dołącz grafikę lub emotkę."
            : "Podaj imię i nazwisko z listy Piłkarze (lub organizatora z Kontakt), aby pisać i czytać odpowiedzi."
        }
        icon={<MessageCircle className="h-6 w-6 text-[var(--mundial-gold)]" aria-hidden />}
        headerKicker="Wiadomość"
        size="md"
        scrollable
        footer={
          showChat ? (
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
        {!showChat ? (
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
        ) : (
          <div className="space-y-4">
            {!isLoggedIn ? (
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
            ) : null}

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

            <div className="max-h-[min(280px,40vh)] space-y-2 overflow-y-auto rounded-xl border border-white/15 bg-black/20 p-3">
              {loadingThread && messages.length === 0 ? (
                <div className="flex justify-center py-8 text-emerald-100/70">
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                </div>
              ) : messages.length === 0 ? (
                <p className="py-6 text-center text-sm text-emerald-100/60">
                  Brak wiadomości — napisz pierwszą.
                </p>
              ) : (
                messages.map((m) => (
                  <ChatBubble
                    key={m.id}
                    body={m.body}
                    attachmentUrl={m.attachment_url}
                    senderLabel={m.mine ? null : m.sender_name}
                    timeLabel={m.created_at_display}
                    mine={m.mine}
                  />
                ))
              )}
              <div ref={bottomRef} />
            </div>

            <form id="write-to-admin-form" className="space-y-3" onSubmit={(e) => void handleSubmit(e)}>
              <FormTextarea
                id="contact-admin-body"
                label="Twoja wiadomość"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Napisz wiadomość…"
                rows={3}
                disabled={sending}
                ref={textareaRef}
              />
              <div className="flex flex-wrap items-center gap-2">
                <ChatEmojiPicker
                  disabled={sending}
                  onPick={(emoji) => {
                    setBody((prev) => insertEmojiAtCursor(prev, emoji, textareaRef.current));
                  }}
                />
                <ChatAttachmentControls
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
              </div>
            </form>
          </div>
        )}
      </AppModal>
    </>
  );

  return createPortal(floatButton, document.body);
}
