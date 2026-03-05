import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type WhatsAppFunnelDocument = WhatsAppFunnel & Document;

@Schema({ timestamps: true })
export class WhatsAppFunnel {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true })
  stages: {
    id: string;
    name: string;
    order: number;
    color: string;
    automation?: Types.ObjectId;
  }[];

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isDefault: boolean;
}

export const WhatsAppFunnelSchema =
  SchemaFactory.createForClass(WhatsAppFunnel);
