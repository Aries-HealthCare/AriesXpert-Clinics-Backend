import { Schema, Prop, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type VisitDocument = Visit & Document;

@Schema({ timestamps: true })
export class Visit {
  @Prop({ type: Types.ObjectId, ref: "Appointment", required: true })
  appointmentId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Therapist", required: true })
  therapistId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Patient", required: true })
  patientId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Clinic" })
  clinicId: Types.ObjectId;

  @Prop({ enum: ["home-visit", "clinic", "online"], required: true })
  visitType: string;

  @Prop({ required: true })
  startTime: Date;

  @Prop()
  endTime: Date;

  @Prop()
  durationMinutes: number;

  @Prop()
  treatmentNotes: string;

  @Prop({ type: [String], default: [] })
  exercisesPrescribed: string[];

  @Prop()
  nextVisitDate: Date;

  @Prop({
    enum: ["in-progress", "completed", "cancelled"],
    default: "in-progress",
  })
  status: string;

  @Prop({ required: true, default: 1000 })
  charges: number;

  @Prop({
    enum: ["pending", "completed"],
    default: "pending",
  })
  paymentStatus: string;

  @Prop({ type: Types.ObjectId, ref: "Invoice" })
  invoiceId: Types.ObjectId;

  @Prop({ default: () => new Date() })
  createdAt: Date;

  @Prop()
  completedAt: Date;

  @Prop({ type: Object })
  assessment: {
    chiefComplaint?: string;
    diagnosis?: string;
    treatmentPlan?: string;
    painScale?: string;
    rangeOfMotion?: string;
    followupNotes?: string;
  };
}

export const VisitSchema = SchemaFactory.createForClass(Visit);
