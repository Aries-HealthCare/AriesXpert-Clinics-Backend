import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type TherapistFinancialAdjustmentDocument = TherapistFinancialAdjustment & Document;

@Schema({ timestamps: true })
export class TherapistFinancialAdjustment {
    @Prop({ type: Types.ObjectId, ref: "Therapist", required: true })
    therapistId: Types.ObjectId;

    @Prop({ required: true, enum: ["bonus", "adjustment", "reimbursement", "penalty"] })
    type: string;

    @Prop({ required: true })
    amount: number;

    @Prop({ required: true })
    reason: string;

    @Prop({ required: true, enum: ["wallet_credit", "direct_transfer", "wallet_deduction", "next_payout_deduction"] })
    method: string;

    @Prop({ type: Types.ObjectId, ref: "User", required: true })
    adminId: Types.ObjectId;

    @Prop({ default: "pending", enum: ["pending", "processed", "failed"] })
    status: string;
}

export const TherapistFinancialAdjustmentSchema = SchemaFactory.createForClass(TherapistFinancialAdjustment);
