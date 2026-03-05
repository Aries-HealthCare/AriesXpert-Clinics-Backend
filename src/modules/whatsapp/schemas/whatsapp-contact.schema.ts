import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type WhatsAppContactDocument = WhatsAppContact & Document;

@Schema({ timestamps: true })
export class WhatsAppContact {
  @Prop({ required: true, unique: true })
  phoneNumber: string;

  @Prop()
  fullName: string;

  @Prop()
  profilePhotoUrl: string;

  @Prop({ type: Types.ObjectId, ref: "Lead", default: null })
  leadId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Patient", default: null })
  patientId?: Types.ObjectId;

  @Prop({
    type: String,
    enum: [
      "NEW",
      "CONTACTED",
      "INTERESTED",
      "NOT_INTERESTED",
      "BOOKED",
      "CONVERTED",
      "LOST",
    ],
    default: "NEW",
  })
  funnelStage: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ type: [String], default: [] })
  labels: string[];

  @Prop()
  city: string;

  @Prop()
  source: string;

  @Prop({ type: Types.ObjectId, ref: "User", default: null })
  assignedAgentId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "WhatsAppNumber", default: null })
  primaryWhatsAppNumberId?: Types.ObjectId; // Which business number they interact with most

  @Prop({ default: false })
  isOptedOut: boolean;

  @Prop({ type: Date })
  lastInteractionAt: Date;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;
}

export const WhatsAppContactSchema =
  SchemaFactory.createForClass(WhatsAppContact);
WhatsAppContactSchema.index({ phoneNumber: 1 });
WhatsAppContactSchema.index({ leadId: 1 });
WhatsAppContactSchema.index({ patientId: 1 });
WhatsAppContactSchema.index({ assignedAgentId: 1 });
