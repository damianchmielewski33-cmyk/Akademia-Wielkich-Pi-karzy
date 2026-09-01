"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { toast } from "@/lib/app-toast";
import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/ui/form-field";
import { useSiteMode } from "@/components/site-mode";
import {
  emailWithConfirmSchema,
  formSchemas,
  refineMatchingPasswords,
  useValidatedForm,
  zodFieldErrors,
} from "@/lib/form-validation";
import {
  clearPendingEmailAuthSetupFromLogin,
  notifyPostLoginPromptsUpdated,
  peekPendingEmailAuthSetupFromLogin,
} from "@/lib/post-login-prompts";

type MeUser = {
  id: number;
  email: string | null;
  needs_email_auth_setup?: number;
  pin_change_pending?: number;
  needs_pin_setup?: number;
};

const EMAIL_AUTH_PLACEHOLDER: MeUser = { id: 0, email: null, needs_email_auth_setup: 1 };

const emailAuthSetupEmailSchema = emailWithConfirmSchema();

const emailAuthSetupSchema = refineMatchingPasswords(
  emailWithConfirmSchema().extend({
    password: formSchemas.password,
    passwordConfirm: z.string().min(1, "Powtórz hasło"),
    code: z.string().trim().min(4, "Kod musi mieć co najmniej 4 cyfry").max(8, "Kod jest zbyt długi"),
  })
);

function shouldForceEmailAuthSetup(initialNeedsSetup: boolean, pendingFromLogin: boolean): boolean {
  return initialNeedsSetup || pendingFromLogin;
}

