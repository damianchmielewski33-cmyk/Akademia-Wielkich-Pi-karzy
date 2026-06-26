import * as React from "react";
import { fieldControlClasses } from "@/lib/field-styles";
import { cn } from "@/lib/utils";

export type InputProps = React.ComponentProps<"input"> & {
  invalid?: boolean;
  valid?: boolean;
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, invalid, valid, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(fieldControlClasses({ invalid, valid, className }), "file:font-medium")}
        ref={ref}
        aria-invalid={invalid || undefined}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
