import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type VisitDocument = Visit & Document;

@Schema({
  collection: "appointments",
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (doc, ret) => {
      // Merge OLD fields into NEW expected fields
      ret.patientId = ret.patientId || ret.patient;
      ret.therapistId = ret.therapistId || ret.therapist || ret.expert;
      ret.visitDate = ret.visitDate || ret.appointmentDate;
      ret.startTime = ret.startTime || ret.appointmentDate;
      ret.status = ret.status || ret.appointmentStatus || "scheduled";
      ret.visitType = ret.visitType; // Same name

      // Ensure ID is present
      ret.id = ret._id.toString();

      return ret;
    },
  },
  toObject: { virtuals: true },
})
export class Visit {
  // NEW Fields (Keep for compatibility if new data is created)
  @Prop({ type: Types.ObjectId, ref: "Appointment" })
  appointmentId?: Types.ObjectId;

  // OLD Field: patient (Ref to Patient)
  @Prop({ type: Types.ObjectId, ref: "Patient" })
  patient: Types.ObjectId;

  // OLD Field: treatment (Ref to Treatment)
  @Prop({ type: Types.ObjectId, ref: "Treatment" })
  treatment: Types.ObjectId;

  // OLD Field: therapist (Ref to User/Therapist) - assuming field name 'therapist' or 'expert'
  @Prop({ type: Types.ObjectId, ref: "User" })
  therapist: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User" })
  expert: Types.ObjectId; // Alternate name

  @Prop({ type: Types.ObjectId, ref: "Clinic" })
  clinicId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Franchise" })
  franchiseId: Types.ObjectId;

  // OLD Field: appointmentDate
  @Prop()
  appointmentDate: Date;

  // OLD Field: appointmentTime
  @Prop()
  appointmentTime: string;

  // OLD Field: appointmentDuration
  @Prop()
  appointmentDuration: string;

  // OLD Field: visitType
  @Prop()
  visitType: string;

  // OLD Field: appointmentStatus
  @Prop()
  appointmentStatus: string;

  // NEW Field required for Clinic Portal
  @Prop({ enum: ["clinic", "home", "video"], default: "clinic" })
  consultation_type: string;

  // OLD Field: sessionAmount
  @Prop()
  sessionAmount: string;

  // OLD Field: therapistSessionAmount
  @Prop()
  therapistSessionAmount: string;

  // NEW Fields mapping to OLD data via Virtuals

  // patientId -> patient
  @Prop({ type: Types.ObjectId, ref: "Patient" }) // Optional: explicit prop if needed
  patientId: Types.ObjectId;

  // therapistId -> therapist/expert
  @Prop({ type: Types.ObjectId, ref: "User" })
  therapistId: Types.ObjectId;

  @Prop()
  visitDate: Date;

  @Prop()
  startTime: Date;

  @Prop()
  completedAt: Date;

  @Prop()
  duration: number; // in minutes

  @Prop()
  notes: string;

  @Prop({ type: Object })
  vitalSigns: Record<string, any>; // BP, Pulse, SpO2

  @Prop({ type: [String] })
  attachments: string[]; // URLs

  @Prop({ default: 1 })
  sessionNumber: number;

  @Prop({ default: "Scheduled" })
  status: string; // Scheduled, Reminder Sent, Arrived, Treatment Started, Completed, Payment Pending, Payment Done

  // ========== PAYMENT FIELDS ==========
  @Prop({ type: Number })
  amountDue: number;

  @Prop({ type: Number })
  amountPaid: number;

  @Prop({ default: false })
  paymentRequired: boolean;

  @Prop({
    enum: ["pending", "link_sent", "paid", "failed", "expired"],
    default: "pending",
  })
  paymentStatus: string;

  @Prop({
    enum: ["scheduled", "in_progress", "awaiting_payment", "completed"],
    default: "scheduled",
  })
  visitStatus: string;

  @Prop({ type: Types.ObjectId, ref: "PaymentTransaction" })
  paymentTransactionId: Types.ObjectId;

  @Prop()
  paymentLinkId: string;

  @Prop({ type: Array, default: [] })
  paymentAuditLog: Array<{
    timestamp: Date;
    action: string;
    details: string;
  }>;

  @Prop()
  paymentWaivedBy: string;

  @Prop()
  paymentWaiverReason: string;
}

export const VisitSchema = SchemaFactory.createForClass(Visit);

// Virtuals to bridge OLD -> NEW
VisitSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

// Map patientId to patient if patientId is missing
VisitSchema.pre("save", function (next) {
  if (this.patient && !this.patientId) {
    this.patientId = this.patient;
  }
  if (this.therapist && !this.therapistId) {
    this.therapistId = this.therapist;
  }
  if (this.expert && !this.therapistId) {
    this.therapistId = this.expert;
  }
  if (this.appointmentDate && !this.visitDate) {
    this.visitDate = this.appointmentDate;
  }
  if (this.appointmentDate && !this.startTime) {
    this.startTime = this.appointmentDate;
  }
  if (this.appointmentStatus && !this.status) {
    this.status = this.appointmentStatus;
  }
  next();
});

// Also use virtuals for read-only access (redundant with toJSON transform but good for code access)
VisitSchema.virtual("virtualPatientId").get(function () {
  return this.patientId || this.patient;
});

VisitSchema.virtual("virtualTherapistId").get(function () {
  return this.therapistId || this.therapist || this.expert;
});

VisitSchema.virtual("virtualStartTime").get(function () {
  return this.startTime || this.appointmentDate;
});

VisitSchema.virtual("virtualStatus").get(function () {
  return this.status || this.appointmentStatus || "scheduled";
});
