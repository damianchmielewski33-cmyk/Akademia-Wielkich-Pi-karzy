"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-zinc-950/50 backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { elevated?: boolean }
>(({ className, children, elevated = false, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay className={cn(elevated && "z-[350]")} />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        // Mobile (iOS Safari): od góry + safe-area — wyśrodkowanie top/50% ucina długie listy (np. zapisani w terminarzu).
        // Desktop: klasyczne wyśrodkowanie.
        "fixed left-[50%] z-50 flex w-[calc(100%-1rem)] max-w-lg translate-x-[-50%] flex-col gap-3 overflow-x-hidden overscroll-contain rounded-2xl border border-zinc-200/90 bg-white p-4 pt-6 shadow-[0_24px_80px_-24px_rgba(26,45,90,0.45),0_8px_24px_-8px_rgba(15,23,42,0.12)] duration-300 [-webkit-overflow-scrolling:touch] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-[0.98] data-[state=open]:zoom-in-[0.98] data-[state=closed]:slide-out-to-left-1/2 data-[state=open]:slide-in-from-left-1/2 xs:w-[calc(100%-1.5rem)] xs:p-5 xs:pt-6 dark:border-zinc-700/70 dark:bg-zinc-900 dark:shadow-[0_24px_80px_-24px_rgba(0,0,0,0.65)]",
        "top-[max(0.75rem,env(safe-area-inset-top))] max-h-[calc(100dvh-1.5rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] translate-y-0 overflow-y-auto data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2",
        "sm:top-[50%] sm:max-h-[min(92dvh,calc(100dvh-1.5rem-env(safe-area-inset-top)-env(safe-area-inset-bottom)))] sm:translate-y-[-50%] sm:data-[state=closed]:slide-out-to-top-[48%] sm:data-[state=open]:slide-in-from-top-[48%]",
        "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:bg-gradient-to-r before:from-[var(--mp-teal)] before:via-teal-400 before:to-[var(--mp-teal-dark)]",
        "awp-modal-content [&>button]:absolute [&>button]:right-3 [&>button]:top-3 [&>button]:z-[100]",
        elevated && "z-[350]",
        // Style X na granatowym / foto nagłówku formularza — tylko gdy AppModal doda --form
        "[&.awp-modal-content--form>button]:top-4 [&.awp-modal-content--form>button]:border-white/25 [&.awp-modal-content--form>button]:bg-black/45 [&.awp-modal-content--form>button]:text-white [&.awp-modal-content--form>button]:shadow-md [&.awp-modal-content--form>button]:backdrop-blur-sm [&.awp-modal-content--form>button]:hover:border-white/40 [&.awp-modal-content--form>button]:hover:bg-black/60 [&.awp-modal-content--form>button]:hover:text-white",
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="awp-focus-ring relative z-[100] flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200/90 bg-white/95 text-zinc-600 shadow-sm transition-[color,background-color,border-color,box-shadow] hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 disabled:pointer-events-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:bg-zinc-700 dark:hover:text-zinc-50">
        <X className="h-4 w-4 shrink-0 opacity-80" />
        <span className="sr-only">Zamknij</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex shrink-0 flex-col gap-1.5 pr-8 text-left", className)} {...props} />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3 sm:space-x-0",
      className
    )}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-xl font-bold leading-snug tracking-tight text-[var(--mundial-navy,#1a2d5a)] dark:text-zinc-50",
      className
    )}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm leading-relaxed text-zinc-600 dark:text-zinc-400", className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
