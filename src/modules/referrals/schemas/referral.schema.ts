import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type ReferralDocument = Referral & Document;

export enum ReferralType {
    PATIENT = "PATIENT",
    EXPERT = "EXPERT",
}

export enum ReferralStatus {
    PENDING = "PENDING",
    ACTIVE = "ACTIVE",
    INVALID = "INVALID",
}

@Schema({ timestamps: true })
export class Referral {
    @Prop({ type: Types.ObjectId, ref: "Therapist", required: true })
    referrerTherapistId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, required: true })
    referredUserId: Types.ObjectId; // User ID for Experts, Patient ID for Patients

    @Prop({ required: true, enum: ReferralType })
    referralType: ReferralType;

    @Prop({ required: true })
    referralCodeUsed: string;

    @Prop({ required: true, enum: ReferralStatus, default: ReferralStatus.PENDING })
    referralStatus: ReferralStatus;
}

export const ReferralSchema = SchemaFactory.createForClass(Referral);
ReferralSchema.index({ referrerTherapistId: 1 });
ReferralSchema.index({ referredUserId: 1 });
ReferralSchema.index({ referralType: 1 });
ReferralSchema.index({ referralStatus: 1 });
