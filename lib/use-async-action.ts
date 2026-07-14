"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Blokuje równoległe wywołania akcji asynchronicznej (np. wielokrotny klik „Zapisz”).
 * `run` zwraca `undefined`, gdy poprzednie wywołanie jeszcze trwa.
 */
export function useAsyncAction() {
  const inFlightRef = useRef(false);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async <T,>(action: () => Promise<T>): Promise<T | undefined> => {
    if (inFlightRef.current) return undefined;
    inFlightRef.current = true;
    setBusy(true);
    try {
      return await action();
    } finally {
      inFlightRef.current = false;
      setBusy(false);
    }
  }, []);

  return { busy, run };
}
