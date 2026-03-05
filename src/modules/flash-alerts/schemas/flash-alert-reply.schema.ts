import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type FlashAlertReplyDocument = FlashAlertReply & Document;

@Schema({ timestamps: true })
export class FlashAlertReply {
    @Prop({ type: Types.ObjectId, ref: "FlashAlert", required: true, index: true })
    flashAlertId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: "User", required: true, index: true })
    userId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: "Therapist", required: true, index: true })
    therapistId: Types.ObjectId;

    @Prop({ required: true })
    value: string; // The button value clicked (Yes/No/etc)

    @Prop({ required: true })
    label: string; // The button label clicked

    @Prop({ type: Object })
    metadata: Record<string, any>;
}

export const FlashAlertReplySchema = SchemaFactory.createForClass(FlashAlertReply);
FlashAlertReplySchema.index({ flashAlertId: 1, userId: 1 }, { unique: true });
