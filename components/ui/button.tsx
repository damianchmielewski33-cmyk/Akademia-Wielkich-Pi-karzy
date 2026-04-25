import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "awp-focus-ring inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-[color,background-color,box-shadow,transform] active:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-emerald-600 text-white shadow-sm shadow-emerald-950/20 hover:bg-emerald-700 hover:shadow-md dark:bg-emerald-500 dark:hover:bg-emerald-400",
        destructive: "bg-red-600 text-white shadow-sm shadow-red-950/20 hover:bg-red-700 hover:shadow-md",
        outline:
          "border border-emerald-200/90 bg-white/90 text-emerald-950 shadow-sm hover:bg-emerald-50 dark:border-emerald-800/70 dark:bg-zinc-900/70 dark:text-emerald-100 dark:hover:bg-zinc-800/80",
        secondary:
          "bg-emerald-100 text-emerald-950 shadow-sm hover:bg-emerald-200 dark:bg-emerald-900/45 dark:text-emerald-100 dark:hover:bg-emerald-900/65",
        ghost:
          "text-zinc-900 hover:bg-emerald-100/80 dark:text-zinc-100 dark:hover:bg-emerald-900/40",
        link: "text-emerald-700 underline-offset-4 hover:underline dark:text-emerald-400 dark:hover:text-emerald-300",

        /* Stadionowe warianty do używania na murawie/hero */
        stadium:
          "border border-white/35 bg-white/14 text-white shadow-[0_10px_30px_-14px_rgba(0,0,0,0.55)] backdrop-blur-md hover:bg-white/20 hover:shadow-[0_14px_40px_-16px_rgba(0,0,0,0.6)] dark:border-white/18 dark:bg-white/10 dark:hover:bg-white/14",
        pitch:
          "bg-emerald-100 text-emerald-950 shadow-md shadow-emerald-950/20 hover:bg-white dark:bg-emerald-800/90 dark:text-emerald-50 dark:hover:bg-emerald-700/90",
        gold:
          "bg-amber-300 text-amber-950 shadow-md shadow-amber-950/25 hover:bg-amber-200 dark:bg-amber-300/90 dark:hover:bg-amber-200/95",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-9 px-3 text-[0.825rem]",
        lg: "h-11 px-6 text-[0.95rem]",
        icon: "h-10 w-10 px-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
