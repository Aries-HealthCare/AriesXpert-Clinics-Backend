import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type PaymentTransactionDocument = PaymentTransaction & Document;

export enum PaymentStatus {
  PENDING = "pending",
  LINK_SENT = "link_sent",
  PAID = "paid",
  FAILED = "failed",
  EXPIRED = "expired",
  CANCELLED = "cancelled",
  REFUNDED = "refunded",
}

export enum PaymentGateway {
  RAZORPAY = "razorpay",
  STRIPE = "stripe",
  PAYPAL = "paypal",
}

export enum PaymentSource {
  VISIT = "visit",
  SESSION = "session",
  PACKAGE = "package",
  INVOICE = "invoice",
}

@Schema({ timestamps: true })
export class PaymentTransaction {
  @Prop({ type: Types.ObjectId, ref: "Patient", required: true })
  patientId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Therapist" })
  therapistId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Visit", required: true })
  visitId: Types.ObjectId;

  @Prop({ required: true, enum: PaymentSource })
  source: PaymentSource;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true, enum: PaymentGateway })
  gateway: PaymentGateway;

  @Prop({ required: true, enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Prop()
  paymentLinkId?: string;

  @Prop()
  paymentLinkUrl?: string;

  @Prop()
  paymentLinkShortUrl?: string;

  @Prop()
  transactionId?: string;

  @Prop()
  orderId?: string;

  @Prop()
  receiptId?: string;

  @Prop({ type: Object, default: {} })
  metadata?: {
    visit_id?: string;
    patient_id?: string;
    therapist_id?: string;
    module?: string;
    custom_fields?: Record<string, any>;
  };

  @Prop({ type: Object })
  paymentDetails?: {
    method?: string;
    card_id?: string;
    email?: string;
    contact?: string;
    vpa?: string;
    bank?: string;
  };

  @Prop()
  failureReason?: string;

  @Prop()
  failureCode?: string;

  @Prop()
  expiresAt?: Date;

  @Prop()
  paidAt?: Date;

  @Prop()
  refundedAt?: Date;

  @Prop()
  refundAmount?: number;

  @Prop()
  razorpayPaymentId?: string;

  @Prop()
  verifiedAt?: Date;

  @Prop({ type: Object })
  refundDetails?: {
    refund_id?: string;
    refund_status?: string;
    refund_reason?: string;
  };

  @Prop({ default: false })
  invoiceGenerated: boolean;

  @Prop()
  invoiceUrl?: string;

  @Prop({ type: Object, default: {} })
  auditLog?: Array<{
    timestamp: Date;
    action: string;
    details: string;
    changedBy?: string;
  }>;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isPaid: boolean;

  @Prop()
  webhookVerifiedAt?: Date;

  @Prop()
  signatureValid?: boolean;
}

export const PaymentTransactionSchema =
  SchemaFactory.createForClass(PaymentTransaction);

// Indexes for performance
PaymentTransactionSchema.index({ patientId: 1, createdAt: -1 });
PaymentTransactionSchema.index({ visitId: 1 });
PaymentTransactionSchema.index({ transactionId: 1 });
PaymentTransactionSchema.index({ paymentLinkId: 1 });
PaymentTransactionSchema.index({ status: 1, createdAt: -1 });
PaymentTransactionSchema.index({ expiresAt: 1 });
