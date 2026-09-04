import * as React from "react";
import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "awp-focus-ring group/button inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-transparent text-sm font-semibold transition-[color,background-color,box-shadow,transform] outline-none select-none active:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--mp-teal,#00c9b1)] text-white shadow-sm shadow-teal-950/15 hover:bg-[var(--mp-teal-dark,#00a394)] hover:shadow-md",
        outline:
          "border-zinc-200 bg-white text-zinc-900 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800",
        secondary:
          "bg-emerald-100 text-emerald-950 shadow-sm hover:bg-emerald-200 dark:bg-emerald-900/45 dark:text-emerald-100 dark:hover:bg-emerald-900/65",
        ghost:
          "text-zinc-900 hover:bg-emerald-100/80 dark:text-zinc-100 dark:hover:bg-emerald-900/40",
        destructive:
          "bg-red-600 text-white shadow-sm hover:bg-red-700",
        link: "text-[var(--mp-teal-dark)] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4",
        xs: "h-7 gap-1 rounded-lg px-2 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 px-3 text-[0.825rem]",
        lg: "h-11 px-6 text-[0.95rem]",
        icon: "h-10 w-10 px-0",
        "icon-xs": "h-6 w-6 rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "h-8 w-8",
        "icon-lg": "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
