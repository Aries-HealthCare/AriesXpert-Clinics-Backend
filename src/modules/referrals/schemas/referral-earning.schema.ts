import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type ReferralEarningDocument = ReferralEarning & Document;

export enum EarningStatus {
    PENDING = "PENDING",
    CREDITED = "CREDITED",
    REVERSED = "REVERSED",
}

@Schema({ timestamps: true })
export class ReferralEarning {
    @Prop({ type: Types.ObjectId, ref: "Referral", required: true })
    referralId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: "Therapist", required: true })
    referrerTherapistId: Types.ObjectId;

    @Prop({ type: String }) // Visit ID for patient referrals
    visitId: string;

    @Prop({ type: String }) // Payment ID for expert registrations
    registrationPaymentId: string;

    @Prop({ required: true })
    earningAmount: number;

    @Prop({ required: true })
    percentageApplied: number;

    @Prop({ required: true, enum: EarningStatus, default: EarningStatus.PENDING })
    earningStatus: EarningStatus;

    @Prop()
    description: string;
}

export const ReferralEarningSchema = SchemaFactory.createForClass(ReferralEarning);
ReferralEarningSchema.index({ referralId: 1 });
ReferralEarningSchema.index({ referrerTherapistId: 1 });
ReferralEarningSchema.index({ earningStatus: 1 });
ReferralEarningSchema.index({ visitId: 1 });
ReferralEarningSchema.index({ registrationPaymentId: 1 });
