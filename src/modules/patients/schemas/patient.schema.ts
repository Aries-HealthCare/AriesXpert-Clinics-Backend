import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type PatientDocument = Patient & Document;

@Schema({ timestamps: true })
export class Patient {
  @Prop({ required: true, trim: true })
  firstName: string;

  @Prop({ trim: true })
  lastName: string;

  @Prop({ type: Types.ObjectId, ref: "Clinic" })
  clinicId: Types.ObjectId;

  @Prop()
  countryCode: string; // +91, +1, etc

  @Prop({ required: true, trim: true })
  phone: string;

  @Prop({ trim: true, lowercase: true })
  email: string;

  @Prop()
  religion: string; // Added from OLD

  @Prop()
  city: string;

  @Prop({ type: Object }) // Changed to Object to support OLD address object or NEW string (via mixed)
  // Actually, if I use Object, it might break if it's a string.
  // Mongoose Mixed type is safest.
  address: any;

  @Prop()
  pincode: string;

  @Prop()
  age: number;

  @Prop({ enum: ["Male", "Female", "Other"] })
  gender: string;

  @Prop()
  condition: string;

  @Prop()
  medicalHistory: string;

  @Prop()
  bloodGroup: string;

  @Prop()
  lastVisit: Date; // Added from OLD

  @Prop([String])
  medicalConditions: string[]; // Added from OLD

  @Prop([String])
  allergies: string[];

  @Prop([String])
  currentMedications: string[];

  @Prop({
    type: {
      contactName: String,
      relationship: String,
      countryCode: String,
      contactNumber: String,
    },
  })
  emergencyContact: {
    contactName: string;
    relationship: string;
    countryCode: string;
    contactNumber: string;
  };

  @Prop({ default: false })
  consentGiven: boolean;

  @Prop({
    enum: ["Active", "Discharged", "Pending", "On-Hold", "Inactive"],
    default: "Active",
  })
  status: string;

  @Prop({ enum: ["Patient", "Lead"], default: "Patient" })
  stage: string;

  @Prop({ type: Types.ObjectId, ref: "Therapist" })
  assignedTherapist: Types.ObjectId;

  @Prop()
  referPatientAppointmentTime: string;

  @Prop({ type: Types.ObjectId, ref: "Therapist" })
  referredBy: Types.ObjectId;

  @Prop({ default: false })
  isReferred: boolean;

  @Prop()
  referralAmount: number;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isDeleted: boolean;

  // --- Intelligence & Tracking (Phase 1/3) ---
  @Prop()
  latitude: number;

  @Prop()
  longitude: number;

  @Prop({ default: 100 }) // 100 meters default radius
  geoRadius: number;

  @Prop({ default: 0 })
  scheduledVisitsCount: number;

  @Prop({ default: 0 })
  completedVisitsCount: number;

  @Prop({ default: 0 })
  gpsDetectedVisitsCount: number;

  @Prop({ default: 0 })
  suspiciousVisitCount: number;

  @Prop({ default: 0 })
  leakageFlagCount: number;
}

export const PatientSchema = SchemaFactory.createForClass(Patient);

// Indexes for faster queries
PatientSchema.index({ phone: 1 });
PatientSchema.index({ email: 1 });
PatientSchema.index({ city: 1 });
PatientSchema.index({ status: 1 });
PatientSchema.index({ isDeleted: 1 });
