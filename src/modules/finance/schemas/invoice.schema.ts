import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type InvoiceDocument = Invoice & Document;

@Schema({ timestamps: true })
export class Invoice {
  @Prop({ required: true, unique: true })
  invoiceNumber: string;

  @Prop({ type: Types.ObjectId, ref: "Patient", required: true })
  patientId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Clinic" })
  clinicId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Therapist", required: true })
  therapistId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Visit" })
  visitId: Types.ObjectId;

  @Prop({
    type: [
      {
        description: { type: String, required: true },
        amount: { type: Number, required: true },
      },
    ],
  })
  items: Array<{ description: string; amount: number }>;

  @Prop({ required: true })
  amount: number; // Subtotal

  @Prop({ required: true })
  taxAmount: number; // GST 18%

  @Prop({ required: true })
  totalAmount: number; // Subtotal + Tax

  @Prop({ enum: ["paid", "pending", "cancelled"], default: "pending" })
  status: string;

  @Prop({ required: true })
  date: Date;
}

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);
