import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "awp-focus-ring inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-emerald-600 text-white shadow-sm shadow-emerald-950/15 hover:bg-emerald-600/85",
        secondary:
          "border-transparent bg-emerald-100 text-emerald-900 hover:bg-emerald-200 dark:bg-emerald-900/45 dark:text-emerald-100 dark:hover:bg-emerald-900/65",
        outline:
          "border-emerald-200/90 bg-white/70 text-emerald-950 dark:border-emerald-800/70 dark:bg-zinc-900/55 dark:text-emerald-100",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
