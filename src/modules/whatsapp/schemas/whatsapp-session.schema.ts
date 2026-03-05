import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type WhatsAppSessionDocument = WhatsAppSession & Document;

@Schema({ timestamps: true })
export class WhatsAppSession {
  @Prop({ required: true, unique: true })
  phoneNumber: string;

  @Prop({ type: Types.ObjectId, ref: "WhatsAppFlow", required: true })
  flowId: Types.ObjectId;

  @Prop({ required: true })
  currentNodeId: string;

  @Prop({ type: Object, default: {} })
  variables: Record<string, any>;

  @Prop({ default: false })
  isPaused: boolean; // For human takeover

  @Prop({ default: 0 })
  stepsCompleted: number;

  @Prop()
  lastInteractionAt: Date;
}

export const WhatsAppSessionSchema =
  SchemaFactory.createForClass(WhatsAppSession);
WhatsAppSessionSchema.index({ phoneNumber: 1 });
WhatsAppSessionSchema.index(
  { lastInteractionAt: 1 },
  { expireAfterSeconds: 86400 },
); // Expire after 24h
