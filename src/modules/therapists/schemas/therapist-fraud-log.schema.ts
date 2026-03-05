import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type TherapistFraudLogDocument = TherapistFraudLog & Document;

@Schema({ timestamps: true })
export class TherapistFraudLog {
    @Prop({ type: Types.ObjectId, ref: "Therapist", required: true })
    therapistId: Types.ObjectId;

    @Prop({ required: true, enum: ["geo_mismatch", "visit_manipulation", "patient_complaint", "admin_flagged"] })
    type: string;

    @Prop({ required: true })
    severity: string; // e.g., low, medium, high

    @Prop({ required: true })
    description: string;

    @Prop({ type: Object })
    metadata: any; // e.g., { distance: 10, appointmentId: "..." }

    @Prop({ type: Types.ObjectId, ref: "User" })
    flaggedBy: Types.ObjectId; // Optional if automated
}

export const TherapistFraudLogSchema = SchemaFactory.createForClass(TherapistFraudLog);
