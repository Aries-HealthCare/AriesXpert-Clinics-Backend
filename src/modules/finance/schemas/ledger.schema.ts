import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type LedgerDocument = Ledger & Document;

export enum LedgerType {
  CREDIT = "CREDIT",
  DEBIT = "DEBIT",
}

export enum LedgerCategory {
  EARNING = "EARNING",
  COMMISSION = "COMMISSION",
  LIABILITY = "LIABILITY", // Cash collected by therapist
  PAYOUT = "PAYOUT",
  REFERRAL = "REFERRAL",
}

export enum LedgerStatus {
  PENDING = "PENDING",
  LOCKED = "LOCKED",
  PAID = "PAID",
}

@Schema({ timestamps: true })
export class Ledger {
  @Prop({ type: Types.ObjectId, ref: "Clinic" })
  clinicId: Types.ObjectId;
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true, enum: LedgerType })
  type: LedgerType;

  @Prop({ required: true, enum: LedgerCategory })
  category: LedgerCategory;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  currency: string;

  @Prop({ required: true, enum: LedgerStatus, default: LedgerStatus.PENDING })
  status: LedgerStatus;

  @Prop()
  description: string;

  @Prop()
  referenceId: string; // Transaction ID or Visit ID

  @Prop({ type: Object })
  metadata: Record<string, any>;
}

export const LedgerSchema = SchemaFactory.createForClass(Ledger);

// Immutable Ledger Rule
LedgerSchema.pre("save", function (next) {
  if (!this.isNew && this.isModified()) {
    // Only allow status updates
    const modifiedPaths = this.modifiedPaths();
    const allowedUpdates = ["status", "updatedAt"];
    const isIllegalUpdate = modifiedPaths.some(
      (path) => !allowedUpdates.includes(path),
    );

    if (isIllegalUpdate) {
      return next(
        new Error("Ledger entries are immutable. Only status can be updated."),
      );
    }
  }
  next();
});
