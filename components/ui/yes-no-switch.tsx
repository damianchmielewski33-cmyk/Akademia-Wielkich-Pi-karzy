"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type YesNoSwitchProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  className?: string;
  size?: "sm" | "md";
  tone?: "light" | "admin" | "pitch";
  "aria-label"?: string;
};

const toneStyles = {
  light: {
    active: "text-emerald-700 dark:text-emerald-300",
    muted: "text-zinc-400 dark:text-zinc-500",
    trackOff: "bg-zinc-200 dark:bg-zinc-700",
    trackOn: "bg-emerald-600 dark:bg-emerald-500",
    thumb: "bg-white shadow-sm ring-1 ring-black/5",
    focus: "focus-visible:ring-emerald-500/50",
  },
  admin: {
    active: "text-emerald-200",
    muted: "text-emerald-100/45",
    trackOff: "bg-black/30 ring-1 ring-white/15",
    trackOn: "bg-emerald-500 ring-1 ring-emerald-300/40",
    thumb: "bg-white shadow-md",
    focus: "focus-visible:ring-emerald-400/60",
  },
  pitch: {
    active: "text-emerald-950 dark:text-emerald-100",
    muted: "text-zinc-500 dark:text-zinc-400",
    trackOff: "bg-zinc-200 dark:bg-zinc-700",
    trackOn: "bg-emerald-700 dark:bg-emerald-500",
    thumb: "bg-white shadow-sm",
    focus: "focus-visible:ring-emerald-600/40",
  },
} as const;

export function YesNoSwitch({
  checked,
  onCheckedChange,
  disabled,
  id,
  className,
  size = "md",
  tone = "light",
  "aria-label": ariaLabel,
}: YesNoSwitchProps) {
  const t = toneStyles[tone];
  const trackSize = size === "sm" ? "h-6 w-11" : "h-7 w-[3.25rem]";
  const thumbSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const thumbShift = size === "sm" ? "translate-x-5" : "translate-x-[1.35rem]";
  const labelSize = size === "sm" ? "text-[10px]" : "text-xs";

  return (
    <div className={cn("inline-flex shrink-0 items-center gap-2", className)}>
      <span
        className={cn(
          labelSize,
          "min-w-[1.65rem] text-center font-bold uppercase tracking-wide",
          !checked ? t.active : t.muted
        )}
        aria-hidden
      >
        Nie
      </span>
      <button
        type="button"
        role="switch"
        id={id}
        aria-checked={checked}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          "relative inline-flex shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent disabled:cursor-not-allowed disabled:opacity-50",
          trackSize,
          checked ? t.trackOn : t.trackOff,
          t.focus
        )}
      >
        <span
          className={cn(
            "pointer-events-none absolute top-1/2 left-0.5 -translate-y-1/2 rounded-full transition-transform duration-200",
            thumbSize,
            t.thumb,
            checked ? thumbShift : "translate-x-0"
          )}
        />
      </button>
      <span
        className={cn(
          labelSize,
          "min-w-[1.65rem] text-center font-bold uppercase tracking-wide",
          checked ? t.active : t.muted
        )}
        aria-hidden
      >
        Tak
      </span>
    </div>
  );
}

type YesNoSwitchRowProps = {
  label: ReactNode;
  hint?: ReactNode;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
  tone?: YesNoSwitchProps["tone"];
  rowTone?: "admin" | "light";
  switchId?: string;
};

const rowToneStyles = {
  admin: {
    label: "text-white",
    hint: "pitch-muted",
  },
  light: {
    label: "text-zinc-900 dark:text-white",
    hint: "text-zinc-600 dark:text-zinc-400",
  },
} as const;

export function YesNoSwitchRow({
  label,
  hint,
  checked,
  disabled,
  onCheckedChange,
  className,
  tone = "admin",
  rowTone = "admin",
  switchId,
}: YesNoSwitchRowProps) {
  const row = rowToneStyles[rowTone];
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-4", className)}>
      <span className="min-w-0">
        <span className={cn("block text-sm font-semibold", row.label)}>{label}</span>
        {hint ? <span className={cn("mt-1 block text-sm", row.hint)}>{hint}</span> : null}
      </span>
      <YesNoSwitch
        id={switchId}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
        tone={tone}
      />
    </div>
  );
}
