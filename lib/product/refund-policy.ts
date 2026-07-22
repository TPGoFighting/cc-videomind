import type { PaymentStatus } from "@/lib/product/payment-state";

export type RefundEligibilityReason = "not_approved" | "window_expired" | "analysis_completed" | "already_requested";

export type RefundEligibility =
  | { eligible: true; reason: null }
  | { eligible: false; reason: RefundEligibilityReason };

const REFUND_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/** The stated launch policy: seven days and no completed AI analysis. */
export function getRefundEligibility(
  input: {
    status: PaymentStatus;
    approvedAt: Date | null;
    analysisCount: number;
    refundRequestedAt: Date | null;
  },
  now = new Date(),
): RefundEligibility {
  if (input.status !== "approved" || !input.approvedAt) return { eligible: false, reason: "not_approved" };
  if (input.refundRequestedAt) return { eligible: false, reason: "already_requested" };
  if (input.analysisCount > 0) return { eligible: false, reason: "analysis_completed" };
  if (now.getTime() - input.approvedAt.getTime() >= REFUND_WINDOW_MS) return { eligible: false, reason: "window_expired" };
  return { eligible: true, reason: null };
}
