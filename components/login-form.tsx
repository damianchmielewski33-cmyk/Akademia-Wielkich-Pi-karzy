"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { z } from "zod";
import {
  AuthGoalPreloader,
  AUTH_SUCCESS_PRELOADER_DELAY_MS,
} from "@/components/auth-goal-preloader";
import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/ui/form-field";
import { Label } from "@/components/ui/label";
import { PlayerAliasPicker } from "@/components/player-alias-picker";
import { formSchemas, useValidatedForm } from "@/lib/form-validation";
import { notifyPostLoginPromptsUpdated } from "@/lib/post-login-prompts";

const loginSchema = z.object({
  firstName: formSchemas.requiredName("Imię"),
  lastName: formSchemas.requiredName("Nazwisko"),
  pin: formSchemas.pin,
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

import { REALMS, type Realm } from "@/lib/realm";

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
  const router = useRouter();
  const next = nextPath || "/";
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showGoalPreloader, setShowGoalPreloader] = useState(false);

  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotDoneOpen, setForgotDoneOpen] = useState(false);
  const [forgotSaving, setForgotSaving] = useState(false);

  const loginForm = useValidatedForm({
    initialValues: { firstName: "", lastName: "", pin: "" },
    schema: loginSchema,
  });

  const forgotForm = useValidatedForm({
    initialValues: { firstName: "", lastName: "", zawodnik: "", pin: "", pinConfirm: "" },
    schema: forgotSchema,
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!loginForm.validate()) return;
    const { firstName, lastName, pin } = loginForm.values;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          pin,
          remember_me: rememberMe,
          realm,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        code?: string;
        pin_change_pending?: number;
      };
      if (res.status === 403 && data.code === "NEEDS_INITIAL_PIN") {
        toast.info("Konto wymaga pierwszego ustawienia PIN-u — przekierowujemy na stronę ustawiania PIN-u.");
        const q = new URLSearchParams();
        if (firstName.trim()) q.set("fn", firstName.trim());
        if (lastName.trim()) q.set("ln", lastName.trim());
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
      <form onSubmit={onSubmit} className={embedMode ? "space-y-4" : "mt-8 space-y-4"}>
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
        <div className="flex items-start gap-3 pt-0.5">
          <input
            id="login_remember"
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border border-zinc-300 text-emerald-600 focus:ring-2 focus:ring-emerald-500/30"
          />
          <Label htmlFor="login_remember" className="cursor-pointer font-normal leading-snug text-zinc-600 dark:text-zinc-400">
            Nie wylogowuj mnie
          </Label>
        </div>
        <Button type="submit" className="w-full" variant="pitch" disabled={loading}>
          {loading ? "Logowanie…" : "Zaloguj się"}
        </Button>
      </form>

      {!embedMode && (
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
