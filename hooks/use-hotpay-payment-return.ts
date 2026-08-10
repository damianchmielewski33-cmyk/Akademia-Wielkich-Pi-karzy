"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { formatWalletPln } from "@/components/player-wallet-panel";
import { abandonHotpayPayment } from "@/lib/hotpay-client";
import { toast } from "@/lib/app-toast";

type Options = {
  enabled?: boolean;
  onSettled?: () => void;
};

type StatusPayload = {
  status?: string;
  error_message?: string | null;
  amount_pln?: number;
  kind?: string;
};

async function fetchHotpayStatus(sessionId: string): Promise<{
  ok: boolean;
  data: StatusPayload | null;
}> {
  const qs = `session_id=${encodeURIComponent(sessionId)}`;
  const authed = await fetch(`/api/wallet/hotpay/status?${qs}`, {
    credentials: "same-origin",
  });
  if (authed.ok) {
    const data = (await authed.json().catch(() => null)) as StatusPayload | null;
    return { ok: true, data };
  }
  // Gość bez sesji (zaproszenie) — publiczny status tylko dla is_temporary.
  if (authed.status === 401 || authed.status === 403) {
    const pub = await fetch(`/api/wallet/hotpay/public-status?${qs}`, {
      credentials: "same-origin",
    });
    if (!pub.ok) return { ok: false, data: null };
    const data = (await pub.json().catch(() => null)) as StatusPayload | null;
    return { ok: true, data };
  }
  return { ok: false, data: null };
}

function successToastText(data: StatusPayload): string {
  const amount =
    typeof data.amount_pln === "number" ? formatWalletPln(data.amount_pln) : null;
  if (data.kind === "match_cart") {
    return amount ? `Zaliczka ${amount} została opłacona` : "Zaliczka na mecz została opłacona";
  }
  return amount
    ? `Wpłata ${amount} zaksięgowana na portfelu`
    : "Wpłata zaksięgowana na portfelu";
}

/**
 * Obsługa powrotu z HotPay (?payment=&session_id=) na dowolnej stronie.
 * Działa też dla niezalogowanego gościa (public-status).
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
      // RSC / baner trybu testowego po przywróceniu cookie z middleware / status API.
      router.refresh();
    };

    async function restoreTestModeIfNeeded() {
      if (!sessionId?.startsWith("hp_t_")) return;
      try {
        // Status ustawia flagę DB + cookie dla admina (nawet przy anulowaniu).
        await fetch(`/api/wallet/hotpay/status?session_id=${encodeURIComponent(sessionId)}`, {
          credentials: "same-origin",
        });
        await fetch("/api/admin/test-mode", { credentials: "same-origin" });
      } catch {
        /* ignore */
      }
    }

    async function handleReturn() {
      await restoreTestModeIfNeeded();

      if (payment === "error" || payment === "cancelled" || payment === "failure") {
        if (sessionId) void abandonHotpayPayment(sessionId);
        toast.error(payment === "cancelled" ? "Płatność została anulowana" : "Płatność nie powiodła się");
        clearQuery();
        onSettled?.();
        return;
      }

      if (payment === "success") {
        toast.success("Płatność zakończona pomyślnie");
        clearQuery();
        onSettled?.();
        return;
      }

      if (sessionId) {
        const toastId = toast.loading("Sprawdzamy status płatności…");

        const pollOnce = async (): Promise<"success" | "failure" | "cancelled" | "pending" | "error"> => {
          try {
            const { ok, data } = await fetchHotpayStatus(sessionId);
            if (!ok || !data?.status) return "error";
            if (data.status === "success") {
              toast.success(successToastText(data), { id: toastId });
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

        toast.info("Przetwarzamy płatność — status zaktualizuje się automatycznie.", {
          id: toastId,
        });
        onSettled?.();
        clearQuery();

        for (let i = 0; i < 40; i++) {
          await new Promise((r) => setTimeout(r, 3000));
          const status = await pollOnce();
          if (status === "success" || status === "failure" || status === "cancelled") return;
        }
        return;
      }

      toast.info("Wróciłeś z płatności — sprawdzamy status automatycznie.");
      onSettled?.();
      clearQuery();
    }

    void handleReturn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, searchParams]);
}
