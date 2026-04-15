"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlayerAliasPicker } from "@/components/player-alias-picker";

export type InitialPinFormProps = {
  initialFirstName?: string;
  initialLastName?: string;
  /** Prefiks id pól (dialog vs strona). */
  fieldIdPrefix?: string;
  onSuccess: () => void | Promise<void>;
  submitLabel?: string;
};

/**
 * Pierwsze ustawienie PIN-u: imię, nazwisko, piłkarz (potwierdzenie), PIN ×2.
 * Używane na /ustaw-pin i w modalu na stronie logowania.
 */
export function InitialPinForm({
  initialFirstName = "",
  initialLastName = "",
  fieldIdPrefix = "ip",
  onSuccess,
  submitLabel = "Ustaw PIN i zaloguj",
}: InitialPinFormProps) {
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [zawodnik, setZawodnik] = useState("");
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!firstName.trim() || !lastName.trim() || !zawodnik) {
      toast.error("Uzupełnij imię, nazwisko i wybierz piłkarza.");
      return;
    }
    if (pin !== pin2) {
      toast.error("PIN-y muszą być takie same.");
      return;
    }
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
          pin_confirm: pin2,
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

  const p = fieldIdPrefix;

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor={`${p}-fn`}>Imię</Label>
        <Input
          id={`${p}-fn`}
          required
          className="mt-1"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="Imię"
          autoComplete="given-name"
        />
      </div>
      <div>
        <Label htmlFor={`${p}-ln`}>Nazwisko</Label>
        <Input
          id={`${p}-ln`}
          required
          className="mt-1"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          placeholder="Nazwisko"
          autoComplete="family-name"
        />
      </div>
      <PlayerAliasPicker
        label="Piłkarz (potwierdzenie tożsamości)"
        required
        value={zawodnik}
        onChange={setZawodnik}
        helperText="Podaj ten sam pseudonim co przy rejestracji — możesz wyszukać lub wpisać ręcznie."
      />
      <div>
        <Label htmlFor={`${p}-pin`}>Nowy PIN (4–6 cyfr)</Label>
        <Input
          id={`${p}-pin`}
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          required
          minLength={4}
          maxLength={6}
          className="mt-1"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="4–6 cyfr"
          autoComplete="new-password"
        />
      </div>
      <div>
        <Label htmlFor={`${p}-pin2`}>Powtórz PIN</Label>
        <Input
          id={`${p}-pin2`}
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          required
          minLength={4}
          maxLength={6}
          className="mt-1"
          value={pin2}
          onChange={(e) => setPin2(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="Powtórz PIN"
          autoComplete="new-password"
        />
      </div>
      <p className="text-xs text-zinc-500">
        Unikaj oczywistych sekwencji (np. 1234) i samych powtórzeń jednej cyfry.
      </p>
      <Button type="button" className="w-full" disabled={saving} onClick={() => void submit()}>
        {saving ? "Zapisywanie…" : submitLabel}
      </Button>
    </div>
  );
}
