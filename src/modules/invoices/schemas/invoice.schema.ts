import { Schema, Prop, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type InvoiceDocument = Invoice & Document;

@Schema({ timestamps: true })
export class Invoice {
  @Prop({ required: true, unique: true })
  invoiceNumber: string;

  @Prop({ type: Types.ObjectId, ref: "Therapist", required: true })
  therapistId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Patient", required: true })
  patientId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Visit" })
  visitId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Clinic" })
  clinicId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Franchise" })
  franchiseId: Types.ObjectId;

  @Prop({ required: true })
  amount: number;

  @Prop({ default: 0 })
  taxAmount: number;

  @Prop({
    enum: ["pending", "paid", "overdue"],
    default: "pending",
  })
  status: string;

  @Prop({ required: true })
  issuedDate: Date;

  @Prop({ required: true })
  dueDate: Date;

  @Prop()
  paidDate: Date;

  @Prop()
  month: string; // YYYY-MM

  @Prop({ default: () => new Date() })
  createdAt: Date;
}

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);
