import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type FollowUpDocument = FollowUp & Document;

@Schema({ timestamps: true })
export class FollowUp {
    @Prop({ type: Types.ObjectId, ref: "Patient", required: true })
    patientId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: "Assessment", required: true }) // Link to original assessment
    assessmentId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: "Clinic", required: true })
    clinicId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: "User", required: true })
    performedBy: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: "AssessmentTemplate", required: true })
    templateId: Types.ObjectId;

    @Prop({ type: Object, required: true })
    responses: Record<string, any>;

    @Prop()
    progressNotes: string;

    @Prop()
    nextFollowUpDate: Date;

    @Prop({ default: Date.now })
    performedAt: Date;
}

export const FollowUpSchema = SchemaFactory.createForClass(FollowUp);
