import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type TreatmentDocument = Treatment & Document;

@Schema({ timestamps: true })
export class Treatment {
  @Prop({ required: true })
  treatmentName: string;

  @Prop({ required: false })
  treatmentCode: string;

  @Prop({ type: Types.ObjectId, ref: "Patient", required: true })
  patient: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Therapist", required: true })
  expert: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Clinic" })
  clinicId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Package" })
  assignedPackage: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "TreatmentType" })
  treatmentType: Types.ObjectId;

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  preferenceTime: string;

  @Prop()
  duration: string;

  @Prop()
  sessions: number;


  @Prop({ trim: true })
  paidAmount: string;

  @Prop({ trim: true })
  therapistSessionAmount: string;

  @Prop({ trim: true })
  therapistProfessionalRole: string;

  @Prop({ type: Types.ObjectId, ref: "Broadcast" })
  broadCastId: Types.ObjectId;

  @Prop({ enum: ["Active", "Completed"], default: "Active" })
  status: string;

  @Prop({ default: "New Treatment" })
  treatmentTypeNew: string;

  @Prop({ default: 0 })
  sessionNumber: number;

  @Prop({ default: 0 })
  totalSessions: number;

  @Prop({ default: 0 })
  completedSessions: number;

  @Prop({ default: 0 })
  remainingSessions: number;

  @Prop({ enum: ["Regular", "Package"], default: "Regular" })
  paymentType: string;

  @Prop({ enum: ["Paid", "Pending"], default: "Pending" })
  paymentStatus: string;

  @Prop({ type: [Object], default: [] })
  sessionHistory: any[];

  @Prop({ type: [Object], default: [] })
  assessmentRecords: any[];

  @Prop({ type: [Object], default: [] })
  followUpRecords: any[];

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isDeleted: boolean;
}

export const TreatmentSchema = SchemaFactory.createForClass(Treatment);

// Index for faster queries
TreatmentSchema.index({ patient: 1, isDeleted: 1 });
TreatmentSchema.index({ expert: 1, isDeleted: 1 });
TreatmentSchema.index({ startDate: -1 });
TreatmentSchema.index({ paymentStatus: 1 });
TreatmentSchema.index({ broadCastId: 1 });
