/**
 * WhatsApp Template Schema
 * File: src/modules/whatsapp/schemas/whatsapp-template.schema.ts
 */

import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type WhatsAppTemplateDocument = WhatsAppTemplate & Document;

export enum TemplateCategory {
  UTILITY = "UTILITY",
  MARKETING = "MARKETING",
  AUTHENTICATION = "AUTHENTICATION",
}

export enum TemplateStatus {
  PENDING_APPROVAL = "PENDING_APPROVAL",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  PAUSED = "PAUSED",
  DISABLED = "DISABLED",
}

export enum ButtonType {
  QUICK_REPLY = "QUICK_REPLY",
  URL = "URL",
  CALL = "CALL",
  COPY_CODE = "COPY_CODE",
}

export enum HeaderType {
  NONE = "NONE",
  TEXT = "TEXT",
  IMAGE = "IMAGE",
  DOCUMENT = "DOCUMENT",
  VIDEO = "VIDEO",
}

@Schema({ timestamps: true })
export class WhatsAppTemplate {
  @Prop({ required: true, unique: true })
  templateName: string;

  @Prop({ required: true })
  displayName: string;

  @Prop({ required: true })
  description: string;

  @Prop({
    enum: Object.values(TemplateCategory),
    default: TemplateCategory.UTILITY,
  })
  category: TemplateCategory;

  @Prop({
    enum: [
      "LEADS",
      "BROADCAST",
      "APPOINTMENTS",
      "PAYMENTS",
      "WALLET",
      "SOS",
      "EMPLOYEE",
      "THERAPIST_ALIGNMENT",
      "FINANCE",
      "REMINDER",
      "TELEHEALTH",
      "INVOICE",
      "AI_FOLLOWUP",
    ],
    required: true,
  })
  module: string;

  @Prop({ default: "en" })
  language: string;

  @Prop({
    enum: Object.values(HeaderType),
    default: HeaderType.NONE,
  })
  headerType: HeaderType;

  @Prop({ default: null })
  headerContent: string; // URL for image/video, text for TEXT header

  @Prop({ required: true })
  bodyText: string; // Contains {{1}}, {{2}}, {{patient_name}}, etc.

  @Prop({ default: null })
  footerText: string;

  @Prop({
    type: [
      {
        type: {
          type: String,
          enum: Object.values(ButtonType),
          required: true,
        },
        text: String,
        payload: String, // For QUICK_REPLY, identifies the action
        url: String, // For URL buttons
        phoneNumber: String, // For CALL buttons
        index: Number,
      },
    ],
    default: [],
  })
  buttons: Array<{
    type: ButtonType;
    text: string;
    payload?: string;
    url?: string;
    phoneNumber?: string;
    index: number;
  }>;

  @Prop({
    type: [
      {
        variableName: String, // {{patient_name}}
        dataSource: String, // 'patient.name', 'lead.phone', 'transaction.amount'
        dataType: {
          type: String,
          enum: ["string", "number", "date", "phone", "url"],
        },
        isRequired: Boolean,
        example: String,
      },
    ],
    default: [],
  })
  variables: Array<{
    variableName: string;
    dataSource: string;
    dataType: string;
    isRequired: boolean;
    example?: string;
  }>;

  @Prop({
    enum: Object.values(TemplateStatus),
    default: TemplateStatus.PENDING_APPROVAL,
  })
  approvalStatus: TemplateStatus;

  @Prop({ default: null })
  whatsAppTemplateId: string; // WhatsApp's template ID

  @Prop({ default: null })
  approvalReason: string; // Reason if rejected

  @Prop({ type: Types.ObjectId, ref: "User", default: null })
  createdBy: Types.ObjectId;

  @Prop({ default: null })
  approvedAt: Date;

  @Prop({ type: Types.ObjectId, ref: "User", default: null })
  approvedBy: Types.ObjectId;

  @Prop({ default: null })
  rejectedAt: Date;

  @Prop({ type: Types.ObjectId, ref: "User", default: null })
  rejectedBy: Types.ObjectId;

  @Prop({ default: null })
  lastSyncedAt: Date;

  @Prop({
    type: {
      sent: { type: Number, default: 0 },
      delivered: { type: Number, default: 0 },
      read: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
      clickedButton: { type: Number, default: 0 },
    },
    default: { sent: 0, delivered: 0, read: 0, failed: 0, clickedButton: 0 },
  })
  analytics: {
    sent: number;
    delivered: number;
    read: number;
    failed: number;
    clickedButton: number;
  };

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isSystem: boolean; // System templates cannot be deleted

  @Prop({ default: null })
  notes: string;
}

export const WhatsAppTemplateSchema =
  SchemaFactory.createForClass(WhatsAppTemplate);

// Indexes
WhatsAppTemplateSchema.index({ templateName: 1 });
WhatsAppTemplateSchema.index({ module: 1 });
WhatsAppTemplateSchema.index({ approvalStatus: 1 });
WhatsAppTemplateSchema.index({ language: 1 });
WhatsAppTemplateSchema.index({ createdAt: -1 });
