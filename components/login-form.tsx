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
import { formSchemas, useValidatedForm } from "@/lib/form-validation";
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
  const { marketplaceEnabled, emailPasswordAuthEnabled } = useSiteMode();
  const submitVariant = marketplaceEnabled ? "gold" : "pitch";
  const router = useRouter();
  const next = sanitizeAppBridgeNext(nextPath) ?? "/";
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showGoalPreloader, setShowGoalPreloader] = useState(false);
  const [legacyPin, setLegacyPin] = useState(false);

  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotDoneOpen, setForgotDoneOpen] = useState(false);
  const [forgotSaving, setForgotSaving] = useState(false);

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
        notifyPostLoginPromptsUpdated();
        return;
      }
      setShowGoalPreloader(true);
      await new Promise((r) => setTimeout(r, AUTH_SUCCESS_PRELOADER_DELAY_MS));
      await router.push(next);
      router.refresh();
      notifyPostLoginPromptsUpdated();
    } finally {
      setLoading(false);
    }
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
            tone="pitch"
            aria-label="Nie wylogowuj mnie"
          />
        </div>
        <Button type="submit" className="w-full" variant={submitVariant} disabled={loading}>
          {loading ? "Logowanie…" : "Zaloguj się"}
        </Button>
        {emailPasswordAuthEnabled ? (
          <button
            type="button"
            className="w-full text-center text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-300"
            onClick={() => setLegacyPin((v) => !v)}
          >
            {legacyPin ? "Logowanie e-mailem i hasłem" : "Mam stare konto z PIN-em"}
          </button>
        ) : null}
      </form>

      {!embedMode && (!emailPasswordAuthEnabled || legacyPin) && (
        <div className="mt-4 flex flex-col gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <button
            type="button"
            className="text-center text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-300"
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
            <Button type="button" variant="pitch" disabled={forgotSaving} onClick={() => void submitForgotPin()}>
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
          <Button type="button" variant="pitch" onClick={() => setForgotDoneOpen(false)}>
            Rozumiem
          </Button>
        }
      />
    </>
  );
}
