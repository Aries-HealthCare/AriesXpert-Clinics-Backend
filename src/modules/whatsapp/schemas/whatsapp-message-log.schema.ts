/**
 * WhatsApp Message Log Schema
 * File: src/modules/whatsapp/schemas/whatsapp-message-log.schema.ts
 */

import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type WhatsAppMessageLogDocument = WhatsAppMessageLog & Document;

export enum MessageStatus {
  QUEUED = "QUEUED",
  SENT = "SENT",
  DELIVERED = "DELIVERED",
  READ = "READ",
  FAILED = "FAILED",
  EXPIRED = "EXPIRED",
}

export enum MessageType {
  TEXT = "TEXT",
  TEMPLATE = "TEMPLATE",
  INTERACTIVE_BUTTON = "INTERACTIVE_BUTTON",
  IMAGE = "IMAGE",
  DOCUMENT = "DOCUMENT",
  VIDEO = "VIDEO",
  LOCATION = "LOCATION",
  CONTACT = "CONTACT",
  INVOICE = "INVOICE",
  PAYMENT_LINK = "PAYMENT_LINK",
  OTP = "OTP",
  SOS_ALERT = "SOS_ALERT",
  LIST = "LIST",
}

@Schema({ timestamps: true })
export class WhatsAppMessageLog {
  @Prop({ required: true, unique: true })
  whatsAppMessageId: string;

  @Prop({ required: true })
  recipientPhoneNumber: string;

  @Prop({ required: true })
  senderPhoneNumber: string;

  @Prop({
    enum: Object.values(MessageType),
    required: true,
  })
  messageType: MessageType;

  @Prop({
    enum: Object.values(MessageStatus),
    default: MessageStatus.QUEUED,
  })
  status: MessageStatus;

  @Prop({ required: true })
  content: string; // Full message content

  @Prop({ default: null })
  templateId: string;

  @Prop({ type: Object, default: null })
  templateVariables: object; // Data used to populate template

  @Prop({
    type: [
      {
        id: String,
        title: String,
        payload: String,
      },
    ],
    default: null,
  })
  buttons: any[]; // For interactive messages

  @Prop({ type: Types.ObjectId, ref: "User" })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Lead", default: null })
  leadId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Patient", default: null })
  patientId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Appointment", default: null })
  appointmentId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Transaction", default: null })
  transactionId?: Types.ObjectId;

  @Prop({
    enum: [
      "LEAD_CREATION",
      "APPOINTMENT_REMINDER",
      "APPOINTMENT_CONFIRMATION",
      "APPOINTMENT_COMPLETED",
      "PAYMENT_RECEIPT",
      "INVOICE",
      "WALLET_UPDATE",
      "SOS_ALERT",
      "BROADCAST",
      "AI_FOLLOWUP",
      "THERAPIST_ALIGNMENT",
      "EMPLOYEE_REGISTRATION",
      "TELEHEALTH_JOIN",
      "OTP_VERIFICATION",
    ],
    default: null,
  })
  triggerEvent: string;

  @Prop({
    type: {
      attemptCount: { type: Number, default: 0 },
      lastAttemptAt: { type: Date, default: null },
      nextRetryAt: { type: Date, default: null },
      errorMessage: { type: String, default: null },
    },
    default: {
      attemptCount: 0,
      lastAttemptAt: null,
      nextRetryAt: null,
      errorMessage: null,
    },
  })
  retryInfo: {
    attemptCount: number;
    lastAttemptAt?: Date;
    nextRetryAt?: Date;
    errorMessage?: string;
  };

  @Prop({ default: null })
  sentAt: Date;

  @Prop({ default: null })
  deliveredAt: Date;

  @Prop({ default: null })
  readAt: Date;

  @Prop({ default: null })
  failedAt: Date;

  @Prop({ default: null })
  failureReason: string;

  @Prop({ type: Object, default: null })
  whatsAppMetadata: {
    messageId?: string;
    status?: string;
    timestamp?: number;
    errors?: any[];
  };

  @Prop({ default: null })
  respondedWith: string; // If user responds to button, store response

  @Prop({ default: null })
  respondedAt: Date;

  @Prop({
    type: {
      latitude: Number,
      longitude: Number,
      accuracy: Number,
    },
    default: null,
  })
  locationData: {
    latitude?: number;
    longitude?: number;
    accuracy?: number;
  };

  @Prop({ default: null })
  mediaUrl: string;

  @Prop({ default: null })
  mediaType: string; // image, video, document

  @Prop({ default: false })
  isRead: boolean;

  @Prop({ default: false })
  isOptedOut: boolean;

  @Prop({ default: null })
  optOutReason: string;

  @Prop({ default: null })
  campaignId: string; // For broadcast tracking

  @Prop({ default: 0 })
  costInPaisa: number; // WhatsApp cost in paise

  @Prop({ default: null })
  notes: string;
}

export const WhatsAppMessageLogSchema =
  SchemaFactory.createForClass(WhatsAppMessageLog);

// Indexes for efficient queries
WhatsAppMessageLogSchema.index({ whatsAppMessageId: 1 });
WhatsAppMessageLogSchema.index({ recipientPhoneNumber: 1 });
WhatsAppMessageLogSchema.index({ status: 1 });
WhatsAppMessageLogSchema.index({ createdAt: -1 });
WhatsAppMessageLogSchema.index({ userId: 1 });
WhatsAppMessageLogSchema.index({ triggerEvent: 1 });
WhatsAppMessageLogSchema.index({ messageType: 1 });
WhatsAppMessageLogSchema.index({ campaignId: 1 });
WhatsAppMessageLogSchema.index({ leadId: 1, patientId: 1 });
WhatsAppMessageLogSchema.index({ createdAt: -1, status: 1 });
