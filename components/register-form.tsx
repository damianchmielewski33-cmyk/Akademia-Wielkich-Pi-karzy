"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/app-toast";
import { z } from "zod";
import {
  AuthGoalPreloader,
  AUTH_SUCCESS_PRELOADER_DELAY_MS,
} from "@/components/auth-goal-preloader";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/ui/form-field";
import { Label } from "@/components/ui/label";
import { YesNoSwitch } from "@/components/ui/yes-no-switch";
import { PlayerAliasPicker } from "@/components/player-alias-picker";
import { formSchemas, useValidatedForm } from "@/lib/form-validation";
import { notifyPostLoginPromptsUpdated } from "@/lib/post-login-prompts";
import { sanitizeAppBridgeNext } from "@/lib/app-bridge";
import { useSiteMode } from "@/components/site-mode";

const registerSchema = z
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

const emailRegisterSchema = z
  .object({
    firstName: formSchemas.requiredName("Imię"),
    lastName: formSchemas.requiredName("Nazwisko"),
    zawodnik: formSchemas.requiredText("Piłkarz"),
    email: formSchemas.email,
    password: formSchemas.password,
    passwordConfirm: z.string().min(1, "Powtórz hasło"),
  })
  .refine((d) => d.password === d.passwordConfirm, {
    message: "Hasła muszą być takie same",
    path: ["passwordConfirm"],
  });

