export type SignupFeePaymentStatus = "unpaid" | "pending_blik" | "underpaid" | "paid";

export function signupFeePaymentStatus(row: {
  match_paid?: number | null;
  blik_declared?: number | null;
  blik_received_pln?: number | null;
}): SignupFeePaymentStatus {
  if (Number(row.match_paid) === 1) return "paid";
  if (Number(row.blik_received_pln ?? 0) > 0) return "underpaid";
  if (Number(row.blik_declared) === 1) return "pending_blik";
  return "unpaid";
}
