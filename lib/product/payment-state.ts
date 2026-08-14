export const PaymentStatusValues = [
  "pending",
  "approved",
  "rejected",
  "refunded",
  "cancelled",
  "failed",
] as const;

export type PaymentStatus = (typeof PaymentStatusValues)[number];

const ALLOWED_TRANSITIONS: Readonly<Record<PaymentStatus, readonly PaymentStatus[]>> = {
  pending: ["approved", "rejected", "cancelled", "failed"],
  approved: ["refunded"],
  rejected: [],
  refunded: [],
  cancelled: [],
  failed: [],
};

/**
 * A payment record is an auditable state machine, never a mutable label. This
 * keeps duplicate webhook/admin actions from granting an entitlement twice.
 */
export function canTransitionPayment(from: PaymentStatus, to: PaymentStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}
