import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { encrypt, decrypt } from "../../../utils/encryption";

export type WhatsAppNumberDocument = WhatsAppNumber & Document;

@Schema({ timestamps: true })
export class WhatsAppNumber {
  @Prop({ required: true, unique: true })
  phoneNumber: string;

  @Prop({ required: true })
  phoneNumberId: string;

  @Prop({ required: true })
  wabaId: string; // WhatsApp Business Account ID

  @Prop({
    required: true,
    set: (value: string) => encrypt(value),
    get: (value: string) => decrypt(value),
  })
  accessToken: string; // Permanent token preferred

  @Prop({ default: "Connected" })
  status: "Connected" | "Disconnected" | "QR Required" | "Banned";

  @Prop()
  nickname: string; // e.g., "Sales Team", "Support"

  @Prop({ type: [String], default: [] })
  assignedDepartments: string[];

  @Prop({ type: [String], default: [] })
  assignedCities: string[];

  @Prop({ type: [String], default: [] })
  assignedServices: string[];

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Object, default: {} })
  qualityRating: {
    score: string;
    date: Date;
  };
}

export const WhatsAppNumberSchema =
  SchemaFactory.createForClass(WhatsAppNumber);

// Ensure getters are used
WhatsAppNumberSchema.set("toJSON", { getters: true, virtuals: true });
WhatsAppNumberSchema.set("toObject", { getters: true, virtuals: true });