export function RegisterForm({
  nextPath,
  realm = "academy",
}: {
  nextPath?: string;
  realm?: "academy" | "pzu_cup";
}) {
  const { emailPasswordAuthEnabled } = useSiteMode();
  const submitVariant = "default";
  const router = useRouter();
  const next = sanitizeAppBridgeNext(nextPath) ?? undefined;
  const [autoLogin, setAutoLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showGoalPreloader, setShowGoalPreloader] = useState(false);
  const [goalPreloaderLabel, setGoalPreloaderLabel] = useState<string | undefined>(undefined);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState("");

  const form = useValidatedForm({
    initialValues: { firstName: "", lastName: "", zawodnik: "", pin: "", pinConfirm: "" },
    schema: registerSchema,
  });

  const emailForm = useValidatedForm({
    initialValues: {
      firstName: "",
      lastName: "",
      zawodnik: "",
      email: "",
      password: "",
      passwordConfirm: "",
    },
    schema: emailRegisterSchema,
  });

  async function finishLoggedIn() {
    setGoalPreloaderLabel(realm === "pzu_cup" ? "Gol! Witamy w turnieju…" : "Gol! Witamy w akademii…");
    setShowGoalPreloader(true);
    toast.success("Konto utworzone — jesteś zalogowany");
    await new Promise((r) => setTimeout(r, AUTH_SUCCESS_PRELOADER_DELAY_MS));
    await router.push(next ?? (realm === "pzu_cup" ? "/pzu-cup" : "/"));
    router.refresh();
    notifyPostLoginPromptsUpdated();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (emailPasswordAuthEnabled) {
      if (!emailForm.validate()) return;
      const { firstName, lastName, zawodnik, email, password, passwordConfirm } = emailForm.values;
      setLoading(true);
      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            first_name: firstName,
            last_name: lastName,
            zawodnik,
            email,
            password,
            password_confirm: passwordConfirm,
            realm,
          }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          needs_verification?: boolean;
          email?: string;
        };
        if (!res.ok) {
          toast.error(typeof data.error === "string" ? data.error : "Błąd rejestracji");
          return;
        }
        setPendingEmail(data.email ?? email);
        toast.success("Kod uwierzytelniający został wysłany na e-mail.");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!form.validate()) return;
    const { firstName, lastName, zawodnik, pin, pinConfirm } = form.values;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          zawodnik,
          pin,
          pin_confirm: pinConfirm,
          auto_login: autoLogin,
          realm,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Błąd rejestracji");
        return;
      }
      if (data.logged_in) {
        await finishLoggedIn();
      } else {
        setGoalPreloaderLabel("Konto gotowe! Idziemy do logowania…");
        setShowGoalPreloader(true);
        toast.success("Konto utworzone — zaloguj się");
        await new Promise((r) => setTimeout(r, AUTH_SUCCESS_PRELOADER_DELAY_MS));
        const loginUrl =
          realm === "pzu_cup"
            ? next
              ? `/pzu-cup/login?next=${encodeURIComponent(next)}`
              : "/pzu-cup/login"
            : next
              ? `/login?next=${encodeURIComponent(next)}`
              : "/login";
        router.push(loginUrl);
      }
    } finally {
      setLoading(false);
    }
  }

  async function verifyEmailCode(e: React.FormEvent) {
    e.preventDefault();
    if (!pendingEmail || verifyCode.trim().length < 4) {
      toast.error("Wpisz kod z wiadomości e-mail.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pendingEmail, code: verifyCode.trim(), realm, remember_me: true }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; logged_in?: boolean };
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Nieprawidłowy kod");
        return;
      }
      await finishLoggedIn();
    } finally {
      setLoading(false);
    }
  }

  async function resendCode() {
    if (!pendingEmail) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/email-auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pendingEmail, realm }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Nie udało się wysłać kodu");
        return;
      }
      toast.success("Wysłano nowy kod.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {showGoalPreloader && <AuthGoalPreloader label={goalPreloaderLabel} />}
      {pendingEmail ? (
        <form onSubmit={(e) => void verifyEmailCode(e)} className="space-y-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Wysłaliśmy kod uwierzytelniający na <strong>{pendingEmail}</strong>. Wpisz go poniżej, żeby dokończyć
            rejestrację.
          </p>
          <FormInput
            id="reg_code"
            label="Kod z e-maila"
            required
            inputMode="numeric"
            autoComplete="one-time-code"
            value={verifyCode}
            onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
          />
          <Button type="submit" className="w-full rounded-full font-bold" variant={submitVariant} disabled={loading}>
            {loading ? "Sprawdzanie…" : "Potwierdź kod"}
          </Button>
          <button
            type="button"
            className="w-full text-center text-sm font-medium text-[var(--mp-teal-dark)] hover:underline dark:text-teal-300"
            onClick={() => void resendCode()}
            disabled={loading}
          >
            Wyślij kod ponownie
          </button>
        </form>
      ) : (
      <form onSubmit={onSubmit} className="space-y-4">
        <FormInput
          id="reg_fn"
          label="Imię"
          required
          showValidState
          value={emailPasswordAuthEnabled ? emailForm.values.firstName : form.values.firstName}
          onChange={(e) =>
            emailPasswordAuthEnabled
              ? emailForm.setValue("firstName", e.target.value)
              : form.setValue("firstName", e.target.value)
          }
          onBlur={() =>
            emailPasswordAuthEnabled ? emailForm.setFieldTouched("firstName") : form.setFieldTouched("firstName")
          }
          error={emailPasswordAuthEnabled ? emailForm.errors.firstName : form.errors.firstName}
          placeholder="Imię"
          autoComplete="given-name"
        />
        <FormInput
          id="reg_ln"
          label="Nazwisko"
          required
          showValidState
          value={emailPasswordAuthEnabled ? emailForm.values.lastName : form.values.lastName}
          onChange={(e) =>
            emailPasswordAuthEnabled
              ? emailForm.setValue("lastName", e.target.value)
              : form.setValue("lastName", e.target.value)
          }
          onBlur={() =>
            emailPasswordAuthEnabled ? emailForm.setFieldTouched("lastName") : form.setFieldTouched("lastName")
          }
          error={emailPasswordAuthEnabled ? emailForm.errors.lastName : form.errors.lastName}
          placeholder="Nazwisko"
          autoComplete="family-name"
        />
        <PlayerAliasPicker
          label="Piłkarz (awatar)"
          required
          value={emailPasswordAuthEnabled ? emailForm.values.zawodnik : form.values.zawodnik}
          onChange={(v) =>
            emailPasswordAuthEnabled ? emailForm.setValue("zawodnik", v) : form.setValue("zawodnik", v)
          }
          onBlur={() =>
            emailPasswordAuthEnabled ? emailForm.setFieldTouched("zawodnik") : form.setFieldTouched("zawodnik")
          }
          error={emailPasswordAuthEnabled ? emailForm.errors.zawodnik : form.errors.zawodnik}
        />
        {emailPasswordAuthEnabled ? (
          <>
            <FormInput
              id="reg_email"
              label="Adres e-mail"
              required
              type="email"
              autoComplete="email"
              value={emailForm.values.email}
              onChange={(e) => emailForm.setValue("email", e.target.value)}
              onBlur={() => emailForm.setFieldTouched("email")}
              error={emailForm.errors.email}
              hint="Na ten adres wyślemy kod uwierzytelniający."
            />
            <FormInput
              id="reg_password"
              label="Hasło (min. 8 znaków)"
              required
              type="password"
              autoComplete="new-password"
              value={emailForm.values.password}
              onChange={(e) => emailForm.setValue("password", e.target.value)}
              onBlur={() => emailForm.setFieldTouched("password")}
              error={emailForm.errors.password}
            />
            <FormInput
              id="reg_password2"
              label="Powtórz hasło"
              required
              type="password"
              autoComplete="new-password"
              value={emailForm.values.passwordConfirm}
              onChange={(e) => emailForm.setValue("passwordConfirm", e.target.value)}
              onBlur={() => emailForm.setFieldTouched("passwordConfirm")}
              error={emailForm.errors.passwordConfirm}
            />
          </>
        ) : (
          <>
        <FormInput
          id="reg_pin"
          label="PIN (4–6 cyfr)"
          required
          showValidState
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          minLength={4}
          maxLength={6}
          value={form.values.pin}
          onChange={(e) => form.setValue("pin", e.target.value.replace(/\D/g, "").slice(0, 6))}
          onBlur={() => form.setFieldTouched("pin")}
          error={form.errors.pin}
          placeholder="4–6 cyfr"
          autoComplete="new-password"
          hint="Unikaj oczywistych sekwencji (np. 1234). Logowanie wyłącznie imieniem, nazwiskiem i PIN-em."
        />
        <FormInput
          id="reg_pin2"
          label="Powtórz PIN"
          required
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          minLength={4}
          maxLength={6}
          value={form.values.pinConfirm}
          onChange={(e) => form.setValue("pinConfirm", e.target.value.replace(/\D/g, "").slice(0, 6))}
          onBlur={() => form.setFieldTouched("pinConfirm")}
          error={form.errors.pinConfirm}
          placeholder="Powtórz PIN"
          autoComplete="new-password"
        />
        <div className="flex items-center justify-between gap-3 pt-1">
          <Label htmlFor="reg_auto_login" className="cursor-pointer font-normal leading-snug text-zinc-700 dark:text-zinc-300">
            Zaloguj mnie automatycznie po rejestracji
          </Label>
          <YesNoSwitch
            id="reg_auto_login"
            checked={autoLogin}
            onCheckedChange={setAutoLogin}
            tone="light"
            aria-label="Zaloguj mnie automatycznie po rejestracji"
          />
        </div>
          </>
        )}
        <Button type="submit" className="w-full rounded-full font-bold" variant={submitVariant} disabled={loading}>
          {loading ? "Tworzenie…" : emailPasswordAuthEnabled ? "Wyślij kod i załóż konto" : "Załóż konto"}
        </Button>
      </form>
      )}
    </>
  );
}
