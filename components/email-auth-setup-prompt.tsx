"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "@/lib/app-toast";
import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/ui/form-field";
import { useSiteMode } from "@/components/site-mode";
import { notifyPostLoginPromptsUpdated } from "@/lib/post-login-prompts";

type MeUser = {
  id: number;
  email: string | null;
  needs_email_auth_setup?: number;
  pin_change_pending?: number;
  needs_pin_setup?: number;
};

export function EmailAuthSetupPrompt() {
  const { emailPasswordAuthEnabled } = useSiteMode();
  const [user, setUser] = useState<MeUser | null | undefined>(undefined);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!emailPasswordAuthEnabled) {
      setUser(null);
      return;
    }
    try {
      const meRes = await fetch("/api/auth/me", { credentials: "include" });
      const data = (await meRes.json()) as { user: MeUser | null };
      if (!data.user) {
        setUser(null);
        return;
      }
      setUser(data.user);
      if (data.user.email) setEmail(data.user.email);
    } catch {
      setUser(null);
    }
  }, [emailPasswordAuthEnabled]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onUp = () => void load();
    window.addEventListener("post-login-prompts-updated", onUp);
    return () => window.removeEventListener("post-login-prompts-updated", onUp);
  }, [load]);

  const open = Boolean(
    emailPasswordAuthEnabled &&
      user &&
      user.needs_email_auth_setup === 1 &&
      !user.pin_change_pending &&
      !user.needs_pin_setup
  );

  async function sendCode() {
    const trimmed = email.trim();
    if (!trimmed) {
      toast.error("Podaj adres e-mail.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/email-auth/send-code", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(typeof j.error === "string" ? j.error : "Nie udało się wysłać kodu");
        return;
      }
      setCodeSent(true);
      toast.success("Kod został wysłany na e-mail.");
    } finally {
      setBusy(false);
    }
  }

  async function complete() {
    if (!email.trim() || !password || !passwordConfirm || !code.trim()) {
      toast.error("Uzupełnij e-mail, hasło, powtórzenie hasła i kod z wiadomości.");
      return;
    }
    if (password !== passwordConfirm) {
      toast.error("Hasła muszą być takie same.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/email-auth/complete", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          password_confirm: passwordConfirm,
          code: code.trim(),
        }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(typeof j.error === "string" ? j.error : "Nie udało się zapisać danych");
        return;
      }
      toast.success("Konto uzupełnione — możesz korzystać z aplikacji.");
      setUser((u) => (u ? { ...u, needs_email_auth_setup: 0, email: email.trim() } : u));
      notifyPostLoginPromptsUpdated();
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppModal
      open={open}
      onOpenChange={() => {
        /* nie da się zamknąć, dopóki dane nie zostaną uzupełnione */
      }}
      preventDismiss
      hideCloseButton
      size="sm"
      title="Uzupełnij dane konta"
      description="Przy kolejnym logowaniu obowiązuje e-mail, hasło i kod z wiadomości. Okno zniknie dopiero po uzupełnieniu wszystkich pól."
    >
      <div className="space-y-3">
        <FormInput
          id="email-auth-email"
          label="Adres e-mail"
          required
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <FormInput
          id="email-auth-password"
          label="Hasło (min. 8 znaków)"
          required
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <FormInput
          id="email-auth-password2"
          label="Powtórz hasło"
          required
          type="password"
          autoComplete="new-password"
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
        />
        <FormInput
          id="email-auth-code"
          label="Kod z e-maila"
          required
          inputMode="numeric"
          autoComplete="one-time-code"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
        />
        <div className="flex flex-col gap-2 pt-1">
          <Button type="button" variant="outline" disabled={busy} onClick={() => void sendCode()}>
            {codeSent ? "Wyślij kod ponownie" : "Wyślij kod na e-mail"}
          </Button>
          <Button type="button" variant="pitch" disabled={busy} onClick={() => void complete()}>
            {busy ? "Zapisywanie…" : "Zapisz i wejdź"}
          </Button>
        </div>
      </div>
    </AppModal>
  );
}
