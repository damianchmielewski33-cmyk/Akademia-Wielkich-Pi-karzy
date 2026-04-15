"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AuthGoalPreloader,
  AUTH_SUCCESS_PRELOADER_DELAY_MS,
} from "@/components/auth-goal-preloader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlayerAliasPicker } from "@/components/player-alias-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { isWeakPin, WEAK_PIN_MESSAGE } from "@/lib/pin-policy";
import { notifyPostLoginPromptsUpdated } from "@/lib/post-login-prompts";

export function LoginForm({
  nextPath,
  embedMode,
  onAuthenticated,
}: {
  nextPath: string;
  /** Pola logowania w modalu — bez pełnoekranowego preloadera i bez linków pomocniczych pod formularzem. */
  embedMode?: boolean;
  /** Po udanym logowaniu / ustawieniu PIN-u zamiast `router.push(next)`. */
  onAuthenticated?: () => void;
}) {
  const router = useRouter();
  const next = nextPath || "/";
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [pin, setPin] = useState("");
  /** Zaznaczone = długa sesja bez wylogowania po bezczynności (JWT `rememberMe`). */
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showGoalPreloader, setShowGoalPreloader] = useState(false);

  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotDoneOpen, setForgotDoneOpen] = useState(false);
  const [ffn, setFfn] = useState("");
  const [fln, setFln] = useState("");
  const [fzaw, setFzaw] = useState("");
  const [fpin, setFpin] = useState("");
  const [fpin2, setFpin2] = useState("");
  const [forgotSaving, setForgotSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
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
    if (!ffn.trim() || !fln.trim() || !fzaw) {
      toast.error("Uzupełnij imię, nazwisko i wybierz piłkarza.");
      return;
    }
    if (fpin !== fpin2) {
      toast.error("PIN-y muszą być takie same.");
      return;
    }
    if (isWeakPin(fpin)) {
      toast.error(WEAK_PIN_MESSAGE);
      return;
    }
    setForgotSaving(true);
    try {
      const res = await fetch("/api/auth/forgot-pin-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: ffn.trim(),
          last_name: fln.trim(),
          zawodnik: fzaw,
          pin: fpin,
          pin_confirm: fpin2,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Nie udało się zapisać prośby");
        return;
      }
      setForgotOpen(false);
      setFpin("");
      setFpin2("");
      setForgotDoneOpen(true);
    } finally {
      setForgotSaving(false);
    }
  }

  return (
    <>
      {showGoalPreloader && <AuthGoalPreloader label="Czas coś pokopać" />}
      <form onSubmit={onSubmit} className={embedMode ? "space-y-4" : "mt-8 space-y-4"}>
        <div>
          <Label htmlFor="first_name">Imię</Label>
          <Input
            id="first_name"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Imię"
            className="mt-1"
            autoComplete="given-name"
          />
        </div>
        <div>
          <Label htmlFor="last_name">Nazwisko</Label>
          <Input
            id="last_name"
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Nazwisko"
            className="mt-1"
            autoComplete="family-name"
          />
        </div>
        <div>
          <Label htmlFor="pin">PIN (4–6 cyfr)</Label>
          <Input
            id="pin"
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            required
            minLength={4}
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="4–6 cyfr"
            className="mt-1"
          />
        </div>
        <div className="flex items-start gap-3 pt-0.5">
          <input
            id="login_remember"
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border border-zinc-300 text-emerald-600 focus:ring-2 focus:ring-emerald-500/30"
          />
          <Label htmlFor="login_remember" className="cursor-pointer font-normal leading-snug text-zinc-700">
            Nie wylogowuj mnie
          </Label>
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Logowanie…" : "Zaloguj się"}
        </Button>
      </form>

      {!embedMode && (
        <div className="mt-4 flex flex-col gap-2 border-t border-zinc-100 pt-4">
          <button
            type="button"
            className="text-center text-sm font-medium text-emerald-700 hover:underline"
            onClick={() => {
              setFfn(firstName.trim());
              setFln(lastName.trim());
              setFzaw("");
              setFpin("");
              setFpin2("");
              setForgotOpen(true);
            }}
          >
            Zapomniałem PIN-u
          </button>
        </div>
      )}

      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nowy PIN — zapomniałem poprzedniego</DialogTitle>
            <DialogDescription className="text-left text-zinc-600">
              Potwierdź tożsamość (imię, nazwisko i ten sam piłkarz co przy rejestracji), potem wpisz nowy PIN
              dwa razy. Administrator musi zatwierdzić zmianę w panelu — do tego czasu korzystasz ze strony jak
              osoba niezalogowana. Jeśli administrator odrzuci prośbę, nadal obowiązuje poprzedni PIN.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div>
              <Label htmlFor="fg-fn">Imię</Label>
              <Input id="fg-fn" className="mt-1" value={ffn} onChange={(e) => setFfn(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="fg-ln">Nazwisko</Label>
              <Input id="fg-ln" className="mt-1" value={fln} onChange={(e) => setFln(e.target.value)} />
            </div>
            <PlayerAliasPicker
              label="Piłkarz"
              value={fzaw}
              onChange={setFzaw}
              helperText="Ten sam pseudonim co przy rejestracji — wyszukaj lub wpisz ręcznie."
            />
            <div>
              <Label htmlFor="fg-pin">Nowy PIN (4–6 cyfr)</Label>
              <Input
                id="fg-pin"
                type="password"
                inputMode="numeric"
                className="mt-1"
                autoComplete="new-password"
                minLength={4}
                maxLength={6}
                value={fpin}
                onChange={(e) => setFpin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="4–6 cyfr"
              />
            </div>
            <div>
              <Label htmlFor="fg-pin2">Powtórz nowy PIN</Label>
              <Input
                id="fg-pin2"
                type="password"
                inputMode="numeric"
                className="mt-1"
                autoComplete="new-password"
                minLength={4}
                maxLength={6}
                value={fpin2}
                onChange={(e) => setFpin2(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="Powtórz PIN"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setForgotOpen(false)}>
              Anuluj
            </Button>
            <Button type="button" disabled={forgotSaving} onClick={() => void submitForgotPin()}>
              {forgotSaving ? "Zapisywanie…" : "Nadaj PIN i wyślij"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={forgotDoneOpen} onOpenChange={setForgotDoneOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Oczekiwanie na administratora</DialogTitle>
            <DialogDescription className="text-left text-zinc-600">
              Twoja propozycja nowego PIN-u została zapisana. <strong>Administrator musi ją zatwierdzić</strong> w
              panelu — dopiero wtedy obowiązuje nowy PIN (zalogujesz się nim jak dotychczas). Do czasu decyzji
              masz dostęp tak jak osoba niezalogowana. Jeśli administrator odrzuci zmianę, nadal używasz
              poprzedniego PIN-u.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" onClick={() => setForgotDoneOpen(false)}>
              Rozumiem
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </>

  );

}

