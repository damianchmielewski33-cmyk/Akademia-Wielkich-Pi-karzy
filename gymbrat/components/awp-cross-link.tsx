"use client";

import { ExternalLink, Trophy } from "lucide-react";
import { AWP_SITE_NAME, AWP_SITE_TAGLINE, getAwpCrossLink } from "@/lib/sister-sites";
import { cn } from "@/lib/utils";

function awpLinkTarget(): "_parent" | "_blank" {
  if (typeof window !== "undefined" && window.self !== window.top) return "_parent";
  return "_blank";
}

export function AwpCrossLink({
  className,
  variant = "nav",
  onClick,
}: {
  className?: string;
  variant?: "nav" | "sheet" | "banner" | "footer";
  onClick?: () => void;
}) {
  const href = getAwpCrossLink("/");
  const target = awpLinkTarget();

  if (variant === "banner" || variant === "footer") {
    return (
      <a
        href={href}
        target={target}
        rel={target === "_blank" ? "noopener noreferrer" : undefined}
        onClick={onClick}
        className={cn(
          "group flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-3 py-2.5 text-left shadow-sm transition-colors hover:border-teal-200 hover:bg-teal-50/70 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800",
          className,
        )}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--mp-teal)] text-white shadow-sm">
          <Trophy className="h-4 w-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-zinc-950 dark:text-white">{AWP_SITE_NAME}</span>
          <span className="block text-xs text-zinc-500 dark:text-zinc-400">{AWP_SITE_TAGLINE}</span>
        </span>
        <ExternalLink className="h-4 w-4 shrink-0 text-zinc-400 group-hover:text-[var(--mp-teal-dark)]" aria-hidden />
      </a>
    );
  }

  return (
    <a
      href={href}
      target={target}
      rel={target === "_blank" ? "noopener noreferrer" : undefined}
      onClick={onClick}
      className={cn(
        "awp-focus-ring inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-[var(--mp-teal-dark)] transition-colors hover:bg-teal-50 dark:text-teal-300 dark:hover:bg-teal-950/40",
        variant === "sheet" && "w-full border border-zinc-200 bg-white px-3 py-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-900",
        className,
      )}
    >
      <Trophy className="h-4 w-4 shrink-0 text-[var(--mp-teal)]" aria-hidden />
      <span className="min-w-0 flex-1 truncate">{AWP_SITE_NAME}</span>
      <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
    </a>
  );
}

export function AwpHeaderChip({ className }: { className?: string }) {
  const target = awpLinkTarget();
  return (
    <a
      href={getAwpCrossLink("/")}
      target={target}
      rel={target === "_blank" ? "noopener noreferrer" : undefined}
      title={AWP_SITE_TAGLINE}
      className={cn(
        "awp-focus-ring hidden items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-bold uppercase tracking-[0.08em] text-zinc-700 transition-colors hover:border-[var(--mp-teal)] hover:text-[var(--mp-teal-dark)] lg:inline-flex dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200",
        className,
      )}
    >
      <Trophy className="h-3.5 w-3.5 text-[var(--mp-teal)]" aria-hidden />
      AWP
      <ExternalLink className="h-3 w-3 opacity-50" aria-hidden />
    </a>
  );
}