export function EmailAuthSetupPrompt({ initialNeedsSetup = false }: { initialNeedsSetup?: boolean }) {
  const { emailPasswordAuthEnabled } = useSiteMode();
  const router = useRouter();
  const [pendingFromLogin, setPendingFromLogin] = useState(() => peekPendingEmailAuthSetupFromLogin());
  const setupRequired = shouldForceEmailAuthSetup(initialNeedsSetup, pendingFromLogin);
  const [user, setUser] = useState<MeUser | null | undefined>(() =>
    setupRequired ? EMAIL_AUTH_PLACEHOLDER : undefined
  );
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [inlineErrors, setInlineErrors] = useState<Partial<Record<string, string>>>({});

  const form = useValidatedForm({
    initialValues: {
      email: "",
      emailConfirm: "",
      password: "",
      passwordConfirm: "",
      code: "",
    },
    schema: emailAuthSetupSchema,
  });

  useEffect(() => {
    if (!setupRequired) return;
    setUser((prev) => (prev?.needs_email_auth_setup === 1 ? prev : EMAIL_AUTH_PLACEHOLDER));
  }, [setupRequired]);

  const { values, errors, setValue, setFieldTouched, validate } = form;

  const load = useCallback(async () => {
    if (!emailPasswordAuthEnabled && !setupRequired) {
      setUser(null);
      return;
    }
    try {
      const meRes = await fetch("/api/auth/me", { credentials: "include" });
      const data = (await meRes.json()) as { user: MeUser | null };
      if (!data.user) {
        if (!setupRequired) setUser(null);
        return;
      }
      setUser(data.user);
      if (data.user.needs_email_auth_setup !== 1) {
        setPendingFromLogin(false);
        clearPendingEmailAuthSetupFromLogin();
      }
      if (data.user.email) {
        const trimmed = data.user.email.trim();
        setValue("email", trimmed);
        setValue("emailConfirm", trimmed);
      }
    } catch {
      if (!setupRequired) setUser(null);
    }
  }, [emailPasswordAuthEnabled, setupRequired, setValue]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onUp = () => {
      if (peekPendingEmailAuthSetupFromLogin()) {
        setPendingFromLogin(true);
        setUser(EMAIL_AUTH_PLACEHOLDER);
      }
      void load();
    };
    window.addEventListener("post-login-prompts-updated", onUp);
    return () => window.removeEventListener("post-login-prompts-updated", onUp);
  }, [load]);

  const open = Boolean(
    (emailPasswordAuthEnabled || setupRequired) &&
      user &&
      user.needs_email_auth_setup === 1 &&
      !user.pin_change_pending &&
      !user.needs_pin_setup
  );

  function fieldError(field: keyof typeof values): string | undefined {
    return inlineErrors[field] ?? errors[field];
  }

  async function sendCode() {
    setFieldTouched("email");
    setFieldTouched("emailConfirm");
    const emailErrors = zodFieldErrors(emailAuthSetupEmailSchema, {
      email: values.email,
      emailConfirm: values.emailConfirm,
    });
    if (Object.keys(emailErrors).length > 0) {
      setInlineErrors(emailErrors);
      return;
    }
    setInlineErrors({});
    setBusy(true);
    try {
      const res = await fetch("/api/auth/email-auth/send-code", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: values.email.trim() }),
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
    if (!validate()) return;
    setInlineErrors({});
    const { email, password, passwordConfirm, code } = values;
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
      toast.success("Konto uzupełnione — od teraz logujesz się e-mailem i hasłem, bez PIN-u.");
      setPendingFromLogin(false);
      clearPendingEmailAuthSetupFromLogin();
      setUser((u) => (u ? { ...u, needs_email_auth_setup: 0, email: email.trim() } : u));
      notifyPostLoginPromptsUpdated();
      router.refresh();
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
      elevated
      size="sm"
      title="Uzupełnij e-mail i hasło"
      description="Konto z PIN-em trzeba teraz powiązać z e-mailem. Po wpisaniu kodu z wiadomości logowanie PIN-em zostanie wyłączone — zostaje e-mail i hasło. Tego okna nie da się pominąć."
    >
      <div className="space-y-3">
        <FormInput
          id="email-auth-email"
          label="Adres e-mail"
          required
          showValidState
          type="email"
          autoComplete="email"
          value={values.email}
          onChange={(e) => setValue("email", e.target.value)}
          onBlur={() => setFieldTouched("email")}
          error={fieldError("email")}
        />
        <FormInput
          id="email-auth-email2"
          label="Powtórz adres e-mail"
          required
          showValidState
          type="email"
          autoComplete="email"
          value={values.emailConfirm}
          onChange={(e) => setValue("emailConfirm", e.target.value)}
          onBlur={() => setFieldTouched("emailConfirm")}
          error={fieldError("emailConfirm")}
        />
        <FormInput
          id="email-auth-password"
          label="Hasło (min. 8 znaków)"
          required
          showValidState
          type="password"
          autoComplete="new-password"
          value={values.password}
          onChange={(e) => setValue("password", e.target.value)}
          onBlur={() => setFieldTouched("password")}
          error={fieldError("password")}
        />
        <FormInput
          id="email-auth-password2"
          label="Powtórz hasło"
          required
          showValidState
          type="password"
          autoComplete="new-password"
          value={values.passwordConfirm}
          onChange={(e) => setValue("passwordConfirm", e.target.value)}
          onBlur={() => setFieldTouched("passwordConfirm")}
          error={fieldError("passwordConfirm")}
        />
        <FormInput
          id="email-auth-code"
          label="Kod z e-maila"
          required
          inputMode="numeric"
          autoComplete="one-time-code"
          value={values.code}
          onChange={(e) => setValue("code", e.target.value.replace(/\D/g, "").slice(0, 8))}
          onBlur={() => setFieldTouched("code")}
          error={fieldError("code")}
        />
        <div className="flex flex-col gap-2 pt-1">
          <Button type="button" variant="outline" disabled={busy} onClick={() => void sendCode()}>
            {codeSent ? "Wyślij kod ponownie" : "Wyślij kod na e-mail"}
          </Button>
          <Button type="button" variant="default" className="rounded-full font-bold" disabled={busy} onClick={() => void complete()}>
            {busy ? "Zapisywanie…" : "Zapisz i wejdź"}
          </Button>
          <button
            type="button"
            className="pt-1 text-center text-sm text-zinc-500 underline-offset-2 hover:underline dark:text-zinc-400"
            disabled={busy}
            onClick={() => {
              window.location.href = "/api/auth/logout?next=/login";
            }}
          >
            Wyloguj się
          </button>
        </div>
      </div>
    </AppModal>
  );
}
