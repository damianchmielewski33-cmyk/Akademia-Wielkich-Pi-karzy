"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { Bell } from "lucide-react";
import { z } from "zod";
import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/ui/form-field";
import { modalPanelClass } from "@/components/ui/modal-shared";
import { formSchemas } from "@/lib/form-validation";

type MeUser = {
  id: number;
  notification_prompt_completed: number;
  email: string | null;
  pin_change_pending?: number;
};

export function MatchNotificationPrompt() {
  const pathname = usePathname();
  const [user, setUser] = useState<MeUser | null | undefined>(undefined);
  const [participationSurveyPending, setParticipationSurveyPending] = useState(false);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | undefined>();

  const load = useCallback(async () => {
    try {
      const [meRes, surveyRes] = await Promise.all([
        fetch("/api/auth/me", { credentials: "include" }),
        fetch("/api/user/match-participation-survey", { credentials: "include" }),
      ]);
      const data = (await meRes.json()) as { user: MeUser | null };
      if (!data.user) {
        setUser(null);
        setParticipationSurveyPending(false);
        return;
      }
      setUser(data.user);
      if (data.user.email) setEmail(data.user.email);
      if (surveyRes.ok) {
        const s = (await surveyRes.json()) as { pending?: boolean };
        setParticipationSurveyPending(s.pending === true);
      } else {
        setParticipationSurveyPending(false);
      }
    } catch {
      setUser(null);
      setParticipationSurveyPending(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, pathname]);

  useEffect(() => {
    const onUp = () => void load();
    window.addEventListener("post-login-prompts-updated", onUp);
    return () => window.removeEventListener("post-login-prompts-updated", onUp);
  }, [load]);

  const open = Boolean(
    user &&
      user.notification_prompt_completed === 0 &&
      !user.pin_change_pending &&
      !participationSurveyPending
  );

  const dismiss = async () => {
    setBusy(true);
    try {
      const r = await fetch("/api/user/notification-preferences", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dismiss" }),
      });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Nie udało się zapisać");
      }
      setUser((u) => (u ? { ...u, notification_prompt_completed: 1 } : u));
      toast.success("Możesz w każdej chwili zmienić zdanie — napisz do administratora.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Błąd zapisu");
    } finally {
      setBusy(false);
    }
  };

  const subscribe = async () => {
    if (!consent) {
      toast.error("Zaznacz zgodę, aby zapisać powiadomienia.");
      return;
    }
    const parsed = z.object({ email: formSchemas.email }).safeParse({ email });
    if (!parsed.success) {
      setEmailError(parsed.error.issues[0]?.message ?? "Podaj poprawny adres e-mail");
      return;
    }
    setEmailError(undefined);
    const trimmed = parsed.data.email.trim();
    setBusy(true);
    try {
      const r = await fetch("/api/user/notification-preferences", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "subscribe", email: trimmed, consent: true }),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string; details?: unknown };
      if (!r.ok) {
        throw new Error(j.error ?? "Nie udało się zapisać");
      }
      setUser((u) => (u ? { ...u, notification_prompt_completed: 1, email: trimmed } : u));
      toast.success("Zapisano — dostaniesz wiadomość, gdy pojawi się nowy termin.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Błąd zapisu");
    } finally {
      setBusy(false);
    }
  };

  if (user === undefined) return null;

  return (
    <AppModal
      open={open}
      onOpenChange={() => {}}
      preventDismiss
      hideCloseButton
      size="md"
      title="Powiadomienia o meczach"
      headerKicker="Powiadomienie"
      description="Czy chcesz otrzymywać powiadomienia o nowych terminach w terminarzu?"
      icon={<Bell className="h-5 w-5 text-[var(--mundial-gold)]" aria-hidden />}
      contentClassName="space-y-5"
      footer={
        <>
          <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => void dismiss()} disabled={busy}>
            Nie, dziękuję
          </Button>
          <Button type="button" variant="pitch" className="w-full sm:w-auto" onClick={() => void subscribe()} disabled={busy}>
            Zapisz i włącz powiadomienia
          </Button>
        </>
      }
      footerClassName="flex-col sm:flex-row"
    >
      <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        Jeśli tak, podaj adres e-mail i zaznacz zgodę poniżej. Po dodaniu nowego meczu przez administratora wyślemy Ci krótką wiadomość z datą, godziną, miejscem i linkiem do zapisu w aplikacji.
      </p>
      <FormInput
        id="notif-email"
        label="Adres e-mail"
        required
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          if (emailError) setEmailError(undefined);
        }}
        onBlur={() => {
          const parsed = z.object({ email: formSchemas.email }).safeParse({ email });
          setEmailError(parsed.success ? undefined : parsed.error.issues[0]?.message);
        }}
        error={emailError}
        placeholder="np. jan@example.com"
        disabled={busy}
      />
      <div className={modalPanelClass}>
        <label className="flex cursor-pointer gap-3 text-sm leading-snug text-zinc-800 dark:text-zinc-200">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            disabled={busy}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-zinc-300 text-emerald-700 focus:ring-emerald-600"
          />
          <span>
            Wyrażam dobrowolną zgodę na przetwarzanie podanego adresu e-mail w celu przesyłania informacji o nowych terminach meczów w ramach serwisu Akademii Wielkich Piłkarzy. Wiem, że mogę wycofać zgodę w dowolnym momencie (np. kontaktując się z administratorem strony); wycofanie zgody nie wpływa na zgodność z prawem przetwarzania przed jej wycofaniem.
          </span>
        </label>
      </div>
    </AppModal>
  );
}
