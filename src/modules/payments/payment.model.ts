import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, ObjectId } from "mongoose";
import * as mongoose from "mongoose";

export enum PaymentStatus {
  PENDING = "pending",
  SUCCESS = "success",
  FAILED = "failed",
  REFUNDED = "refunded",
}

export enum PaymentFor {
  APPOINTMENT = "appointment",
  SECURITY_DEPOSIT = "security_deposit",
  SUBSCRIPTION = "subscription",
  WALLET = "wallet",
}

@Schema({ timestamps: true })
export class Payment extends Document {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: "User" })
  userId: ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: "Therapist" })
  therapistId?: ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: "Appointment" })
  appointmentId?: ObjectId;

  @Prop({ required: true })
  amount: number;

  @Prop({ default: "INR" })
  currency: string;

  @Prop({ required: true })
  rzpOrderId: string;

  @Prop()
  rzpPaymentId?: string;

  @Prop()
  rzpSignature?: string;

  @Prop({ type: String, enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Prop({ type: String, enum: PaymentFor, required: true })
  paymentFor: PaymentFor;

  @Prop()
  description?: string;

  @Prop({ type: Object })
  metadata?: any;

  @Prop({ type: Object })
  razorpayResponse?: any;

  @Prop()
  failureReason?: string;

  createdAt: Date;
  updatedAt: Date;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);
