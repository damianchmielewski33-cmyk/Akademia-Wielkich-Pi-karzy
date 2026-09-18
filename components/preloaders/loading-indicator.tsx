"use client";

import { cn } from "@/lib/utils";

type LoadingIndicatorProps = {
  label?: string;
  className?: string;
  variant?: "inline" | "button";
  size?: "sm" | "md" | "lg";
};

export function LoadingIndicator({
  label,
  className,
  variant = "inline",
  size = "md",
}: LoadingIndicatorProps) {
  const withLabel = variant !== "button" && Boolean(label);

  return (
    <span
      className={cn("awp-loader", `awp-loader--${variant}`, `awp-loader--${size}`, className)}
      {...(withLabel
        ? { role: "status", "aria-live": "polite", "aria-label": label }
        : { "aria-hidden": true })}
    >
      <span className="awp-loader__visual" aria-hidden>
        <span className="awp-loader__halo" />
        <span className="awp-loader__ring" />
        <span className="awp-loader__core" />
        <span className="awp-loader__orb awp-loader__orb--a" />
        <span className="awp-loader__orb awp-loader__orb--b" />
      </span>
      {withLabel ? <span className="awp-loader__label">{label}</span> : null}
    </span>
  );
}
