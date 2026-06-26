"use client";

import * as React from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Input, type InputProps } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea, type TextareaProps } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type FormFieldBaseProps = {
  id?: string;
  label: React.ReactNode;
  error?: string;
  hint?: React.ReactNode;
  required?: boolean;
  className?: string;
  /** Pokazuje zielony obrys gdy pole jest poprawne i dotknięte (bez błędu). */
  showValidState?: boolean;
  valid?: boolean;
};

function FieldShell({
  id,
  label,
  error,
  hint,
  required,
  className,
  showValidState,
  valid,
  children,
}: FormFieldBaseProps & { children: React.ReactNode }) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  const isValid = Boolean(showValidState && valid && !error);

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id} className="text-[0.8125rem] font-semibold tracking-tight text-emerald-950/90 dark:text-emerald-100/90">
          {label}
          {required ? <span className="ml-0.5 text-red-500" aria-hidden>*</span> : null}
        </Label>
        {isValid ? (
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
        ) : null}
      </div>
      {React.isValidElement(children)
        ? React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
            id,
            "aria-describedby": describedBy,
            "aria-invalid": error ? true : undefined,
            invalid: Boolean(error),
            valid: isValid,
          })
        : children}
      {hint && !error ? (
        <p id={hintId} className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="flex items-start gap-1.5 text-xs font-medium leading-relaxed text-red-600 dark:text-red-400">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}

export function FormField(props: FormFieldBaseProps & { children: React.ReactNode }) {
  return <FieldShell {...props} />;
}

export type FormInputProps = FormFieldBaseProps &
  Omit<InputProps, "id" | "invalid" | "valid"> & {
    inputClassName?: string;
  };

export const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, error, hint, required, className, inputClassName, showValidState, valid, id, ...inputProps }, ref) => {
    const autoId = React.useId();
    const fieldId = id ?? autoId;
    const isValid = Boolean(showValidState && valid && !error && inputProps.value);

    return (
      <FieldShell
        id={fieldId}
        label={label}
        error={error}
        hint={hint}
        required={required}
        className={className}
        showValidState={showValidState}
        valid={isValid}
      >
        <Input ref={ref} className={inputClassName} {...inputProps} />
      </FieldShell>
    );
  }
);
FormInput.displayName = "FormInput";

export type FormTextareaProps = FormFieldBaseProps &
  Omit<TextareaProps, "id" | "invalid" | "valid"> & {
    textareaClassName?: string;
  };

export const FormTextarea = React.forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  ({ label, error, hint, required, className, textareaClassName, showValidState, valid, id, ...textareaProps }, ref) => {
    const autoId = React.useId();
    const fieldId = id ?? autoId;
    const isValid = Boolean(showValidState && valid && !error && textareaProps.value);

    return (
      <FieldShell
        id={fieldId}
        label={label}
        error={error}
        hint={hint}
        required={required}
        className={className}
        showValidState={showValidState}
        valid={isValid}
      >
        <Textarea ref={ref} className={textareaClassName} {...textareaProps} />
      </FieldShell>
    );
  }
);
FormTextarea.displayName = "FormTextarea";

export type FormSelectFieldProps = FormFieldBaseProps & {
  children: React.ReactNode;
  selectClassName?: string;
};

export function FormSelectField({
  label,
  error,
  hint,
  required,
  className,
  showValidState,
  valid,
  id,
  children,
  selectClassName,
}: FormSelectFieldProps) {
  const autoId = React.useId();
  const fieldId = id ?? autoId;
  const isValid = Boolean(showValidState && valid && !error);

  return (
    <FieldShell
      id={fieldId}
      label={label}
      error={error}
      hint={hint}
      required={required}
      className={className}
      showValidState={showValidState}
      valid={isValid}
    >
      <div className={cn(selectClassName)} data-invalid={error ? true : undefined}>
        {React.isValidElement(children)
          ? React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
              id: fieldId,
              "aria-invalid": error ? true : undefined,
              invalid: Boolean(error),
            })
          : children}
      </div>
    </FieldShell>
  );
}
