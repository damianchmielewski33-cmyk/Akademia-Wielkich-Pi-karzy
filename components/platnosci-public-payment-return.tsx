"use client";

import { useHotpayPaymentReturn } from "@/hooks/use-hotpay-payment-return";
import { useRouter } from "next/navigation";

/**
 * Powrót z HotPay na publicznym podsumowaniu (bez sesji logowania).
 * Ten sam poll statusu co na pozostałych stronach (`session_id` = capability token).
 */
export function PlatnosciPublicPaymentReturn() {
  const router = useRouter();
  useHotpayPaymentReturn({
    enabled: true,
    onSettled: () => {
      router.refresh();
    },
  });
  return null;
}
