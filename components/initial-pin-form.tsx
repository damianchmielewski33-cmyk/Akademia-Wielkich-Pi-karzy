"use client";

import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/ui/form-field";
import { PlayerAliasPicker } from "@/components/player-alias-picker";
import { formSchemas, useValidatedForm } from "@/lib/form-validation";

const initialPinSchema = z
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

export type InitialPinFormProps = {
  initialFirstName?: string;
  initialLastName?: string;
  fieldIdPrefix?: string;
  onSuccess: () => void | Promise<void>;
  submitLabel?: string;
};

/**
 * Pierwsze ustawienie PIN-u: imię, nazwisko, piłkarz (potwierdzenie), PIN ×2.
 */
export function InitialPinForm({
  initialFirstName = "",
  initialLastName = "",
  fieldIdPrefix = "ip",
  onSuccess,
  submitLabel = "Ustaw PIN i zaloguj",
}: InitialPinFormProps) {
  const [saving, setSaving] = useState(false);
  const p = fieldIdPrefix;

  const form = useValidatedForm({
    initialValues: {
      firstName: initialFirstName,
      lastName: initialLastName,
      zawodnik: "",
      pin: "",
      pinConfirm: "",
    },
    schema: initialPinSchema,
  });

  async function submit() {
    if (!form.validate()) return;
    const { firstName, lastName, zawodnik, pin, pinConfirm } = form.values;
    setSaving(true);
    try {
      const res = await fetch("/api/auth/set-initial-pin", {
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
        toast.error(typeof data.error === "string" ? data.error : "Nie udało się ustawić PIN-u");
        return;
      }
      await onSuccess();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <FormInput
        id={`${p}-fn`}
        label="Imię"
        required
        value={form.values.firstName}
        onChange={(e) => form.setValue("firstName", e.target.value)}
        onBlur={() => form.setFieldTouched("firstName")}
        error={form.errors.firstName}
        placeholder="Imię"
        autoComplete="given-name"
      />
      <FormInput
        id={`${p}-ln`}
        label="Nazwisko"
        required
        value={form.values.lastName}
        onChange={(e) => form.setValue("lastName", e.target.value)}
        onBlur={() => form.setFieldTouched("lastName")}
        error={form.errors.lastName}
        placeholder="Nazwisko"
        autoComplete="family-name"
      />
      <PlayerAliasPicker
        label="Piłkarz (potwierdzenie tożsamości)"
        required
        value={form.values.zawodnik}
        onChange={(v) => form.setValue("zawodnik", v)}
        onBlur={() => form.setFieldTouched("zawodnik")}
        error={form.errors.zawodnik}
        helperText="Podaj ten sam pseudonim co przy rejestracji — możesz wyszukać lub wpisać ręcznie."
      />
      <FormInput
        id={`${p}-pin`}
        label="Nowy PIN (4–6 cyfr)"
        required
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
        hint="Unikaj oczywistych sekwencji (np. 1234) i samych powtórzeń jednej cyfry."
      />
      <FormInput
        id={`${p}-pin2`}
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
      <Button type="button" className="w-full" disabled={saving} onClick={() => void submit()}>
        {saving ? "Zapisywanie…" : submitLabel}
      </Button>
    </div>
  );
}
