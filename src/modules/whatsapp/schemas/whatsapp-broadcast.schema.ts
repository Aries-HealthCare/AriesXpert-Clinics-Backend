import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type WhatsAppBroadcastDocument = WhatsAppBroadcast & Document;

@Schema({ timestamps: true })
export class WhatsAppBroadcast {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  messageType: "TEXT" | "TEMPLATE" | "MEDIA" | "BUTTON" | "LIST";

  @Prop({ type: Types.ObjectId, ref: "WhatsAppTemplate" })
  templateId?: Types.ObjectId;

  @Prop({ type: Object, default: {} })
  targeting: {
    audience: "ALL_CONTACTS" | "LEADS" | "PATIENTS" | "FILTERED";
    city?: string;
    service?: string;
    tags?: string[];
    funnelStage?: string;
    lastInteraction?: Date;
  };

  @Prop({ default: null })
  scheduledAt: Date;

  @Prop({ default: null })
  startedAt: Date;

  @Prop({ default: null })
  completedAt: Date;

  @Prop({ default: 0 })
  progress: number;

  @Prop()
  templateName?: string;

  @Prop({ type: [Object], default: [] })
  variables?: any[];

  @Prop({ default: "Draft" })
  status:
    | "Draft"
    | "Scheduled"
    | "Processing"
    | "Completed"
    | "Failed"
    | "Cancelled";

  @Prop({
    type: Object,
    default: {
      total: 0,
      sent: 0,
      delivered: 0,
      read: 0,
      failed: 0,
      replied: 0,
      converted: 0,
    },
  })
  stats: {
    total: number;
    sent: number;
    delivered: number;
    read: number;
    failed: number;
    replied: number;
    converted: number;
  };

  @Prop({ type: Types.ObjectId, ref: "User" })
  createdBy: Types.ObjectId;
}

export const WhatsAppBroadcastSchema =
  SchemaFactory.createForClass(WhatsAppBroadcast);
