import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type TherapistAuditLogDocument = TherapistAuditLog & Document;

@Schema({ timestamps: true })
export class TherapistAuditLog {
    @Prop({ type: Types.ObjectId, ref: "Therapist", required: true })
    therapistId: Types.ObjectId;

    @Prop({ required: true })
    action: string; // e.g., "STATUS_CHANGE", "REJECTED_BANK_DETAILS"

    @Prop({ type: Object })
    previousValue: any;

    @Prop({ type: Object })
    newValue: any;

    @Prop()
    reason: string;

    @Prop({ type: Types.ObjectId, ref: "User", required: true })
    adminId: Types.ObjectId;
}

export const TherapistAuditLogSchema = SchemaFactory.createForClass(TherapistAuditLog);
