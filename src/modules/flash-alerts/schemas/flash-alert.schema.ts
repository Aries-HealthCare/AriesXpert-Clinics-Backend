import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type FlashAlertDocument = FlashAlert & Document;

@Schema({ _id: false })
class FlashButton {
    @Prop({ required: true })
    label: string;

    @Prop({ required: true })
    value: string; // The value that will be recorded when clicked

    @Prop({ default: "primary" })
    color: string;
}

@Schema({ timestamps: true })
export class FlashAlert {
    @Prop({ required: true })
    title: string;

    @Prop({ required: true })
    message: string;

    @Prop({ type: [FlashButton], default: [] })
    buttons: FlashButton[];

    @Prop({ type: Object })
    targeting: {
        country?: string;
        state?: string;
        city?: string;
        area?: string;
        providerType?: string;
        professionalRole?: string; // Target specific roles
        therapistIds?: Types.ObjectId[]; // Target specific therapists
        filterOffline?: boolean;
        filterLessActive?: boolean;
        filterMoreActive?: boolean;
        filterLiability?: boolean;
    };


    @Prop({ default: 0 })
    totalSent: number;

    @Prop({ default: "ACTIVE", enum: ["ACTIVE", "EXPIRED", "ARCHIVED"] })
    status: string;

    @Prop({ type: Types.ObjectId, ref: "User" })
    createdBy: Types.ObjectId;
}

export const FlashAlertSchema = SchemaFactory.createForClass(FlashAlert);
