"use client";

import type { ComponentType, ReactNode } from "react";
import {
  MarketplaceSection,
  mpEmptyClass,
  mpFieldClass,
  mpIconWrapClass,
  mpInnerPanelClass,
} from "@/components/marketplace-section";

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

/** Karta płatności — jasna sekcja marketplace. */
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
  return (
    <MarketplaceSection id={id} title={title} description={description} headerExtra={headerExtra} className={className}>
      {children}
    </MarketplaceSection>
  );
}

/** Ikona w nagłówku karty — teal. */
export function ChromeIconBadge({
  icon: Icon,
}: {
  icon: ComponentType<{ className?: string; strokeWidth?: number; "aria-hidden"?: boolean }>;
  /** @deprecated — zawsze styl marketplace */
  marketplace?: boolean;
}) {
  return (
    <div className={mpIconWrapClass}>
      <Icon className="h-5 w-5 text-white" strokeWidth={2.25} aria-hidden />
    </div>
  );
}
