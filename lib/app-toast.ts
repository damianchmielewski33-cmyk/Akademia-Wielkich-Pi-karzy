"use client";

import { toast as sonnerToast } from "sonner";
import { toSportError, toSportSuccess } from "@/lib/sport-copy";

type ToastOpts = Parameters<typeof sonnerToast.error>[1];

function sportMessage(message: unknown): string {
  if (typeof message === "string") return message;
  if (message == null) return "";
  return String(message);
}

/**
 * Toasty Akademii — błędy i sukcesy w sportowym tonie.
 * Używaj zamiast `import { toast } from "sonner"`.
 */
export const toast = {
  ...sonnerToast,
  error(message: unknown, opts?: ToastOpts) {
    return sonnerToast.error(toSportError(message), opts);
  },
  success(message: unknown, opts?: ToastOpts) {
    return sonnerToast.success(toSportSuccess(message), opts);
  },
  message(message: unknown, opts?: ToastOpts) {
    return sonnerToast.message(sportMessage(message), opts);
  },
  warning(message: unknown, opts?: ToastOpts) {
    return sonnerToast.warning(toSportError(message), opts);
  },
  info(message: unknown, opts?: ToastOpts) {
    return sonnerToast.info(sportMessage(message), opts);
  },
  loading(message: unknown, opts?: ToastOpts) {
    return sonnerToast.loading(sportMessage(message), opts);
  },
};
