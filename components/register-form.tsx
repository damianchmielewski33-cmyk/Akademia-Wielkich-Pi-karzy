"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { z } from "zod";
import {
  AuthGoalPreloader,
  AUTH_SUCCESS_PRELOADER_DELAY_MS,
} from "@/components/auth-goal-preloader";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/ui/form-field";
import { Label } from "@/components/ui/label";
import { PlayerAliasPicker } from "@/components/player-alias-picker";
import { formSchemas, useValidatedForm } from "@/lib/form-validation";
import { notifyPostLoginPromptsUpdated } from "@/lib/post-login-prompts";

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

export function RegisterForm({
  nextPath,
}: {
  nextPath?: string;
}) {
  const router = useRouter();
  const next = nextPath && nextPath.startsWith("/") ? nextPath : undefined;
  const [autoLogin, setAutoLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showGoalPreloader, setShowGoalPreloader] = useState(false);
  const [goalPreloaderLabel, setGoalPreloaderLabel] = useState<string | undefined>(undefined);

  const form = useValidatedForm({
    initialValues: { firstName: "", lastName: "", zawodnik: "", pin: "", pinConfirm: "" },
    schema: registerSchema,
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
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
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Błąd rejestracji");
        return;
      }
      if (data.logged_in) {
        setGoalPreloaderLabel("Gol! Witamy w akademii…");
        setShowGoalPreloader(true);
        toast.success("Konto utworzone — jesteś zalogowany");
        await new Promise((r) => setTimeout(r, AUTH_SUCCESS_PRELOADER_DELAY_MS));
        await router.push(next ?? "/");
        router.refresh();
        notifyPostLoginPromptsUpdated();
      } else {
        setGoalPreloaderLabel("Konto gotowe! Idziemy do logowania…");
        setShowGoalPreloader(true);
        toast.success("Konto utworzone — zaloguj się");
        await new Promise((r) => setTimeout(r, AUTH_SUCCESS_PRELOADER_DELAY_MS));
        const loginUrl = next ? `/login?next=${encodeURIComponent(next)}` : "/login";
        router.push(loginUrl);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {showGoalPreloader && <AuthGoalPreloader label={goalPreloaderLabel} />}
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <FormInput
          id="reg_fn"
          label="Imię"
          required
          showValidState
          value={form.values.firstName}
          onChange={(e) => form.setValue("firstName", e.target.value)}
          onBlur={() => form.setFieldTouched("firstName")}
          error={form.errors.firstName}
          placeholder="Imię"
          autoComplete="given-name"
        />
        <FormInput
          id="reg_ln"
          label="Nazwisko"
          required
          showValidState
          value={form.values.lastName}
          onChange={(e) => form.setValue("lastName", e.target.value)}
          onBlur={() => form.setFieldTouched("lastName")}
          error={form.errors.lastName}
          placeholder="Nazwisko"
          autoComplete="family-name"
        />
        <PlayerAliasPicker
          label="Piłkarz (awatar)"
          required
          value={form.values.zawodnik}
          onChange={(v) => form.setValue("zawodnik", v)}
          onBlur={() => form.setFieldTouched("zawodnik")}
          error={form.errors.zawodnik}
        />
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
        <div className="flex items-start gap-3 pt-1">
          <input
            id="reg_auto_login"
            type="checkbox"
            checked={autoLogin}
            onChange={(e) => setAutoLogin(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border border-zinc-300 text-emerald-600 focus:ring-2 focus:ring-emerald-500/30"
          />
          <Label htmlFor="reg_auto_login" className="cursor-pointer font-normal leading-snug text-zinc-700">
            Zaloguj mnie automatycznie po rejestracji
          </Label>
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Tworzenie…" : "Załóż konto"}
        </Button>
      </form>
    </>
  );
}
