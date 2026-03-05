import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type WhatsAppAutomationDocument = WhatsAppAutomation & Document;

@Schema({ timestamps: true })
export class WhatsAppAutomation {
  @Prop({ required: true })
  name: string;

  @Prop({
    required: true,
    enum: [
      "NEW_LEAD",
      "LEAD_ASSIGNED",
      "APPOINTMENT_BOOKED",
      "APPOINTMENT_REMINDER",
      "APPOINTMENT_COMPLETED",
      "PAYMENT_PENDING",
      "PAYMENT_COMPLETED",
      "THERAPIST_ASSIGNED",
      "FOLLOW_UP_DUE",
      "MESSAGE_RECEIVED",
    ],
  })
  trigger: string;

  @Prop({ type: Object, default: {} })
  conditions: {
    city?: string;
    service?: string;
    tag?: string;
    status?: string;
    stage?: string;
    leadSource?: string;
  };

  @Prop({ type: Array, default: [] })
  actions: {
    type:
      | "SEND_MESSAGE"
      | "SEND_TEMPLATE"
      | "SEND_MEDIA"
      | "ASSIGN_TAG"
      | "ASSIGN_AGENT"
      | "MOVE_FUNNEL_STAGE"
      | "CALL_WEBHOOK"
      | "DELAY";
    payload: any;
    delayMs?: number;
  }[];

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Types.ObjectId, ref: "User" })
  createdBy: Types.ObjectId;

  @Prop({ type: Object, default: { executed: 0, successful: 0, failed: 0 } })
  analytics: {
    executed: number;
    successful: number;
    failed: number;
  };
}

export const WhatsAppAutomationSchema =
  SchemaFactory.createForClass(WhatsAppAutomation);
