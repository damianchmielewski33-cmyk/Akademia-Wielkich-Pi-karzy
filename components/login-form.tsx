"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/app-toast";
import { z } from "zod";
import { AuthGoalPreloader, AUTH_SUCCESS_PRELOADER_DELAY_MS } from "@/components/auth-goal-preloader";
import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/ui/form-field";
import { Label } from "@/components/ui/label";
import { YesNoSwitch } from "@/components/ui/yes-no-switch";
import { PlayerAliasPicker } from "@/components/player-alias-picker";
import { useSiteMode } from "@/components/site-mode";
import { formSchemas, useValidatedForm, zodFieldErrors, emailWithConfirmSchema, refineMatchingPasswords } from "@/lib/form-validation";
import { notifyPostLoginPromptsUpdated } from "@/lib/post-login-prompts";
import { REALMS, type Realm } from "@/lib/realm";
import { sanitizeAppBridgeNext } from "@/lib/app-bridge";

const loginSchema = z.object({
  firstName: formSchemas.requiredName("Imię"),
  lastName: formSchemas.requiredName("Nazwisko"),
  pin: formSchemas.pin,
});

const emailLoginSchema = z.object({
  email: formSchemas.email,
  password: z.string().min(1, "Hasło jest wymagane"),
});

const forgotPasswordEmailSchema = emailWithConfirmSchema();

const forgotPasswordSchema = refineMatchingPasswords(
  emailWithConfirmSchema()
    .extend({
      code: z.string().trim().min(4, "Kod musi mieć co najmniej 4 cyfry").max(8, "Kod jest zbyt długi"),
      password: formSchemas.password,
      passwordConfirm: z.string().min(1, "Powtórz hasło"),
    })
);

const forgotSchema = z
  .object({
    firstName: formSchemas.requiredName("Imię"),
    lastName: formSchemas.requiredName("Nazwisko"),
    zawodnik: formSchemas.requiredText("Piłkarz"),
    pin: formSchemas.pin,
    pinConfirm: z.string().trim().min(1, "Powtórz PIN"),
  })
  .refine((d) => d.pin === d.pinConfirm, {
    message: "PIN-y muszą być takie same",
    path: ["pinConfirm"],
  });

