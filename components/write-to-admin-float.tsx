"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { Loader2, MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";
import { AppModal } from "@/components/ui/app-modal";
import { FormInput, FormTextarea } from "@/components/ui/form-field";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { nativeSelectClasses } from "@/lib/field-styles";
import type { ContactAdminRecipientKey, ContactAdminRecipientOption } from "@/lib/contact-admin-recipients";

type Props = {
  defaults?: { senderName: string } | null;
  recipients: ContactAdminRecipientOption[];
};

export function WriteToAdminFloat({ defaults, recipients }: Props) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [senderName, setSenderName] = useState(defaults?.senderName ?? "");
  const [recipientKey, setRecipientKey] = useState<ContactAdminRecipientKey>(
    recipients[0]?.key ?? "damian"
  );
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (defaults?.senderName) {
      setSenderName(defaults.senderName);
    }
  }, [defaults]);

  useEffect(() => {
    if (recipients.length > 0 && !recipients.some((r) => r.key === recipientKey)) {
      setRecipientKey(recipients[0].key);
    }
  }, [recipients, recipientKey]);

  const hidden = pathname.startsWith("/panel-admina");

  function resetForm() {
    setSenderName(defaults?.senderName ?? "");
    setRecipientKey(recipients[0]?.key ?? "damian");
    setBody("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = senderName.trim();
    const text = body.trim();

    if (name.length < 2) {
      toast.error("Podaj imię i nazwisko (min. 2 znaki).");
      return;
    }
    if (text.length < 10) {
      toast.error("Wiadomość musi mieć co najmniej 10 znaków.");
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
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Nie udało się wysłać wiadomości.");
        return;
      }
      const recipientLabel = recipients.find((r) => r.key === recipientKey)?.label ?? "organizatora";
      toast.success(`Wiadomość wysłana do ${recipientLabel}.`);
      resetForm();
      setOpen(false);
    } catch {
      toast.error("Nie udało się wysłać wiadomości.");
    } finally {
      setSending(false);
    }
  }

  if (!mounted || hidden || recipients.length === 0) return null;

  const floatButton = (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "group fixed z-[60] flex items-center gap-2.5 overflow-hidden rounded-full border-2 border-[var(--mundial-gold)]/70 bg-gradient-to-br from-emerald-800 via-emerald-900 to-emerald-950 px-4 py-3.5 text-left text-white shadow-2xl ring-2 ring-emerald-300/30 transition-[transform,box-shadow] motion-safe:hover:-translate-y-1 hover:shadow-[0_20px_50px_-12px_rgba(5,80,55,0.55)] focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
          "bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-4 sm:bottom-6 sm:left-6 sm:px-5 sm:py-4"
        )}
        aria-label="Napis do admina — otwórz formularz wiadomości"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15 ring-2 ring-white/30 sm:h-12 sm:w-12">
          <MessageCircle className="h-6 w-6 text-[var(--mundial-gold)]" strokeWidth={2.25} aria-hidden />
        </span>
        <span className="hidden min-w-0 flex-col pr-1 sm:flex">
          <span className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-emerald-100/85">Kontakt</span>
          <span className="truncate text-sm font-extrabold leading-tight">Napis do admina</span>
        </span>
      </button>

      <AppModal
        open={open}
        onOpenChange={(next) => {
          if (!sending) setOpen(next);
        }}
        title="Napis do admina"
        description="Wybierz organizatora i wyślij wiadomość — odpowiemy tak szybko, jak to możliwe."
        icon={<MessageCircle className="h-6 w-6 text-[var(--mundial-gold)]" aria-hidden />}
        headerKicker="Wiadomość"
        size="md"
        scrollable
        footer={
          <>
            <Button type="button" variant="outline" disabled={sending} onClick={() => setOpen(false)}>
              Anuluj
            </Button>
            <Button type="submit" form="write-to-admin-form" variant="stadium" disabled={sending}>
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
        }
      >
        <form id="write-to-admin-form" className="space-y-4" onSubmit={handleSubmit}>
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
          <FormInput
            id="contact-admin-name"
            label="Imię i nazwisko"
            required
            value={senderName}
            onChange={(e) => setSenderName(e.target.value)}
            placeholder="Jan Kowalski"
            autoComplete="name"
            disabled={sending}
          />
          <FormTextarea
            id="contact-admin-body"
            label="Wiadomość"
            required
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Napisz, o co chodzi…"
            rows={6}
            disabled={sending}
          />
        </form>
      </AppModal>
    </>
  );

  return createPortal(floatButton, document.body);
}
