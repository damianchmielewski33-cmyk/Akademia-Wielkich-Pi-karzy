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
  /** Domyślnie `md`. */
  size?: keyof typeof sizeClasses;
  className?: string;
  contentClassName?: string;
  /** Przewijanie treści w modalu (np. długie formularze). */
  scrollable?: boolean;
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
  size = "md",
  className,
  contentClassName,
  scrollable = false,
}: AppModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "border-emerald-900/12",
          sizeClasses[size],
          scrollable && "max-h-[90dvh] overflow-y-auto",
          className
        )}
      >
        <DialogHeader className={cn(description ? undefined : "pb-0.5")}>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            typeof description === "string" ? (
              <DialogDescription className="text-left">{description}</DialogDescription>
            ) : (
              <DialogDescription asChild>{description}</DialogDescription>
            )
          ) : null}
        </DialogHeader>
        {children ? <div className={cn("space-y-4 py-0.5", contentClassName)}>{children}</div> : null}
        {footer ? <DialogFooter className="gap-2 border-t border-emerald-950/6 pt-4 dark:border-emerald-100/8 sm:justify-end">{footer}</DialogFooter> : null}
      </DialogContent>
    </Dialog>
  );
}