export function LoginForm({
  nextPath,
  embedMode,
  onAuthenticated,
  realm = REALMS.ACADEMY,
}: {
  nextPath: string;
  embedMode?: boolean;
  onAuthenticated?: () => void;
  realm?: Realm;
}) {
  const { emailPasswordAuthEnabled } = useSiteMode();
  const submitVariant = "default";
  const router = useRouter();
  const next = sanitizeAppBridgeNext(nextPath) ?? "/";
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showGoalPreloader, setShowGoalPreloader] = useState(false);
  const [legacyPin, setLegacyPin] = useState(false);

  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotDoneOpen, setForgotDoneOpen] = useState(false);
  const [forgotSaving, setForgotSaving] = useState(false);

  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [forgotPasswordDoneOpen, setForgotPasswordDoneOpen] = useState(false);
  const [forgotPasswordBusy, setForgotPasswordBusy] = useState(false);
  const [forgotPasswordCodeSent, setForgotPasswordCodeSent] = useState(false);
  const [forgotPasswordInlineErrors, setForgotPasswordInlineErrors] = useState<
    Partial<Record<string, string>>
  >({});

  const forgotPasswordForm = useValidatedForm({
    initialValues: {
      email: "",
      emailConfirm: "",
      code: "",
      password: "",
      passwordConfirm: "",
    },
    schema: forgotPasswordSchema,
  });

  const loginForm = useValidatedForm({
    initialValues: { firstName: "", lastName: "", pin: "" },
    schema: loginSchema,
  });

  const emailLoginForm = useValidatedForm({
    initialValues: { email: "", password: "" },
    schema: emailLoginSchema,
  });

  const forgotForm = useValidatedForm({
    initialValues: { firstName: "", lastName: "", zawodnik: "", pin: "", pinConfirm: "" },
    schema: forgotSchema,
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const useEmail = emailPasswordAuthEnabled && !legacyPin;
    if (useEmail) {
      if (!emailLoginForm.validate()) return;
    } else if (!loginForm.validate()) {
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          useEmail
            ? {
                email: emailLoginForm.values.email,
                password: emailLoginForm.values.password,
                remember_me: rememberMe,
                realm,
              }
            : {
                first_name: loginForm.values.firstName,
                last_name: loginForm.values.lastName,
                pin: loginForm.values.pin,
                remember_me: rememberMe,
                realm,
              }
        ),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        code?: string;
        pin_change_pending?: number;
        needs_email_auth_setup?: number;
      };
      if (res.status === 403 && data.code === "NEEDS_INITIAL_PIN") {
        toast.info("Konto wymaga pierwszego ustawienia PIN-u — przekierowujemy na stronę ustawiania PIN-u.");
        const q = new URLSearchParams();
        if (loginForm.values.firstName.trim()) q.set("fn", loginForm.values.firstName.trim());
        if (loginForm.values.lastName.trim()) q.set("ln", loginForm.values.lastName.trim());
        q.set("next", next);
        router.push(`/ustaw-pin?${q.toString()}`);
        return;
      }
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Błąd logowania");
        return;
      }
      if (data.pin_change_pending === 1) {
        toast.info(
          "Twoja zmiana PIN-u czeka na zatwierdzenie przez administratora — masz dostęp jak osoba niezalogowana.",
          { duration: 6500 }
        );
      } else {
        toast.success("Zalogowano");
      }
      if (onAuthenticated) {
        await router.refresh();
        onAuthenticated();
        notifyPostLoginPromptsUpdated({
          needsEmailAuthSetup: data.needs_email_auth_setup === 1,
        });
        return;
      }
      setShowGoalPreloader(true);
      await new Promise((r) => setTimeout(r, AUTH_SUCCESS_PRELOADER_DELAY_MS));
      await router.push(next);
      router.refresh();
      notifyPostLoginPromptsUpdated({
        needsEmailAuthSetup: data.needs_email_auth_setup === 1,
      });
    } finally {
      setLoading(false);
    }
  }

  async function sendForgotPasswordCode() {
    forgotPasswordForm.setFieldTouched("email");
    forgotPasswordForm.setFieldTouched("emailConfirm");
    const emailErrors = zodFieldErrors(forgotPasswordEmailSchema, {
      email: forgotPasswordForm.values.email,
      emailConfirm: forgotPasswordForm.values.emailConfirm,
    });
    if (Object.keys(emailErrors).length > 0) {
      setForgotPasswordInlineErrors(emailErrors);
      return;
    }
    setForgotPasswordInlineErrors({});
    const trimmed = forgotPasswordForm.values.email.trim();
    setForgotPasswordBusy(true);
    try {
      const res = await fetch("/api/auth/forgot-password/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, realm }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Nie udało się wysłać kodu");
        return;
      }
      setForgotPasswordCodeSent(true);
      toast.success("Jeśli konto istnieje, wysłaliśmy kod na e-mail.");
    } finally {
      setForgotPasswordBusy(false);
    }
  }

  async function submitForgotPassword() {
    if (!forgotPasswordForm.validate()) return;
    setForgotPasswordInlineErrors({});
    const { email, code, password, passwordConfirm } = forgotPasswordForm.values;
    setForgotPasswordBusy(true);
    try {
      const res = await fetch("/api/auth/forgot-password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          code: code.trim(),
          password,
          password_confirm: passwordConfirm,
          realm,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Nie udało się zmienić hasła");
        return;
      }
      setForgotPasswordOpen(false);
      forgotPasswordForm.reset();
      setForgotPasswordCodeSent(false);
      setForgotPasswordDoneOpen(true);
    } finally {
      setForgotPasswordBusy(false);
    }
  }

  function openForgotPasswordModal() {
    const prefilled = emailLoginForm.values.email.trim();
    forgotPasswordForm.reset({
      email: prefilled,
      emailConfirm: prefilled,
      code: "",
      password: "",
      passwordConfirm: "",
    });
    setForgotPasswordInlineErrors({});
    setForgotPasswordCodeSent(false);
    setForgotPasswordOpen(true);
  }

  function forgotPasswordFieldError(field: keyof typeof forgotPasswordForm.values): string | undefined {
    return forgotPasswordInlineErrors[field] ?? forgotPasswordForm.errors[field];
  }

  async function submitForgotPin() {
    if (!forgotForm.validate()) return;
    const { firstName, lastName, zawodnik, pin, pinConfirm } = forgotForm.values;
    setForgotSaving(true);
    try {
      const res = await fetch("/api/auth/forgot-pin-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          zawodnik,
          pin,
          pin_confirm: pinConfirm,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Nie udało się zapisać prośby");
        return;
      }
      setForgotOpen(false);
      forgotForm.reset();
      setForgotDoneOpen(true);
    } finally {
      setForgotSaving(false);
    }
  }

  return (
    <>
      {showGoalPreloader && <AuthGoalPreloader label="Czas coś pokopać" />}
      <form onSubmit={onSubmit} className="space-y-4">
        {emailPasswordAuthEnabled && !legacyPin ? (
          <>
            <FormInput
              id="login_email"
              label="Adres e-mail"
              required
              showValidState
              type="email"
              autoComplete="email"
              value={emailLoginForm.values.email}
              onChange={(e) => emailLoginForm.setValue("email", e.target.value)}
              onBlur={() => emailLoginForm.setFieldTouched("email")}
              error={emailLoginForm.errors.email}
              placeholder="np. jan@example.com"
            />
            <FormInput
              id="login_password"
              label="Hasło"
              required
              showValidState
              type="password"
              autoComplete="current-password"
              value={emailLoginForm.values.password}
              onChange={(e) => emailLoginForm.setValue("password", e.target.value)}
              onBlur={() => emailLoginForm.setFieldTouched("password")}
              error={emailLoginForm.errors.password}
            />
          </>
        ) : (
          <>
        <FormInput
          id="first_name"
          label="Imię"
          required
          showValidState
          value={loginForm.values.firstName}
          onChange={(e) => loginForm.setValue("firstName", e.target.value)}
          onBlur={() => loginForm.setFieldTouched("firstName")}
          error={loginForm.errors.firstName}
          placeholder="Imię"
          autoComplete="given-name"
        />
        <FormInput
          id="last_name"
          label="Nazwisko"
          required
          showValidState
          value={loginForm.values.lastName}
          onChange={(e) => loginForm.setValue("lastName", e.target.value)}
          onBlur={() => loginForm.setFieldTouched("lastName")}
          error={loginForm.errors.lastName}
          placeholder="Nazwisko"
          autoComplete="family-name"
        />
        <FormInput
          id="pin"
          label="PIN (4–6 cyfr)"
          required
          showValidState
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          minLength={4}
          maxLength={6}
          value={loginForm.values.pin}
          onChange={(e) => loginForm.setValue("pin", e.target.value.replace(/\D/g, "").slice(0, 6))}
          onBlur={() => loginForm.setFieldTouched("pin")}
          error={loginForm.errors.pin}
          placeholder="4–6 cyfr"
        />
          </>
        )}
        <div className="flex items-center justify-between gap-3 pt-0.5">
          <Label htmlFor="login_remember" className="cursor-pointer font-normal leading-snug text-zinc-600 dark:text-zinc-400">
            Nie wylogowuj mnie
          </Label>
          <YesNoSwitch
            id="login_remember"
            checked={rememberMe}
            onCheckedChange={setRememberMe}
            tone="light"
            aria-label="Nie wylogowuj mnie"
          />
        </div>
        <Button type="submit" className="w-full rounded-full font-bold" variant={submitVariant} disabled={loading}>
          {loading ? "Logowanie…" : "Zaloguj się"}
        </Button>
        {emailPasswordAuthEnabled ? (
          <button
            type="button"
            className="w-full text-center text-sm font-medium text-[var(--mp-teal-dark)] hover:underline dark:text-teal-300"
            onClick={() => setLegacyPin((v) => !v)}
          >
            {legacyPin ? "Logowanie e-mailem i hasłem" : "Nie mam e-maila i hasła — logowanie PIN-em"}
          </button>
        ) : null}
      </form>

      {!embedMode && emailPasswordAuthEnabled && !legacyPin ? (
        <div className="mt-4 flex flex-col gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <button
            type="button"
            className="text-center text-sm font-medium text-[var(--mp-teal-dark)] hover:underline dark:text-teal-300"
            onClick={() => openForgotPasswordModal()}
          >
            Zapomniałem hasła
          </button>
        </div>
      ) : null}

      {!embedMode && (!emailPasswordAuthEnabled || legacyPin) && (
        <div className="mt-4 flex flex-col gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <button
            type="button"
            className="text-center text-sm font-medium text-[var(--mp-teal-dark)] hover:underline dark:text-teal-300"
            onClick={() => {
              forgotForm.reset({
                firstName: loginForm.values.firstName.trim(),
                lastName: loginForm.values.lastName.trim(),
                zawodnik: "",
                pin: "",
                pinConfirm: "",
              });
              setForgotOpen(true);
            }}
          >
            Zapomniałem PIN-u
          </button>
        </div>
      )}

      <AppModal
        open={forgotOpen}
        onOpenChange={setForgotOpen}
        size="sm"
        title="Nowy PIN — zapomniałem poprzedniego"
        description="Potwierdź tożsamość (imię, nazwisko i ten sam piłkarz co przy rejestracji), potem wpisz nowy PIN dwa razy. Administrator musi zatwierdzić zmianę w panelu — do tego czasu korzystasz ze strony jak osoba niezalogowana."
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setForgotOpen(false)}>
              Anuluj
            </Button>
            <Button type="button" variant="default" className="rounded-full font-bold" disabled={forgotSaving} onClick={() => void submitForgotPin()}>
              {forgotSaving ? "Zapisywanie…" : "Nadaj PIN i wyślij"}
            </Button>
          </>
        }
      >
        <FormInput
          id="fg-fn"
          label="Imię"
          required
          value={forgotForm.values.firstName}
          onChange={(e) => forgotForm.setValue("firstName", e.target.value)}
          onBlur={() => forgotForm.setFieldTouched("firstName")}
          error={forgotForm.errors.firstName}
        />
        <FormInput
          id="fg-ln"
          label="Nazwisko"
          required
          value={forgotForm.values.lastName}
          onChange={(e) => forgotForm.setValue("lastName", e.target.value)}
          onBlur={() => forgotForm.setFieldTouched("lastName")}
          error={forgotForm.errors.lastName}
        />
        <PlayerAliasPicker
          label="Piłkarz"
          required
          value={forgotForm.values.zawodnik}
          onChange={(v) => forgotForm.setValue("zawodnik", v)}
          onBlur={() => forgotForm.setFieldTouched("zawodnik")}
          error={forgotForm.errors.zawodnik}
          helperText="Ten sam pseudonim co przy rejestracji — wyszukaj lub wpisz ręcznie."
        />
        <FormInput
          id="fg-pin"
          label="Nowy PIN (4–6 cyfr)"
          required
          type="password"
          inputMode="numeric"
          autoComplete="new-password"
          minLength={4}
          maxLength={6}
          value={forgotForm.values.pin}
          onChange={(e) => forgotForm.setValue("pin", e.target.value.replace(/\D/g, "").slice(0, 6))}
          onBlur={() => forgotForm.setFieldTouched("pin")}
          error={forgotForm.errors.pin}
          placeholder="4–6 cyfr"
        />
        <FormInput
          id="fg-pin2"
          label="Powtórz nowy PIN"
          required
          type="password"
          inputMode="numeric"
          autoComplete="new-password"
          minLength={4}
          maxLength={6}
          value={forgotForm.values.pinConfirm}
          onChange={(e) => forgotForm.setValue("pinConfirm", e.target.value.replace(/\D/g, "").slice(0, 6))}
          onBlur={() => forgotForm.setFieldTouched("pinConfirm")}
          error={forgotForm.errors.pinConfirm}
          placeholder="Powtórz PIN"
        />
      </AppModal>

      <AppModal
        open={forgotPasswordOpen}
        onOpenChange={setForgotPasswordOpen}
        size="sm"
        title="Reset hasła"
        description="Wyślij kod na e-mail konta, potem ustaw nowe hasło. Po zmianie zaloguj się e-mailem i nowym hasłem."
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setForgotPasswordOpen(false)}>
              Anuluj
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={forgotPasswordBusy}
              onClick={() => void sendForgotPasswordCode()}
            >
              {forgotPasswordCodeSent ? "Wyślij kod ponownie" : "Wyślij kod"}
            </Button>
            <Button
              type="button"
              variant="default"
              className="rounded-full font-bold"
              disabled={forgotPasswordBusy}
              onClick={() => void submitForgotPassword()}
            >
              {forgotPasswordBusy ? "Zapisywanie…" : "Ustaw nowe hasło"}
            </Button>
          </>
        }
      >
        <FormInput
          id="fp-email"
          label="Adres e-mail"
          required
          showValidState
          type="email"
          autoComplete="email"
          value={forgotPasswordForm.values.email}
          onChange={(e) => forgotPasswordForm.setValue("email", e.target.value)}
          onBlur={() => forgotPasswordForm.setFieldTouched("email")}
          error={forgotPasswordFieldError("email")}
        />
        <FormInput
          id="fp-email2"
          label="Powtórz adres e-mail"
          required
          showValidState
          type="email"
          autoComplete="email"
          value={forgotPasswordForm.values.emailConfirm}
          onChange={(e) => forgotPasswordForm.setValue("emailConfirm", e.target.value)}
          onBlur={() => forgotPasswordForm.setFieldTouched("emailConfirm")}
          error={forgotPasswordFieldError("emailConfirm")}
        />
        <FormInput
          id="fp-code"
          label="Kod z e-maila"
          required
          inputMode="numeric"
          autoComplete="one-time-code"
          value={forgotPasswordForm.values.code}
          onChange={(e) => forgotPasswordForm.setValue("code", e.target.value.replace(/\D/g, "").slice(0, 8))}
          onBlur={() => forgotPasswordForm.setFieldTouched("code")}
          error={forgotPasswordFieldError("code")}
        />
        <FormInput
          id="fp-password"
          label="Nowe hasło (min. 8 znaków)"
          required
          showValidState
          type="password"
          autoComplete="new-password"
          value={forgotPasswordForm.values.password}
          onChange={(e) => forgotPasswordForm.setValue("password", e.target.value)}
          onBlur={() => forgotPasswordForm.setFieldTouched("password")}
          error={forgotPasswordFieldError("password")}
        />
        <FormInput
          id="fp-password2"
          label="Powtórz nowe hasło"
          required
          showValidState
          type="password"
          autoComplete="new-password"
          value={forgotPasswordForm.values.passwordConfirm}
          onChange={(e) => forgotPasswordForm.setValue("passwordConfirm", e.target.value)}
          onBlur={() => forgotPasswordForm.setFieldTouched("passwordConfirm")}
          error={forgotPasswordFieldError("passwordConfirm")}
        />
      </AppModal>

      <AppModal
        open={forgotPasswordDoneOpen}
        onOpenChange={setForgotPasswordDoneOpen}
        size="sm"
        title="Hasło zmienione"
        description="Możesz zalogować się adresem e-mail i nowym hasłem."
        footer={
          <Button type="button" variant="default" className="rounded-full font-bold" onClick={() => setForgotPasswordDoneOpen(false)}>
            Rozumiem
          </Button>
        }
      />

      <AppModal
        open={forgotDoneOpen}
        onOpenChange={setForgotDoneOpen}
        size="sm"
        title="Oczekiwanie na administratora"
        description={
          <>
            Twoja propozycja nowego PIN-u została zapisana. <strong>Administrator musi ją zatwierdzić</strong> w panelu
            — dopiero wtedy obowiązuje nowy PIN. Do czasu decyzji masz dostęp tak jak osoba niezalogowana.
          </>
        }
        footer={
          <Button type="button" variant="default" className="rounded-full font-bold" onClick={() => setForgotDoneOpen(false)}>
            Rozumiem
          </Button>
        }
      />
    </>
  );
}
