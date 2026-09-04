"use client";

import { cn } from "@/lib/utils";
import type { AppRole } from "@/lib/auth-role";
import { ClipboardList, Dumbbell, Lock, Sparkles } from "lucide-react";

type Props = {
  role: AppRole;
  onSelectRole: (role: AppRole) => void;
  /** When true, trener card is visual-only and cannot be selected. */
  trainerLocked: boolean;
  /** Nagłówek nad kartami (np. logowanie vs rejestracja). */
  heading?: string;
};

export function RoleAuthCards({
  role,
  onSelectRole,
  trainerLocked,
  heading = "Logujesz się jako",
}: Props) {
  return (
    <div className="space-y-4">
      <p
        className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-[var(--mp-teal-dark)]"
        id="role-auth-heading"
      >
        {heading}
      </p>
      <div
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        role={trainerLocked ? "group" : "radiogroup"}
        aria-labelledby="role-auth-heading"
      >
        <button
          type="button"
          {...(!trainerLocked
            ? { role: "radio" as const, "aria-checked": role === "zawodnik" }
            : {})}
          onClick={() => onSelectRole("zawodnik")}
          className={cn(
            "awp-focus-ring group relative min-h-[168px] overflow-hidden rounded-2xl border px-5 py-6 text-left transition-all",
            role === "zawodnik"
              ? "border-[var(--mp-teal)] bg-teal-50/90 shadow-md shadow-teal-950/10 dark:border-teal-500 dark:bg-teal-950/40"
              : "border-zinc-200 bg-white hover:border-teal-200 hover:bg-teal-50/50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800",
          )}
        >
          <div className="relative flex flex-col gap-4">
            <div
              className={cn(
                "flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-2xl border shadow-sm",
                role === "zawodnik"
                  ? "border-transparent bg-[var(--mp-teal)] text-white"
                  : "border-zinc-200 bg-zinc-50 text-[var(--mp-teal-dark)] dark:border-zinc-700 dark:bg-zinc-800 dark:text-teal-300",
              )}
            >
              <Dumbbell className="h-10 w-10" strokeWidth={1.5} aria-hidden />
            </div>
            <div>
              <span className="font-heading text-xl font-semibold tracking-tight text-zinc-950 dark:text-white">
                Zawodnik
              </span>
              <p className="mt-1.5 text-sm leading-snug text-zinc-500 dark:text-zinc-400">
                Śledź trening, wartości odżywcze i postępy w jednym miejscu.
              </p>
            </div>
          </div>
          {role === "zawodnik" ? (
            <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-[var(--mp-teal)] px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-white">
              <Sparkles className="h-3 w-3" aria-hidden />
              Wybrane
            </span>
          ) : null}
        </button>

        {trainerLocked ? (
          <div
            className="relative min-h-[168px] cursor-not-allowed overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 px-5 py-6 text-left opacity-90 dark:border-zinc-800 dark:bg-zinc-900/60"
            role="note"
            aria-label="Konto trenera jest na razie niedostępne. Możliwe jest wyłącznie konto zawodnika."
          >
            <div className="relative flex flex-col gap-4">
              <div className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800">
                <ClipboardList className="h-10 w-10" strokeWidth={1.5} aria-hidden />
              </div>
              <div>
                <span className="font-heading text-xl font-semibold tracking-tight text-zinc-600 dark:text-zinc-300">
                  Trener
                </span>
                <p className="mt-1.5 text-sm leading-snug text-zinc-500 dark:text-zinc-400">
                  Planuj, analizuj i prowadź zawodników — interfejs pod Ciebie.
                </p>
                <p className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-snug text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
                  <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span>
                    Logika konta trenera powstanie w przyszłości — na razie możliwe jest
                    wyłącznie konto zawodnika.
                  </span>
                </p>
              </div>
            </div>
            <span className="absolute right-4 top-4 rounded-full border border-zinc-200 bg-white px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800">
              Wkrótce
            </span>
          </div>
        ) : (
          <button
            type="button"
            role="radio"
            aria-checked={role === "trener"}
            onClick={() => onSelectRole("trener")}
            className={cn(
              "awp-focus-ring group relative min-h-[168px] overflow-hidden rounded-2xl border px-5 py-6 text-left transition-all",
              role === "trener"
                ? "border-[var(--mp-teal)] bg-teal-50/90 shadow-md shadow-teal-950/10 dark:border-teal-500 dark:bg-teal-950/40"
                : "border-zinc-200 bg-white hover:border-teal-200 hover:bg-teal-50/50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800",
            )}
          >
            <div className="relative flex flex-col gap-4">
              <div
                className={cn(
                  "flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-2xl border shadow-sm",
                  role === "trener"
                    ? "border-transparent bg-[var(--mp-teal)] text-white"
                    : "border-zinc-200 bg-zinc-50 text-[var(--mp-teal-dark)] dark:border-zinc-700 dark:bg-zinc-800 dark:text-teal-300",
                )}
              >
                <ClipboardList className="h-10 w-10" strokeWidth={1.5} aria-hidden />
              </div>
              <div>
                <span className="font-heading text-xl font-semibold tracking-tight text-zinc-950 dark:text-white">
                  Trener
                </span>
                <p className="mt-1.5 text-sm leading-snug text-zinc-500 dark:text-zinc-400">
                  Planuj, analizuj i prowadź zawodników — interfejs pod Ciebie.
                </p>
              </div>
            </div>
            {role === "trener" ? (
              <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-[var(--mp-teal)] px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-white">
                <Sparkles className="h-3 w-3" aria-hidden />
                Wybrane
              </span>
            ) : null}
          </button>
        )}
      </div>
    </div>
  );
}
