"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { formatWalletPln } from "@/components/player-wallet-panel";
import { toast } from "@/lib/app-toast";

type Options = {
  enabled?: boolean;
  onSettled?: () => void;
};

/**
 * Obsługa powrotu z HotPay (?payment=&session_id=) na dowolnej stronie.
 * Czyści query do ścieżki bazowej (bez parametrów płatności).
 */
export function useHotpayPaymentReturn(options: Options = {}) {
  const { enabled = true, onSettled } = options;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const handled = useRef(false);

  useEffect(() => {
    if (!enabled || handled.current) return;
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
    };

    async function handleReturn() {
      if (payment === "error" || payment === "cancelled" || payment === "failure") {
        toast.error(payment === "cancelled" ? "Płatność została anulowana" : "Płatność nie powiodła się");
        clearQuery();
        onSettled?.();
        return;
      }

      if (payment === "success") {
        toast.success("Wpłata zaksięgowana na portfelu");
        clearQuery();
        onSettled?.();
        return;
      }

      if (sessionId) {
        const toastId = toast.loading("Sprawdzamy status płatności…");

        const pollOnce = async (): Promise<"success" | "failure" | "cancelled" | "pending" | "error"> => {
          try {
            const res = await fetch(`/api/wallet/hotpay/status?session_id=${encodeURIComponent(sessionId)}`);
            const data = (await res.json().catch(() => null)) as {
              status?: string;
              error_message?: string | null;
              amount_pln?: number;
            } | null;
            if (!res.ok || !data?.status) return "error";
            if (data.status === "success") {
              toast.success(
                typeof data.amount_pln === "number"
                  ? `Wpłata ${formatWalletPln(data.amount_pln)} zaksięgowana na portfelu`
                  : "Wpłata zaksięgowana na portfelu",
                { id: toastId }
              );
              onSettled?.();
              return "success";
            }
            if (data.status === "failure" || data.status === "cancelled") {
              toast.error(
                data.error_message ||
                  (data.status === "cancelled"
                    ? "Płatność została anulowana"
                    : "Płatność została odrzucona"),
                { id: toastId }
              );
              return data.status;
            }
            return "pending";
          } catch {
            return "error";
          }
        };

        for (let i = 0; i < 25; i++) {
          const status = await pollOnce();
          if (status === "success" || status === "failure" || status === "cancelled") {
            clearQuery();
            return;
          }
          await new Promise((r) => setTimeout(r, 1500));
        }

        toast.info(
          "Przetwarzamy płatność — to może chwilę potrwać. Jeśli zapłaciłeś, saldo zaktualizuje się automatycznie.",
          { id: toastId }
        );
        onSettled?.();
        clearQuery();

        for (let i = 0; i < 40; i++) {
          await new Promise((r) => setTimeout(r, 3000));
          const status = await pollOnce();
          if (status === "success" || status === "failure" || status === "cancelled") return;
        }
        return;
      }

      toast.info("Wróciłeś z płatności — odśwież saldo, jeśli środki jeszcze nie widać.");
      onSettled?.();
      clearQuery();
    }

    void handleReturn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, searchParams]);
}
