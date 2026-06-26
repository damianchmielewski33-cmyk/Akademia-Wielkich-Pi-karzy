import * as React from "react";
import { fieldControlClasses } from "@/lib/field-styles";
import { cn } from "@/lib/utils";

export type TextareaProps = React.ComponentProps<"textarea"> & {
  invalid?: boolean;
  valid?: boolean;
};

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, invalid, valid, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          fieldControlClasses({ invalid, valid, height: "min-h-[5.5rem] resize-y", className })
        )}
        ref={ref}
        aria-invalid={invalid || undefined}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
