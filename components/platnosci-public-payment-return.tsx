"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "@/lib/app-toast";

/**
 * Powrót z HotPay na publicznym podsumowaniu (bez sesji logowania).
 * Odświeża listę sald; status finalny przychodzi z webhooka operatora.
 */
export function PlatnosciPublicPaymentReturn() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    const payment = searchParams.get("payment");
    const sessionId = searchParams.get("session_id");
    if (!payment) return;
    handled.current = true;

    const clearQuery = () => {
      const next = new URLSearchParams(searchParams.toString());
      next.delete("payment");
      next.delete("session_id");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      router.refresh();
    };

    if (payment === "error" || payment === "cancelled" || payment === "failure") {
      toast.error(payment === "cancelled" ? "Płatność została anulowana" : "Płatność nie powiodła się");
      clearQuery();
      return;
    }

    if (payment === "success") {
      toast.success("Wpłata zaksięgowana — saldo zaktualizuje się za chwilę");
      clearQuery();
      return;
    }

    // payment=pending (typowy powrót z bramki) + ewentualne session_id
    toast.info(
      sessionId
        ? "Przetwarzamy płatność — saldo zaktualizuje się automatycznie po potwierdzeniu operatora."
        : "Wróciłeś z płatności — odśwież stronę, jeśli saldo jeszcze się nie zmieniło."
    );
    clearQuery();

    // Krótkie odświeżenia, aż webhook zdąży zaksięgować.
    const timers = [2500, 6000, 12000].map((ms) =>
      window.setTimeout(() => router.refresh(), ms)
    );
    return () => {
      for (const t of timers) window.clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return null;
}
