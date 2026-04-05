"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Bell } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type MeUser = {
  id: number;
  notification_prompt_completed: number;
  email: string | null;
};

export function MatchNotificationPrompt() {
  const [user, setUser] = useState<MeUser | null | undefined>(undefined);
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/auth/me", { credentials: "include" });
      const data = (await r.json()) as { user: MeUser | null };
      if (!data.user) {
        setUser(null);
        return;
      }
      setUser(data.user);
      if (data.user.email) setEmail(data.user.email);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const open = Boolean(user && user.notification_prompt_completed === 0);

  const dismiss = async () => {
    setBusy(true);
    try {
      const r = await fetch("/api/user/notification-preferences", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dismiss" }),
      });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Nie udało się zapisać");
      }
      setUser((u) => (u ? { ...u, notification_prompt_completed: 1 } : u));
      toast.success("Możesz w każdej chwili zmienić zdanie — napisz do administratora.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Błąd zapisu");
    } finally {
      setBusy(false);
    }
  };

  const subscribe = async () => {
    if (!consent) {
      toast.error("Zaznacz zgodę, aby zapisać powiadomienia.");
      return;
    }
    const trimmed = email.trim();
    if (!trimmed) {
      toast.error("Podaj adres e-mail.");
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/user/notification-preferences", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "subscribe", email: trimmed, consent: true }),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string; details?: unknown };
      if (!r.ok) {
        throw new Error(j.error ?? "Nie udało się zapisać");
      }
      setUser((u) => (u ? { ...u, notification_prompt_completed: 1, email: trimmed } : u));
      toast.success("Zapisano — dostaniesz wiadomość, gdy pojawi się nowy termin.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Błąd zapisu");
    } finally {
      setBusy(false);
    }
  };

  if (user === undefined) return null;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-lg gap-0 border-emerald-200/80 p-0 pt-8 sm:max-w-lg [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="border-b border-emerald-100 bg-emerald-50/80 px-6 py-5 sm:px-8">
          <DialogHeader className="space-y-3 text-left">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-white shadow-sm">
                <Bell className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <DialogTitle className="text-xl text-emerald-950">Powiadomienia o meczach</DialogTitle>
                <DialogDescription className="mt-1.5 text-sm leading-relaxed text-zinc-600">
                  Czy chcesz otrzymywać powiadomienia o nowych terminach w terminarzu?
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="space-y-5 px-6 py-6 sm:px-8">
          <p className="text-sm leading-relaxed text-zinc-700">
            Jeśli tak, podaj adres e-mail i zaznacz zgodę poniżej. Po dodaniu nowego meczu przez administratora
            wyślemy Ci krótką wiadomość z datą, godziną, miejscem i linkiem do zapisu w aplikacji.
          </p>

          <div className="space-y-2">
            <Label htmlFor="notif-email">Adres e-mail</Label>
            <Input
              id="notif-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="np. jan@example.com"
              className="border-zinc-200"
              disabled={busy}
            />
          </div>

          <div className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50/80 p-4">
            <label className="flex cursor-pointer gap-3 text-sm leading-snug text-zinc-800">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                disabled={busy}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-zinc-300 text-emerald-700 focus:ring-emerald-600"
              />
              <span>
                Wyrażam dobrowolną zgodę na przetwarzanie podanego adresu e-mail w celu przesyłania informacji o
                nowych terminach meczów w ramach serwisu Akademii Wielkich Piłkarzy. Wiem, że mogę wycofać zgodę w
                dowolnym momencie (np. kontaktując się z administratorem strony); wycofanie zgody nie wpływa na
                zgodność z prawem przetwarzania przed jej wycofaniem.
              </span>
            </label>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 border-t border-zinc-100 bg-zinc-50/50 px-6 py-4 sm:flex-row sm:justify-end sm:px-8">
          <Button
            type="button"
            variant="outline"
            className="w-full border-zinc-200 sm:w-auto"
            onClick={() => void dismiss()}
            disabled={busy}
          >
            Nie, dziękuję
          </Button>
          <Button
            type="button"
            className="w-full bg-emerald-700 hover:bg-emerald-800 sm:w-auto"
            onClick={() => void subscribe()}
            disabled={busy}
          >
            Zapisz i włącz powiadomienia
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
