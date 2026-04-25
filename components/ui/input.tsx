import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "awp-focus-ring flex h-10 w-full rounded-xl border border-emerald-950/15 bg-white/90 px-3 py-2 text-sm text-zinc-900 shadow-sm shadow-emerald-950/5 ring-offset-transparent file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-zinc-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-100/10 dark:bg-zinc-900/70 dark:text-zinc-100 dark:placeholder:text-zinc-500",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
