"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AuthGoalPreloader,
  AUTH_SUCCESS_PRELOADER_DELAY_MS,
} from "@/components/auth-goal-preloader";
import { isWeakPin, WEAK_PIN_MESSAGE } from "@/lib/pin-policy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function RegisterForm({
  availablePlayers,
  nextPath,
}: {
  availablePlayers: string[];
  /** Po udanej rejestracji (z auto-logowaniem) lub na stronę logowania z `next`. */
  nextPath?: string;
}) {
  const router = useRouter();
  const next = nextPath && nextPath.startsWith("/") ? nextPath : undefined;
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [zawodnik, setZawodnik] = useState("");
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [autoLogin, setAutoLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showGoalPreloader, setShowGoalPreloader] = useState(false);
  const [goalPreloaderLabel, setGoalPreloaderLabel] = useState<string | undefined>(undefined);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isWeakPin(pin)) {
      toast.error(WEAK_PIN_MESSAGE);
      return;
    }
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
        router.push(next ?? "/");
        router.refresh();
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
      <div>
        <Label htmlFor="reg_fn">Imię</Label>
        <Input
          id="reg_fn"
          required
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="Imię"
          className="mt-1"
          autoComplete="given-name"
        />
      </div>
      <div>
        <Label htmlFor="reg_ln">Nazwisko</Label>
        <Input
          id="reg_ln"
          required
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          placeholder="Nazwisko"
          className="mt-1"
          autoComplete="family-name"
        />
      </div>
      <div>
        <Label>Piłkarz (awatar)</Label>
        <Select required value={zawodnik} onValueChange={setZawodnik}>
          <SelectTrigger className="mt-1 w-full">
            <SelectValue placeholder="Wybierz piłkarza (jak przy pierwszym ustawieniu PIN-u)" />
          </SelectTrigger>
          <SelectContent>
            {availablePlayers.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="reg_pin">PIN (4–6 cyfr)</Label>
        <Input
          id="reg_pin"
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          required
          minLength={4}
          maxLength={6}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="4–6 cyfr"
          className="mt-1"
          autoComplete="new-password"
        />
        <p className="mt-1 text-xs text-zinc-500">
          Tym PIN-em logujesz się (imię, nazwisko, PIN). Unikaj sekwencji typu 1234 i samych powtórzeń jednej cyfry.
        </p>
      </div>
      <div>
        <Label htmlFor="reg_pin2">Powtórz PIN</Label>
        <Input
          id="reg_pin2"
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          required
          minLength={4}
          maxLength={6}
          value={pinConfirm}
          onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="Powtórz PIN"
          className="mt-1"
          autoComplete="new-password"
        />
      </div>
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
      <Button type="submit" className="w-full" disabled={loading || availablePlayers.length === 0}>
        {loading ? "Tworzenie…" : "Załóż konto"}
      </Button>
      {availablePlayers.length === 0 && (
        <p className="text-center text-sm text-red-600">Wszyscy piłkarze są już zajęci.</p>
      )}
    </form>
    </>
  );
}
