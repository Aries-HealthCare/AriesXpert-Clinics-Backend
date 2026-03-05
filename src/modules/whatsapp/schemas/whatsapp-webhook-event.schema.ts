/**
 * WhatsApp Webhook Event Schema
 * File: src/modules/whatsapp/schemas/whatsapp-webhook-event.schema.ts
 */

import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type WhatsAppWebhookEventDocument = WhatsAppWebhookEvent & Document;

@Schema({ timestamps: true })
export class WhatsAppWebhookEvent {
  @Prop({ required: true, unique: true })
  whatsAppEventId: string; // Unique ID from WhatsApp webhook

  @Prop({
    enum: [
      "MESSAGE_STATUS",
      "MESSAGE_RECEIVED",
      "BUTTON_CLICKED",
      "OPTED_OUT",
      "OPTED_IN",
    ],
    required: true,
  })
  eventType: string;

  @Prop({ required: true })
  recipientPhoneNumber: string;

  @Prop({ required: true })
  messageId: string;

  @Prop({
    type: {
      status: String, // 'sent', 'delivered', 'read', 'failed'
      timestamp: Number,
      error: Object,
    },
  })
  statusUpdate?: {
    status?: string;
    timestamp?: number;
    error?: any;
  };

  @Prop({
    type: {
      text: String,
      type: { type: String },
      mediaData: Object,
    },
  })
  incomingMessage?: {
    text?: string;
    type?: string;
    mediaData?: any;
  };

  @Prop({
    type: {
      buttonId: String,
      buttonText: String,
      buttonPayload: String,
    },
  })
  buttonInteraction?: {
    buttonId?: string;
    buttonText?: string;
    buttonPayload?: string;
  };

  @Prop({ type: Object, default: null })
  rawPayload: object; // Complete webhook payload from WhatsApp

  @Prop({ default: false })
  isProcessed: boolean;

  @Prop({ default: null })
  processedAt: Date;

  @Prop({ default: null })
  processingError: string;

  @Prop({ default: true })
  isVerified: boolean;

  @Prop({ default: null })
  linkedMessageLogId: string; // Reference to WhatsAppMessageLog

  @Prop({
    type: {
      attemptCount: { type: Number, default: 0 },
      lastAttemptAt: { type: Date, default: null },
      nextRetryAt: { type: Date, default: null },
    },
    default: { attemptCount: 0 },
  })
  retryInfo: {
    attemptCount: number;
    lastAttemptAt?: Date;
    nextRetryAt?: Date;
  };
}

export const WhatsAppWebhookEventSchema =
  SchemaFactory.createForClass(WhatsAppWebhookEvent);

// Indexes
WhatsAppWebhookEventSchema.index({ whatsAppEventId: 1 });
WhatsAppWebhookEventSchema.index({ eventType: 1 });
WhatsAppWebhookEventSchema.index({ recipientPhoneNumber: 1 });
WhatsAppWebhookEventSchema.index({ isProcessed: 1 });
WhatsAppWebhookEventSchema.index({ createdAt: -1 });
WhatsAppWebhookEventSchema.index({ messageId: 1 });
