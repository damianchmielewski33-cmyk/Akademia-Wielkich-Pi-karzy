"use client";

import type { ComponentType, ReactNode } from "react";
import { AdminCard } from "@/components/admin-ui";
import { useSiteMode } from "@/components/site-mode";
import { cn } from "@/lib/utils";

/** Wspólna powierzchnia karty V2 (profil, płatności, Android…). */
export const mpSectionCardClass =
  "overflow-hidden rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-6";

export const mpIconWrapClass =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--mp-teal)] text-white shadow-sm";

export const mpFieldClass =
  "w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-[var(--mp-teal)]/50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500";

export const mpInnerPanelClass =
  "rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/80";

export const mpEmptyClass =
  "rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-400";

/** @deprecated alias — używaj mpIconWrapClass */
export const paymentsIconWrapClass = mpIconWrapClass;
/** @deprecated alias — używaj mpFieldClass */
export const paymentsFieldClass = mpFieldClass;
/** @deprecated alias — używaj mpInnerPanelClass */
export const paymentsInnerPanelClass = mpInnerPanelClass;
/** @deprecated alias — używaj mpEmptyClass */
export const paymentsEmptyClass = mpEmptyClass;

const stadiumIconWrapClass =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 ring-2 ring-white/30";

export function MarketplaceSection({
  icon: Icon,
  title,
  description,
  children,
  className,
  headerExtra,
  id,
}: {
  icon?: ComponentType<{ className?: string; strokeWidth?: number; "aria-hidden"?: boolean }>;
  title?: string;
  description?: string;
  children?: ReactNode;
  className?: string;
  headerExtra?: ReactNode;
  id?: string;
}) {
  const hasHeader = Boolean(title || description || headerExtra || Icon);
  return (
    <section id={id} className={cn(mpSectionCardClass, className)}>
      {hasHeader ? (
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            {Icon ? (
              <span className={mpIconWrapClass}>
                <Icon className="h-4 w-4" strokeWidth={2.25} aria-hidden />
              </span>
            ) : null}
            <div className="min-w-0">
              {title ? (
                <h2 className="text-lg font-black tracking-tight text-zinc-950 dark:text-white sm:text-xl">
                  {title}
                </h2>
              ) : null}
              {description ? (
                <p className="mt-1 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{description}</p>
              ) : null}
            </div>
          </div>
          {headerExtra}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/** Karta płatności: V2 = jasna sekcja, V1 = AdminCard (stadion). */
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
      <AdminCard id={id} title={title} description={description} headerExtra={headerExtra} className={className}>
        {children}
      </AdminCard>
    );
  }

  return (
    <MarketplaceSection id={id} title={title} description={description} headerExtra={headerExtra} className={className}>
      {children}
    </MarketplaceSection>
  );
}

/** Ikona w nagłówku karty — teal (V2) albo pierścień na murawie (V1). */
export function ChromeIconBadge({
  icon: Icon,
  marketplace,
}: {
  icon: ComponentType<{ className?: string; strokeWidth?: number; "aria-hidden"?: boolean }>;
  marketplace: boolean;
}) {
  return (
    <div className={marketplace ? mpIconWrapClass : stadiumIconWrapClass}>
      <Icon className="h-5 w-5 text-white" strokeWidth={2.25} aria-hidden />
    </div>
  );
}
