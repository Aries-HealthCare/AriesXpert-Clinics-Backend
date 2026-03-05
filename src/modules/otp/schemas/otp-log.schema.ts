import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Schema as MongooseSchema } from "mongoose";

export type OtpLogDocument = OtpLog & Document;

@Schema({ timestamps: { createdAt: "created_at", updatedAt: "updated_at" } })
export class OtpLog {
    @Prop({ required: true, trim: true })
    mobile: string;

    @Prop({ required: true })
    request_id: string;

    @Prop({ required: true })
    purpose: string; // admin_login, therapist_login, clinic_login, registration, password_reset

    @Prop({ required: true, default: "pending" })
    status: string; // pending, verified, failed, expired

    @Prop()
    expires_at: Date;
}

export const OtpLogSchema = SchemaFactory.createForClass(OtpLog);

// Create compound index for querying latest OTPs fast
OtpLogSchema.index({ mobile: 1, purpose: 1, created_at: -1 });
