"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { MapPin } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PARTICIPATION_SURVEY_QUESTION } from "@/lib/match-participation-survey";
import { notifyPostLoginPromptsUpdated } from "@/lib/post-login-prompts";

type MeUser = {
  id: number;
  pin_change_pending?: number;
};

export function MatchParticipationSurveyPrompt() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<MeUser | null | undefined>(undefined);
  const [pending, setPending] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [meRes, surveyRes] = await Promise.all([
        fetch("/api/auth/me", { credentials: "include" }),
        fetch("/api/user/match-participation-survey", { credentials: "include" }),
      ]);
      const meData = (await meRes.json()) as { user: MeUser | null };
      const surveyData = (await surveyRes.json()) as {
        pending?: boolean;
        surveyKey?: string;
        error?: string;
      };
      if (!meData.user) {
        setUser(null);
        setPending(false);
        return;
      }
      setUser(meData.user);
      if (surveyRes.ok && surveyData.pending === true) {
        setPending(true);
      } else {
        setPending(false);
      }
    } catch {
      setUser(null);
      setPending(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, pathname]);

  useEffect(() => {
    const onUp = () => void load();
    window.addEventListener("post-login-prompts-updated", onUp);
    return () => window.removeEventListener("post-login-prompts-updated", onUp);
  }, [load]);

  const submit = async (played: boolean) => {
    setBusy(true);
    try {
      const res = await fetch("/api/user/match-participation-survey", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ played }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(typeof j.error === "string" ? j.error : "Nie udało się zapisać");
      }
      setPending(false);
      notifyPostLoginPromptsUpdated();
      if (played) {
        router.push("/terminarz?statystyki_ankiety=1");
        router.refresh();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Błąd zapisu");
    } finally {
      setBusy(false);
    }
  };

  if (user === undefined) return null;
  if (!user || user.pin_change_pending) return null;
  if (!pending) return null;

  const open = true;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-lg gap-0 border-emerald-200/80 p-0 pt-8 sm:max-w-lg [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="border-b border-emerald-100 bg-emerald-50/80 px-6 py-5 dark:border-emerald-800/60 dark:bg-emerald-950/45 sm:px-8">
          <DialogHeader className="space-y-3 text-left">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-white shadow-sm">
                <MapPin className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <DialogTitle className="text-xl">Mecz 27.03</DialogTitle>
                <DialogDescription className="mt-1.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {PARTICIPATION_SURVEY_QUESTION}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="space-y-5 px-6 py-6 sm:px-8">
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            Odpowiedź zapisujemy jednorazowo. Jeśli wylogujesz się lub zamkniesz kartę bez wyboru Tak/Nie,
            zapytanie zobaczysz przy następnym logowaniu.
          </p>

          <div className="space-y-2">
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200" id="participation-switch-label">
              Czy grałeś? (przełącznik Tak / Nie)
            </p>
            <div
              className="grid grid-cols-2 gap-2 sm:gap-3"
              role="group"
              aria-labelledby="participation-switch-label"
            >
              <Button
                type="button"
                variant="outline"
                className="h-12 border-zinc-200 font-semibold dark:border-zinc-600"
                disabled={busy}
                onClick={() => void submit(false)}
              >
                Nie
              </Button>
              <Button
                type="button"
                className="h-12 bg-emerald-700 font-semibold hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                disabled={busy}
                onClick={() => void submit(true)}
              >
                Tak
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
