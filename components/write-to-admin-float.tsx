"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { Loader2, MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";
import { AppModal } from "@/components/ui/app-modal";
import { FormInput, FormTextarea } from "@/components/ui/form-field";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Defaults = {
  senderName: string;
  senderEmail: string;
};

type Props = {
  defaults?: Defaults | null;
};

export function WriteToAdminFloat({ defaults }: Props) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [senderName, setSenderName] = useState(defaults?.senderName ?? "");
  const [senderEmail, setSenderEmail] = useState(defaults?.senderEmail ?? "");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (defaults) {
      setSenderName(defaults.senderName);
      setSenderEmail(defaults.senderEmail);
    }
  }, [defaults]);

  const hidden = pathname.startsWith("/panel-admina");

  function resetForm() {
    setSenderName(defaults?.senderName ?? "");
    setSenderEmail(defaults?.senderEmail ?? "");
    setBody("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = senderName.trim();
    const email = senderEmail.trim();
    const text = body.trim();

    if (name.length < 2) {
      toast.error("Podaj imię i nazwisko (min. 2 znaki).");
      return;
    }
    if (text.length < 10) {
      toast.error("Wiadomość musi mieć co najmniej 10 znaków.");
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Nieprawidłowy adres e-mail.");
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/contact-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender_name: name,
          sender_email: email || null,
          body: text,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Nie udało się wysłać wiadomości.");
        return;
      }
      toast.success("Wiadomość wysłana. Administrator odpowie, gdy będzie mógł.");
      resetForm();
      setOpen(false);
    } catch {
      toast.error("Nie udało się wysłać wiadomości.");
    } finally {
      setSending(false);
    }
  }

  if (!mounted || hidden) return null;

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
        description="Wyślij wiadomość do administratora Akademii. Odpowiemy tak szybko, jak to możliwe."
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
          <FormInput
            id="contact-admin-email"
            label="E-mail (opcjonalnie)"
            type="email"
            value={senderEmail}
            onChange={(e) => setSenderEmail(e.target.value)}
            placeholder="jan@example.com"
            autoComplete="email"
            hint="Podaj e-mail, jeśli chcesz dostać odpowiedź."
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
