import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type TherapistNotificationDocument = TherapistNotification & Document;

@Schema({ timestamps: true })
export class TherapistNotification {
    @Prop({ type: Types.ObjectId, ref: "Therapist", required: true })
    therapistId: Types.ObjectId;

    @Prop({ required: true })
    title: string;

    @Prop({ required: true })
    message: string;

    @Prop({ required: true, enum: ["warning", "compliance", "fraud", "payment", "general"] })
    type: string;

    @Prop({ default: "temporary", enum: ["temporary", "persistent"] })
    displayType: string;

    @Prop({ default: false })
    isRead: boolean;

    @Prop({ default: false })
    requiresAcknowledgement: boolean;

    @Prop()
    acknowledgedAt: Date;

    @Prop({ type: Types.ObjectId, ref: "User" })
    sentBy: Types.ObjectId;
}

export const TherapistNotificationSchema = SchemaFactory.createForClass(TherapistNotification);
