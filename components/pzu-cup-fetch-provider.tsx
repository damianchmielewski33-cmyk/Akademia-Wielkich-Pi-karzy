"use client";

import { useEffect, type ReactNode } from "react";
import { REALM_HEADER, REALMS } from "@/lib/realm";

/** Wstrzykuje nagłówek realm do wywołań `/api/*` w sekcji PZU Cup. */
export function PzuCupFetchProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (url.startsWith("/api/")) {
        const headers = new Headers(init?.headers);
        headers.set(REALM_HEADER, REALMS.PZU_CUP);
        return originalFetch(input, { ...init, headers });
      }
      return originalFetch(input, init);
    };
    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  return <>{children}</>;
}
