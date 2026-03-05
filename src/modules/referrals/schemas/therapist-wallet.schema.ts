import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type TherapistWalletDocument = TherapistWallet & Document;

@Schema({ timestamps: true })
export class TherapistWallet {
    @Prop({ type: Types.ObjectId, ref: "Therapist", required: true, unique: true })
    therapistId: Types.ObjectId;

    @Prop({ default: 0 })
    totalEarned: number;

    @Prop({ default: 0 })
    totalWithdrawn: number;

    @Prop({ default: 0 })
    availableBalance: number;

    @Prop({ default: 0 })
    pendingBalance: number;

    @Prop({ default: "INR" })
    currency: string;
}

export const TherapistWalletSchema = SchemaFactory.createForClass(TherapistWallet);
