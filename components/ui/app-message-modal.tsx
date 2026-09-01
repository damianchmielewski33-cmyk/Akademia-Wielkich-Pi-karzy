"use client";

import { useCallback, useState } from "react";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";
import { toSportError, toSportSuccess } from "@/lib/sport-copy";
import { cn } from "@/lib/utils";

export type AppMessageTone = "error" | "success" | "info";

export type AppMessageState = {
  open: boolean;
  tone: AppMessageTone;
  title: string;
  message: string;
};

const DEFAULT_TITLES: Record<AppMessageTone, string> = {
  error: "Nie udało się",
  success: "Gotowe",
  info: "Informacja",
};

/** Wyciąga czytelny komunikat z odpowiedzi API (string / Zod flatten / obiekt). */
export function extractApiErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === "string" && error.trim()) return error.trim();
  if (error && typeof error === "object") {
    const o = error as Record<string, unknown>;
    if (typeof o.message === "string" && o.message.trim()) return o.message.trim();
    if (typeof o.error === "string" && o.error.trim()) return o.error.trim();
    const formErrors = (o.formErrors as unknown[]) ?? [];
    if (Array.isArray(formErrors) && formErrors.length > 0) {
      return formErrors.map(String).filter(Boolean).join(" ");
    }
    const fieldErrors = o.fieldErrors as Record<string, unknown> | undefined;
    if (fieldErrors && typeof fieldErrors === "object") {
      const parts: string[] = [];
      for (const v of Object.values(fieldErrors)) {
        if (Array.isArray(v)) parts.push(...v.map(String));
        else if (typeof v === "string") parts.push(v);
      }
      if (parts.length) return parts.join(" ");
    }
  }
  return fallback;
}

type AppMessageModalProps = {
  state: AppMessageState;
  onOpenChange: (open: boolean) => void;
  okLabel?: string;
};

/**
 * Pop-up z komunikatem błędu / sukcesu / info (portfel, koszyk, przelewy…).
 */
export function AppMessageModal({ state, onOpenChange, okLabel = "OK" }: AppMessageModalProps) {
  const Icon =
    state.tone === "error" ? AlertTriangle : state.tone === "success" ? CheckCircle2 : Info;

  return (
    <AppModal
      open={state.open}
      onOpenChange={onOpenChange}
      size="sm"
      title={state.title}
      footer={
        <Button
          type="button"
          variant={state.tone === "error" ? "destructive" : "default"}
          className={state.tone !== "error" ? "rounded-full font-bold" : undefined}
          onClick={() => onOpenChange(false)}
        >
          {okLabel}
        </Button>
      }
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
            state.tone === "error" && "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-200",
            state.tone === "success" &&
              "bg-teal-100 text-[var(--mp-teal-dark)] dark:bg-teal-950/60 dark:text-teal-200",
            state.tone === "info" && "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-200"
          )}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <p className="pt-1.5 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">{state.message}</p>
      </div>
    </AppModal>
  );
}

const CLOSED: AppMessageState = {
  open: false,
  tone: "info",
  title: "",
  message: "",
};

export function useAppMessage() {
  const [state, setState] = useState<AppMessageState>(CLOSED);

  const close = useCallback(() => {
    setState((s) => ({ ...s, open: false }));
  }, []);

  const show = useCallback((tone: AppMessageTone, message: unknown, title?: string) => {
    const raw = typeof message === "string" ? message : extractApiErrorMessage(message, "Wystąpił problem.");
    const text =
      tone === "error" ? toSportError(raw) : tone === "success" ? toSportSuccess(raw) : raw;
    setState({
      open: true,
      tone,
      title: title ?? DEFAULT_TITLES[tone],
      message: text,
    });
  }, []);

  const showError = useCallback(
    (message: unknown, title?: string) => show("error", message, title),
    [show]
  );
  const showSuccess = useCallback(
    (message: unknown, title?: string) => show("success", message, title),
    [show]
  );
  const showInfo = useCallback(
    (message: unknown, title?: string) => show("info", message, title),
    [show]
  );

  return {
    messageState: state,
    setMessageOpen: (open: boolean) => {
      if (!open) close();
      else setState((s) => ({ ...s, open: true }));
    },
    showError,
    showSuccess,
    showInfo,
    MessageModal: (
      <AppMessageModal state={state} onOpenChange={(open) => (!open ? close() : undefined)} />
    ),
  };
}
