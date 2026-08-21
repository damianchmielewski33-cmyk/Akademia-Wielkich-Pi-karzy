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
    void import("@/lib/haptics").then((m) => m.triggerHaptic("error"));
    return sonnerToast.error(toSportError(message), opts);
  },
  success(message: unknown, opts?: ToastOpts) {
    return sonnerToast.success(toSportSuccess(message), opts);
  },
  /** Sukces z aplauzem kibiców (zapis na mecz, gol itd.). */
  successCrowd(message: unknown, opts?: ToastOpts & { sound?: "applause" | "cheer" | "goal" | "whistle" }) {
    const sound = opts?.sound ?? "applause";
    void import("@/lib/stadium-sounds").then((m) => {
      if (sound === "goal") m.playStadiumGoal();
      else if (sound === "cheer") m.playStadiumCheer();
      else if (sound === "whistle") m.playStadiumWhistle();
      else m.playStadiumApplause();
    });
    const rest = { ...opts };
    delete rest.sound;
    return sonnerToast.success(toSportSuccess(message), rest);
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
