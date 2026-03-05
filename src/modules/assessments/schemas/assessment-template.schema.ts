import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type AssessmentTemplateDocument = AssessmentTemplate & Document;

@Schema({ timestamps: true })
export class AssessmentTemplate {
    @Prop({ required: true })
    name: string;

    @Prop({ required: true })
    type: string; // Initial, Follow-up, specialized-condition, etc.

    @Prop({ type: [Object], required: true })
    fields: Array<{
        id: string;
        label: string;
        type: string; // text, number, select, multiselect, checkbox, radio, date, etc.
        options?: string[];
        required: boolean;
        defaultValue?: any;
        section?: string;
    }>;

    @Prop({ type: Types.ObjectId, ref: "Clinic" })
    clinicId: Types.ObjectId; // Optional if global, but user wants isolation

    @Prop({ default: true })
    isActive: boolean;
}

export const AssessmentTemplateSchema = SchemaFactory.createForClass(AssessmentTemplate);
