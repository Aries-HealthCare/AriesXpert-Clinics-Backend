import { Expose } from "class-transformer";

export class PaymentStatusResponseDto {
  @Expose()
  _id: string;

  @Expose()
  visitId: string;

  @Expose()
  patientId: string;

  @Expose()
  therapistId: string;

  @Expose()
  amount: number;

  @Expose()
  currency: string;

  @Expose()
  status: string; // pending | link_sent | paid | failed | expired | cancelled | refunded

  @Expose()
  paymentLinkId: string;

  @Expose()
  paymentLinkUrl: string;

  @Expose()
  shortUrl: string;

  @Expose()
  transactionId: string;

  @Expose()
  razorpayPaymentId: string;

  @Expose()
  expiresAt: Date;

  @Expose()
  createdAt: Date;

  @Expose()
  paidAt: Date;

  @Expose()
  notes?: Record<string, any>;

  constructor(partial: Partial<PaymentStatusResponseDto>) {
    Object.assign(this, partial);
  }
}
