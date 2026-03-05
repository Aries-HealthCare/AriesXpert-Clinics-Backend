import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import { encrypt, decrypt } from "../../../utils/encryption";

export type WhatsAppSettingsDocument = WhatsAppSettings & Document;

@Schema({ timestamps: true })
export class WhatsAppSettings {
  @Prop({ required: false })
  businessAccountId: string;

  @Prop({ required: false })
  appId: string;

  @Prop({ required: false })
  phoneNumberId: string;

  @Prop({
    required: false,
    set: (value: string) => encrypt(value),
    get: (value: string) => decrypt(value),
  })
  accessToken: string;

  @Prop({
    required: false,
    set: (value: string) => encrypt(value),
    get: (value: string) => decrypt(value),
  })
  appSecret: string;

  @Prop({ required: false })
  webhookVerifyToken: string;

  @Prop({ default: "https://graph.facebook.com/v18.0" })
  apiBaseUrl: string;

  @Prop({ default: "IN" })
  defaultCountryCode: string;

  @Prop({ default: "ariesxpert" })
  templateNamespace: string;

  @Prop({
    type: {
      requestsPerSecond: { type: Number, default: 80 },
      requestsPerDay: { type: Number, default: 1000000 },
      maxRetries: { type: Number, default: 3 },
      retryDelayMs: { type: Number, default: 5000 },
    },
    default: {
      requestsPerSecond: 80,
      requestsPerDay: 1000000,
      maxRetries: 3,
      retryDelayMs: 5000,
    },
  })
  rateLimitConfig: {
    requestsPerSecond: number;
    requestsPerDay: number;
    maxRetries: number;
    retryDelayMs: number;
  };

  @Prop({
    type: {
      enabled: { type: Boolean, default: true },
      autoReplyOnNoMatch: { type: Boolean, default: true },
      confidenceThreshold: { type: Number, default: 0.7 },
    },
    default: {
      enabled: true,
      autoReplyOnNoMatch: true,
      confidenceThreshold: 0.7,
    },
  })
  aiSettings: {
    enabled: boolean;
    autoReplyOnNoMatch: boolean;
    confidenceThreshold: number;
  };

  @Prop({
    enum: ["sandbox", "production"],
    default: "sandbox",
  })
  environment: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: null })
  lastSyncedAt: Date;

  @Prop({ default: null })
  lastTestedAt: Date;

  @Prop({ default: true })
  respectDND: boolean;

  @Prop({ default: [] })
  optOutNumbers: string[];

  @Prop({
    type: {
      enabled: { type: Boolean, default: true },
      retentionDays: { type: Number, default: 90 },
    },
  })
  auditLogging: {
    enabled: boolean;
    retentionDays: number;
  };

  @Prop({ type: Object, default: {} })
  webhookConfig: {
    signature?: string;
    lastVerifiedAt?: Date;
  };
}

export const WhatsAppSettingsSchema =
  SchemaFactory.createForClass(WhatsAppSettings);

// Indexes
WhatsAppSettingsSchema.index({ businessAccountId: 1 });
WhatsAppSettingsSchema.index({ phoneNumberId: 1 });
WhatsAppSettingsSchema.index({ createdAt: -1 });

// Ensure getters are used
WhatsAppSettingsSchema.set("toJSON", { getters: true, virtuals: true });
WhatsAppSettingsSchema.set("toObject", { getters: true, virtuals: true });
