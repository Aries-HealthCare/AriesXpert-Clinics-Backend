/**
 * Visit Payment Extension Schema
 * Extends Visit schema with payment-gated completion fields
 * Use this to understand the Visit schema updates needed
 */

export const visitPaymentExtension = {
  // Amount that needs to be paid for this visit
  amountDue: {
    type: Number,
    default: 0,
  },

  // Flag to indicate if payment is required before completion
  paymentRequired: {
    type: Boolean,
    default: false,
  },

  // Payment status: pending | link_sent | paid | failed | expired
  paymentStatus: {
    type: String,
    enum: ["pending", "link_sent", "paid", "failed", "expired", "cancelled"],
    default: "pending",
  },

  // Reference to the payment link created in Razorpay
  paymentLinkId: {
    type: String,
  },

  // Reference to the transaction record
  paymentTransactionId: {
    type: String,
  },

  // Visit status: scheduled | in_progress | awaiting_payment | completed
  visitStatus: {
    type: String,
    enum: [
      "scheduled",
      "in_progress",
      "awaiting_payment",
      "completed",
      "cancelled",
      "no_show",
    ],
    default: "scheduled",
  },

  // Deadline for payment
  paymentDueDeadline: {
    type: Date,
  },

  // When the payment was received
  paidAt: {
    type: Date,
  },

  // Invoice details
  invoiceId: {
    type: String,
  },

  invoiceUrl: {
    type: String,
  },

  // Track payment reminders sent
  paymentRemindersSent: {
    type: Number,
    default: 0,
  },

  lastPaymentReminderAt: {
    type: Date,
  },

  // For admin override
  paymentWaivedBy: {
    type: String, // User ID
  },

  paymentWaiverReason: {
    type: String,
  },

  paymentWaivedAt: {
    type: Date,
  },

  // Audit trail for payment-related changes
  paymentAuditLog: {
    type: Array,
    default: [],
  },
};
