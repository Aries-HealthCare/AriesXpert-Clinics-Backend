import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type AssessmentDocument = Assessment & Document;

@Schema({ timestamps: true })
export class Assessment {
    @Prop({ type: Types.ObjectId, ref: "Patient", required: true })
    patientId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: "Clinic", required: true })
    clinicId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: "User", required: true }) // Therapist/Physio who performed the assessment
    assessedBy: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: "AssessmentTemplate", required: true })
    templateId: Types.ObjectId;

    @Prop({ type: Object, required: true })
    responses: Record<string, any>;

    @Prop()
    conclusion: string;

    @Prop()
    treatmentPlan: string;

    @Prop({ default: Date.now })
    assessedAt: Date;
}

export const AssessmentSchema = SchemaFactory.createForClass(Assessment);
