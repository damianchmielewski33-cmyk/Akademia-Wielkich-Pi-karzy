"use client";

import { useEffect, useState } from "react";

/** Nie pokazuj loadera, jeśli odpowiedź wróci szybciej niż ten próg. */
export const PRELOADER_SHOW_DELAY_MS = 280;

/** Minimalny czas widoczności dopiero po faktycznym pokazaniu (unikamy migotania). */
export const PRELOADER_MIN_VISIBLE_MS = 180;

/**
 * Pokazuje dzieci dopiero po `delayMs` ciągłego `active`.
 * Przy szybkiej odpowiedzi nic nie widać.
 */
export function useDelayedVisible(active: boolean, delayMs = PRELOADER_SHOW_DELAY_MS): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!active) {
      setVisible(false);
      return;
    }
    const id = window.setTimeout(() => setVisible(true), delayMs);
    return () => window.clearTimeout(id);
  }, [active, delayMs]);

  return visible;
}
