"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type AdminRowActionItem = {
  label: string;
  onClick: () => void;
  /** Wyróżnienie destrukcyjne (Usuń / Anuluj). */
  destructive?: boolean;
  disabled?: boolean;
};

type AdminRowActionsProps = {
  /** 1–2 widoczne akcje główne. */
  primary?: ReactNode;
  /** Pozycje w menu ⋯. */
  items?: AdminRowActionItem[];
  /** Osobna grupa niebezpieczna na dole menu. */
  dangerItems?: AdminRowActionItem[];
  className?: string;
  align?: "end" | "start";
};

/**
 * Kolumna Akcje: widoczne primary + overflow menu (bez dodatkowego UI kit).
 */
export function AdminRowActions({
  primary,
  items = [],
  dangerItems = [],
  className,
  align = "end",
}: AdminRowActionsProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const menuId = useId();
  const hasMenu = items.length > 0 || dangerItems.length > 0;

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className={cn("relative inline-flex flex-wrap items-center justify-end gap-1.5", className)}
    >
      {primary}
      {hasMenu ? (
        <>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 w-8 shrink-0 border-zinc-300 bg-white px-0 text-zinc-800 hover:bg-zinc-50 dark:border-white/25 dark:bg-black/10 dark:text-white dark:hover:bg-white/15"
            aria-expanded={open}
            aria-haspopup="menu"
            aria-controls={menuId}
            aria-label="Więcej akcji"
            onClick={() => setOpen((v) => !v)}
          >
            <MoreHorizontal className="h-4 w-4" aria-hidden />
          </Button>
          {open ? (
            <div
              id={menuId}
              role="menu"
              className={cn(
                "absolute top-full z-40 mt-1 min-w-[11rem] overflow-hidden rounded-xl border border-white/20 bg-zinc-950/95 py-1 shadow-xl backdrop-blur-md",
                align === "end" ? "right-0" : "left-0"
              )}
            >
              {items.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  className={cn(
                    "flex w-full px-3 py-2 text-left text-sm text-emerald-50 transition-colors hover:bg-white/10 disabled:opacity-40",
                    item.destructive && "text-red-200 hover:bg-red-950/50"
                  )}
                  onClick={() => {
                    setOpen(false);
                    item.onClick();
                  }}
                >
                  {item.label}
                </button>
              ))}
              {dangerItems.length > 0 && items.length > 0 ? (
                <div className="my-1 border-t border-white/15" role="separator" />
              ) : null}
              {dangerItems.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  className="flex w-full px-3 py-2 text-left text-sm text-red-200 transition-colors hover:bg-red-950/50 disabled:opacity-40"
                  onClick={() => {
                    setOpen(false);
                    item.onClick();
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

/** Chipy filtrów / mini-zakładek w panelu admina. */
export function AdminFilterChips({
  options,
  value,
  onChange,
  className,
  "aria-label": ariaLabel = "Filtr",
}: {
  options: readonly { id: string; label: string; count?: number }[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <div
      className={cn("mb-4 flex flex-wrap gap-1.5", className)}
      role="tablist"
      aria-label={ariaLabel}
    >
      {options.map((opt) => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.id)}
            className={cn(
              "rounded-lg border px-3 py-2 text-xs font-semibold transition-colors sm:py-1.5",
              active
                ? "border-[var(--mp-teal)]/45 bg-[var(--mp-teal)]/15 text-[var(--mp-teal-dark)] dark:border-emerald-400/50 dark:bg-emerald-500/25 dark:text-white"
                : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100 dark:border-white/20 dark:bg-black/10 dark:text-emerald-100/80 dark:hover:bg-white/10 dark:hover:text-white"
            )}
          >
            {opt.label}
            {opt.count != null ? (
              <span className="ml-1.5 tabular-nums opacity-70">({opt.count})</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
