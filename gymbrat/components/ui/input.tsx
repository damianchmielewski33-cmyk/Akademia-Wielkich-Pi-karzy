import * as React from "react";
import { Input as InputPrimitive } from "@base-ui/react/input";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "awp-focus-ring h-10 w-full min-w-0 rounded-xl border border-zinc-200 bg-zinc-50/90 px-3.5 py-2 text-base text-zinc-900 shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] transition-[border-color,box-shadow,background-color] outline-none placeholder:text-zinc-400 file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground focus-visible:border-[var(--mp-teal)]/70 focus-visible:bg-white focus-visible:shadow-[0_0_0_4px_rgba(0,201,177,0.14)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-55 aria-invalid:border-red-400 aria-invalid:shadow-[0_0_0_4px_rgba(239,68,68,0.12)] md:text-sm dark:border-zinc-600 dark:bg-zinc-900/70 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus-visible:border-teal-400/60 dark:focus-visible:bg-zinc-900",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
