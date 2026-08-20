"use client";

import type { ComponentType, ReactNode } from "react";
import { AdminCard } from "@/components/admin-ui";
import {
  MarketplaceSection,
  mpEmptyClass,
  mpFieldClass,
  mpIconWrapClass,
  mpInnerPanelClass,
} from "@/components/marketplace-section";
import { useSiteMode } from "@/components/site-mode";

export {
  MarketplaceSection,
  mpEmptyClass,
  mpFieldClass,
  mpIconWrapClass,
  mpInnerPanelClass,
  mpSectionCardClass,
} from "@/components/marketplace-section";

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
