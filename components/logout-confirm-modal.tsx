"use client";

import { LogOut } from "lucide-react";
import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function LogoutConfirmModal({ open, onOpenChange }: Props) {
  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      hideHeader
      title="Wyloguj się"
      className={cn(
        "gap-0 overflow-hidden rounded-3xl border-zinc-200 p-0 shadow-xl dark:border-zinc-700",
        "before:from-[var(--mp-teal)] before:via-[var(--mp-teal)] before:to-[var(--mp-teal-dark)]"
      )}
      contentClassName="gap-0 space-y-0 p-0 py-0"
    >
      <div className="space-y-5 px-5 pb-5 pt-6 sm:px-6 sm:pb-6">
        <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:gap-4 sm:text-left">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--mp-teal)] text-white shadow-sm">
            <LogOut className="h-5 w-5" strokeWidth={2.25} aria-hidden />
          </span>
          <div className="mt-4 min-w-0 sm:mt-0">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-[var(--mp-teal-dark)] dark:text-[var(--mp-teal)]">
              Konto
            </p>
            <h2 className="mt-1 text-xl font-black tracking-tight text-zinc-950 dark:text-white sm:text-2xl">
              Wyloguj się
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
              Zakończysz sesję na tym urządzeniu. Żeby wrócić, zaloguj się ponownie PIN-em.
            </p>
          </div>
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="rounded-full border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            onClick={() => onOpenChange(false)}
          >
            Anuluj
          </Button>
          <Button
            type="button"
            asChild
            className="rounded-full bg-[var(--mp-teal)] font-bold text-white shadow-sm hover:bg-[var(--mp-teal-dark)]"
          >
            <a href="/api/auth/logout">Wyloguj się</a>
          </Button>
        </div>
      </div>
    </AppModal>
  );
}
