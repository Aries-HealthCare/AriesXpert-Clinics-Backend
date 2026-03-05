import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type AssessmentDocument = Assessment & Document;

@Schema({ timestamps: true })
export class Assessment {
    @Prop({ type: Types.ObjectId, ref: "Clinic", required: true })
    clinicId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: "Patient", required: true })
    patientId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: "User", required: true })
    therapistId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: "Appointment" })
    appointmentId?: Types.ObjectId;

    @Prop({ required: true })
    chiefComplaint: string;

    @Prop()
    medicalHistory?: string;

    @Prop({ type: Number, min: 0, max: 10 })
    painScale?: number;

    @Prop()
    rangeOfMotion?: string;

    @Prop({ required: true })
    diagnosis: string;

    @Prop({ required: true })
    treatmentPlan: string;

    @Prop()
    goals?: string;

    @Prop()
    followupNotes?: string;

    @Prop({ type: [String], default: [] })
    attachments: string[];
}

export const AssessmentSchema = SchemaFactory.createForClass(Assessment);
