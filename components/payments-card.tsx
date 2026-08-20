"use client";

import type { ReactNode } from "react";
import { AdminCard } from "@/components/admin-ui";
import { useSiteMode } from "@/components/site-mode";
import { cn } from "@/lib/utils";

/** Jasna karta V2 na /platnosci; w V1 zostaje AdminCard (stadion). */
export function PaymentsCard({
  title,
  description,
  children,
  className,
  headerExtra,
  id,
}: {
  title?: string;
  description?: string;
  children?: ReactNode;
  className?: string;
  headerExtra?: ReactNode;
  id?: string;
}) {
  const { marketplaceEnabled } = useSiteMode();

  if (!marketplaceEnabled) {
    return (
      <AdminCard
        id={id}
        title={title}
        description={description}
        headerExtra={headerExtra}
        className={className}
      >
        {children}
      </AdminCard>
    );
  }

  return (
    <section
      id={id}
      className={cn(
        "overflow-hidden rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-6",
        className
      )}
    >
      {title || description || headerExtra ? (
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            {title ? (
              <h2 className="text-xl font-black tracking-tight text-zinc-950 dark:text-white sm:text-2xl">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400 sm:text-base">
                {description}
              </p>
            ) : null}
          </div>
          {headerExtra}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export const paymentsIconWrapClass =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--mp-teal)] text-white shadow-sm";

export const paymentsFieldClass =
  "w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-[var(--mp-teal)]/50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500";

export const paymentsInnerPanelClass =
  "rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/80";

export const paymentsEmptyClass =
  "rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-400";
