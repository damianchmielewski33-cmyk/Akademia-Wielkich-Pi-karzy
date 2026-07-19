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
      "fixed inset-0 z-50 bg-[var(--mundial-navy)]/55 backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-[calc(100%-1rem)] max-h-[min(92dvh,calc(100dvh-1.5rem-env(safe-area-inset-top)-env(safe-area-inset-bottom)))] max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 overflow-y-auto overflow-x-hidden rounded-2xl border border-zinc-200/90 bg-white p-4 pt-7 shadow-[0_24px_80px_-24px_rgba(26,45,90,0.45),0_8px_24px_-8px_rgba(15,23,42,0.12)] duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-[0.98] data-[state=open]:zoom-in-[0.98] data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] xs:w-[calc(100%-1.5rem)] xs:p-6 xs:pt-8 dark:border-zinc-700/70 dark:bg-zinc-900 dark:shadow-[0_24px_80px_-24px_rgba(0,0,0,0.65)]",
        "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:bg-gradient-to-r before:from-[var(--mundial-gold)] before:via-emerald-400 before:to-[var(--mundial-teal)]",
        "awp-modal-content [&>button]:absolute [&>button]:right-3.5 [&>button]:top-3.5",
        "awp-modal-content--form [&>button]:top-4 [&>button]:border-white/20 [&>button]:bg-white/10 [&>button]:text-white [&>button]:shadow-none [&>button]:hover:border-white/35 [&>button]:hover:bg-white/15 [&>button]:hover:text-white",
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="awp-focus-ring flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200/90 bg-white/95 text-zinc-600 shadow-sm transition-[color,background-color,border-color,box-shadow] hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 disabled:pointer-events-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:bg-zinc-700 dark:hover:text-zinc-50">
        <X className="h-4 w-4 shrink-0 opacity-80" />
        <span className="sr-only">Zamknij</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col gap-1.5 pr-8 text-left", className)} {...props} />
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
