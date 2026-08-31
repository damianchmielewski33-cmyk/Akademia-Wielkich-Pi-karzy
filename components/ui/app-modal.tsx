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

const modalMaxH =
  "max-h-[calc(100dvh-1.5rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] sm:max-h-[min(90dvh,calc(100dvh-2rem))]";

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
  /** Seed zdjęcia boiska w nagłówku V2. */
  headerPhotoSeed?: number;
  /** Nad innymi nakładkami (splash, preloader). */
  elevated?: boolean;
};

/**
 * Ujednolicony modal aplikacji — nagłówek, opis, treść i stopka w jednym miejscu.
 * Wysokość zawsze dopasowuje się do treści (bez pustego czarnego pola).
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
  headerPhotoSeed = 2,
  elevated = false,
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
        elevated={elevated}
        className={cn(
          sizeClasses[size],
          formHeader && "awp-modal-content--form gap-0 p-0 pt-0",
          // Przy długiej treści: max-h + przewijanie. Bez h-fit — na iOS fit-content + overflow-hidden
          // ucina listę (zapisani w terminarzu) zamiast pozwolić przewinąć.
          scrollable && !formHeader && cn(modalMaxH, "min-h-0 overflow-y-auto"),
          scrollable && formHeader && cn(modalMaxH, "min-h-0 overflow-hidden"),
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
              photoSeed={headerPhotoSeed}
            />
            <DialogHeader className="sr-only">
              <DialogTitle>{title}</DialogTitle>
              {description ? <DialogDescription>{description}</DialogDescription> : null}
            </DialogHeader>
          </>
        ) : (
          <DialogHeader className={cn("relative shrink-0", description ? undefined : "pb-0.5")}>
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
              "space-y-3",
              formHeader
                ? cn(
                    "min-h-0 overflow-y-auto overscroll-contain px-5 py-4 [-webkit-overflow-scrolling:touch]",
                    scrollable && "flex-1"
                  )
                : "py-0.5",
              contentClassName
            )}
          >
            {children}
          </div>
        ) : null}

        {footer ? (
          <DialogFooter
            className={cn(
              "shrink-0 gap-2 border-t border-zinc-200/90 bg-zinc-50/50 pt-3 dark:border-zinc-700/60 dark:bg-zinc-900/40 sm:justify-end",
              formHeader && "px-5 pb-4",
              !formHeader && "pb-0",
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
