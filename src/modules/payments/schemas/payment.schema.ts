import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type PaymentDocument = Payment & Document;

@Schema({ timestamps: true })
export class Payment {
  @Prop({ type: Types.ObjectId, ref: "Therapist", required: true })
  therapistId: Types.ObjectId;

  @Prop({ required: true })
  amount: number; // Total amount before tax

  @Prop({ required: true })
  taxDeducted: number; // 18% GST deducted

  @Prop({ required: true })
  netAmount: number; // Amount after tax

  @Prop({ required: true })
  month: string; // YYYY-MM format

  @Prop({ type: [Types.ObjectId], ref: "Invoice" })
  invoiceIds: Types.ObjectId[];

  @Prop({
    enum: ["processed", "pending", "failed", "bounced"],
    default: "processed",
  })
  status: string;

  @Prop({ type: Date })
  processedDate: Date;

  @Prop({ type: Date })
  creditedDate: Date;

  @Prop()
  bankAccount?: string;

  @Prop()
  notes?: string;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);
