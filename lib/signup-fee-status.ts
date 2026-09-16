export type SignupFeePaymentStatus = "unpaid" | "pending_blik" | "paid";

export function signupFeePaymentStatus(row: {
  match_paid?: number | null;
  blik_declared?: number | null;
}): SignupFeePaymentStatus {
  if (Number(row.match_paid) === 1) return "paid";
  if (Number(row.blik_declared) === 1) return "pending_blik";
  return "unpaid";
}
