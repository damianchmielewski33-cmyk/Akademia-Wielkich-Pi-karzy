"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ModalFormHeader } from "@/components/ui/modal-shared";
import { cn } from "@/lib/utils";

const sizeClasses = {
  sm: "sm:max-w-md",
  md: "sm:max-w-lg",
  lg: "sm:max-w-xl",
  xl: "sm:max-w-3xl",
  full: "sm:max-w-[min(96vw,56rem)]",
} as const;

export type AppModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  /** Ikona w nagłówku formularza (Mundial). */
  icon?: React.ReactNode;
  /** Etykieta nad tytułem przy nagłówku formularza. */
  headerKicker?: string;
  /** Domyślnie `md`. */
  size?: keyof typeof sizeClasses;
  className?: string;
  contentClassName?: string;
  footerClassName?: string;
  /** Przewijanie treści w modalu (np. długie formularze). */
  scrollable?: boolean;
  /** Blokuje zamknięcie kliknięciem poza modalem i klawiszem Escape. */
  preventDismiss?: boolean;
  /** Ukrywa przycisk X w rogu (np. wymuszony prompt). */
  hideCloseButton?: boolean;
  /** Ukrywa domyślny nagłówek — treść w `children` (np. ModalPromptHeader). */
  hideHeader?: boolean;
};

/**
 * Ujednolicony modal aplikacji — nagłówek, opis, treść i stopka w jednym miejscu.
 */
export function AppModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  icon,
  headerKicker,
  size = "md",
  className,
  contentClassName,
  footerClassName,
  scrollable = false,
  preventDismiss = false,
  hideCloseButton = false,
  hideHeader = false,
}: AppModalProps) {
  const formHeader = Boolean(icon) && !hideHeader;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (preventDismiss && !next) return;
        onOpenChange(next);
      }}
    >
      <DialogContent
        className={cn(
          sizeClasses[size],
          formHeader && "awp-modal-content--form gap-0 p-0 pt-0",
          scrollable && !formHeader && "max-h-[min(90dvh,calc(100dvh-2rem))] overflow-y-auto",
          scrollable && formHeader && "max-h-[min(90dvh,calc(100dvh-2rem))] grid-rows-[auto_1fr_auto] overflow-hidden",
          hideCloseButton && "[&>button]:hidden",
          className
        )}
        onPointerDownOutside={preventDismiss ? (e) => e.preventDefault() : undefined}
        onEscapeKeyDown={preventDismiss ? (e) => e.preventDefault() : undefined}
      >
        {hideHeader ? (
          <DialogHeader className="sr-only">
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
        ) : formHeader ? (
          <>
            <ModalFormHeader
              icon={icon}
              title={title}
              description={description}
              kicker={headerKicker ?? "Formularz"}
            />
            <DialogHeader className="sr-only">
              <DialogTitle>{title}</DialogTitle>
              {description ? <DialogDescription>{description}</DialogDescription> : null}
            </DialogHeader>
          </>
        ) : (
          <DialogHeader className={cn("relative", description ? undefined : "pb-0.5")}>
            <DialogTitle>{title}</DialogTitle>
            {description ? (
              typeof description === "string" ? (
                <DialogDescription>{description}</DialogDescription>
              ) : (
                <DialogDescription asChild>{description}</DialogDescription>
              )
            ) : null}
          </DialogHeader>
        )}

        {children ? (
          <div
            className={cn(
              "space-y-4",
              formHeader ? "overflow-y-auto px-6 py-5" : "py-0.5",
              scrollable && formHeader && "min-h-0",
              contentClassName
            )}
          >
            {children}
          </div>
        ) : null}

        {footer ? (
          <DialogFooter
            className={cn(
              "gap-2 border-t border-zinc-200/90 bg-zinc-50/50 pt-4 dark:border-zinc-700/60 dark:bg-zinc-900/40 sm:justify-end",
              formHeader && "px-6 pb-6",
              footerClassName
            )}
          >
            {footer}
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
