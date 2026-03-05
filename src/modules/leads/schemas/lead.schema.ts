import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type LeadDocument = Lead & Document;

// ── Nested address sub-document ──────────────────────────────────────────────
class LeadAddress {
  buildingName?: string;
  flatNo?: string;
  floor?: string;
  addressLine2?: string;
  area?: string;
  sector?: string;
  landmark?: string;
  city?: string;
  state?: string;
  pinCode?: string;
  country?: string;
}

@Schema({ timestamps: true })
export class Lead {
  @Prop({ required: true })
  name: string;

  @Prop()
  leadCode: string;

  @Prop({ required: true })
  phone: string;

  @Prop()
  email: string;

  @Prop()
  age: number;

  @Prop()
  gender: string;

  @Prop()
  country: string;

  @Prop()
  state: string;

  @Prop()
  city: string;

  @Prop()
  area: string;

  // Accepts both structured object and legacy plain string
  @Prop({ type: Object })
  address: LeadAddress | string;

  @Prop()
  serviceType: string;

  @Prop()
  serviceRequired: string;

  @Prop()
  preferredDate: Date;

  @Prop()
  preferredTime: string;

  @Prop()
  notes: string;

  @Prop()
  condition: string;

  @Prop()
  requirements: string;

  @Prop({ default: "general" })
  leadType: string;

  @Prop({ default: "Website" })
  source: string;

  @Prop({
    type: String,
    default: "new",
  })
  status: string;

  @Prop({ enum: ["low", "normal", "high", "urgent"], default: "normal" })
  urgency: string;

  @Prop({ type: [{ therapistId: String, markedAt: Date }], default: [] })
  interestedTherapists: Array<{ therapistId: string; markedAt: Date }>;

  @Prop()
  assignedTherapistId: string;

  @Prop()
  patientId: string;

  @Prop()
  appointmentId: string;

  @Prop({ type: Date })
  broadcastStartedAt: Date;

  @Prop({ type: Date })
  broadcastExpiresAt: Date;

  @Prop({ type: Types.ObjectId, ref: "Therapist" })
  assignedTo: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Clinic" })
  clinicId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Therapist" })
  referredBy: Types.ObjectId;

  @Prop()
  referralCodeUsed: string;
}

export const LeadSchema = SchemaFactory.createForClass(Lead);
