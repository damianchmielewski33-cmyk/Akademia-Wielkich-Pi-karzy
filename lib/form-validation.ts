"use client";

import { useCallback, useMemo, useState } from "react";
import { z } from "zod";
import { isValidPinFormat, isWeakPin, WEAK_PIN_MESSAGE } from "@/lib/pin-policy";

/** Polskie komunikaty dla typowych pól formularza. */
export const formSchemas = {
  requiredName: (label = "To pole") =>
    z.string().trim().min(1, `${label} jest wymagane`).max(80, `${label} jest zbyt długie`),

  requiredText: (label = "To pole") =>
    z.string().trim().min(1, `${label} jest wymagane`),

  playerAlias: z
    .string()
    .trim()
    .min(2, "Pseudonim musi mieć co najmniej 2 znaki")
    .max(120, "Pseudonim jest zbyt długi"),

  pin: z
    .string()
    .trim()
    .refine(isValidPinFormat, "PIN musi mieć 4–6 cyfr")
    .refine((v) => !isWeakPin(v), WEAK_PIN_MESSAGE),

  matchDate: z.string().min(1, "Data jest wymagana"),

  matchTime: z.string().min(1, "Godzina jest wymagana"),

  matchLocation: z.string().trim().min(1, "Miejsce jest wymagane").max(200, "Miejsce jest zbyt długie"),

  maxSlots: z
    .coerce
    .number({ error: "Podaj liczbę miejsc" })
    .int("Liczba miejsc musi być całkowita")
    .min(1, "Liczba miejsc musi być większa niż 0")
    .max(99, "Maksymalnie 99 miejsc"),

  /** PIN do bramy na boisku — 4–6 cyfr (bez walidacji „słabego” PIN-u jak przy logowaniu). */
  gatePin: z
    .string()
    .trim()
    .refine(isValidPinFormat, "PIN do bramy musi mieć 4–6 cyfr"),

  urlOptional: z
    .string()
    .trim()
    .refine((v) => !v || /^https?:\/\/.+/i.test(v), "Podaj poprawny adres URL (http/https)"),

  email: z.string().trim().min(1, "Adres e-mail jest wymagany").email("Podaj poprawny adres e-mail"),
};

export function zodFieldErrors<T extends z.ZodType>(
  schema: T,
  values: unknown
): Partial<Record<string, string>> {
  const result = schema.safeParse(values);
  if (result.success) return {};
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !errors[key]) {
      errors[key] = issue.message;
    }
  }
  return errors;
}

export function firstZodError(schema: z.ZodType, values: unknown): string | null {
  const result = schema.safeParse(values);
  if (result.success) return null;
  return result.error.issues[0]?.message ?? "Nieprawidłowe dane";
}

type UseValidatedFormOptions<T extends Record<string, unknown>> = {
  initialValues: T;
  schema: z.ZodType<T>;
  /** Waliduj przy każdej zmianie pola (po pierwszym dotknięciu). */
  validateOnChange?: boolean;
};

export function useValidatedForm<T extends Record<string, unknown>>({
  initialValues,
  schema,
  validateOnChange = true,
}: UseValidatedFormOptions<T>) {
  const [values, setValues] = useState<T>(initialValues);
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);

  const errors = useMemo(() => {
    const all = zodFieldErrors(schema, values) as Partial<Record<keyof T, string>>;
    if (submitted) return all;
    const visible: Partial<Record<keyof T, string>> = {};
    for (const key of Object.keys(all) as (keyof T)[]) {
      if (touched[key]) visible[key] = all[key];
    }
    return visible;
  }, [schema, values, touched, submitted]);

  const setValue = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const setFieldTouched = useCallback((key: keyof T) => {
    setTouched((prev) => ({ ...prev, [key]: true }));
  }, []);

  const reset = useCallback(
    (next?: T) => {
      setValues(next ?? initialValues);
      setTouched({});
      setSubmitted(false);
    },
    [initialValues]
  );

  const validate = useCallback((): boolean => {
    setSubmitted(true);
    const all = zodFieldErrors(schema, values);
    return Object.keys(all).length === 0;
  }, [schema, values]);

  const getFieldProps = useCallback(
    <K extends keyof T>(key: K) => ({
      value: values[key],
      onChange: (value: T[K]) => {
        setValue(key, value);
        if (validateOnChange && (touched[key] || submitted)) {
          setFieldTouched(key);
        }
      },
      onBlur: () => setFieldTouched(key),
      error: errors[key],
    }),
    [values, errors, setValue, setFieldTouched, touched, submitted, validateOnChange]
  );

  return {
    values,
    errors,
    touched,
    submitted,
    setValue,
    setFieldTouched,
    setValues,
    reset,
    validate,
    getFieldProps,
    isValid: Object.keys(zodFieldErrors(schema, values)).length === 0,
  };
}
