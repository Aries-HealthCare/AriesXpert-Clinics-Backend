import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ClinicTreatmentDocument = ClinicTreatment & Document;

/**
 * ClinicTreatment — Treatment plans and session tracking for clinic patients.
 * Completely separate from HQ treatments collection.
 * Collection: clinic_treatments
 */
@Schema({
    collection: 'clinic_treatments',
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
})
export class ClinicTreatment {
    @Prop({ type: Types.ObjectId, ref: 'Clinic', required: true, index: true })
    clinicId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'ClinicPatient', required: true, index: true })
    patientId: Types.ObjectId;

    @Prop() patientName?: string; // denormalized

    /** Auto-generated: TRT-{CLINIC_CODE}-{sequence} */
    @Prop({ index: true })
    treatmentCode: string;

    @Prop({ required: true })
    treatmentName: string;

    @Prop()
    condition: string;

    @Prop()
    treatmentPlan: string; // Doctor's written plan

    @Prop()
    icd10Code?: string; // International diagnosis code

    @Prop({ type: Types.ObjectId, ref: 'ClinicUser' })
    assignedDoctorId?: Types.ObjectId;

    @Prop() assignedDoctorName?: string; // denormalized

    @Prop({ type: Types.ObjectId, ref: 'ClinicUser' })
    assignedTherapistId?: Types.ObjectId;

    @Prop() assignedTherapistName?: string; // denormalized

    @Prop({ required: true })
    startDate: Date;

    @Prop()
    expectedEndDate?: Date;

    @Prop()
    actualEndDate?: Date;

    @Prop({ default: 10 })
    totalSessions: number;

    @Prop({ default: 0 })
    completedSessions: number;

    @Prop({
        enum: ['active', 'on_hold', 'completed', 'discontinued'],
        default: 'active',
        index: true,
    })
    status: string;

    @Prop()
    discontinuationReason?: string;

    // ─── Session Records ──────────────────────────────────────────────────────
    @Prop({
        type: [{
            sessionNumber: Number,
            date: Date,
            conductedBy: Types.ObjectId,
            conductedByName: String,
            duration: Number,   // minutes
            notes: String,
            painScalePre: Number,   // 0-10
            painScalePost: Number,  // 0-10
            functionalImprovements: String,
            exercisesGiven: [String],
            homeProgram: String,
            attendanceStatus: { type: String, enum: ['attended', 'cancelled', 'no_show'], default: 'attended' },
        }],
        default: [],
    })
    sessions: Array<{
        sessionNumber: number;
        date: Date;
        conductedBy: Types.ObjectId;
        conductedByName?: string;
        duration?: number;
        notes?: string;
        painScalePre?: number;
        painScalePost?: number;
        functionalImprovements?: string;
        exercisesGiven?: string[];
        homeProgram?: string;
        attendanceStatus: string;
    }>;

    // ─── Progress & Outcome ───────────────────────────────────────────────────
    @Prop()
    progressNotes?: string;

    @Prop()
    outcomeScore?: number; // 0-100

    @Prop()
    outcomeNotes?: string;

    // ─── Billing ──────────────────────────────────────────────────────────────
    @Prop({ default: 0 })
    totalAmount: number;

    @Prop({ default: 0 })
    paidAmount: number;

    @Prop({ type: Types.ObjectId, ref: 'ClinicPackage' })
    packageId?: Types.ObjectId;

    @Prop({ default: false })
    isDeleted: boolean;
}

export const ClinicTreatmentSchema = SchemaFactory.createForClass(ClinicTreatment);

// ─── Compound Indexes ─────────────────────────────────────────────────────────
ClinicTreatmentSchema.index({ clinicId: 1, patientId: 1 });
ClinicTreatmentSchema.index({ clinicId: 1, status: 1 });
ClinicTreatmentSchema.index({ clinicId: 1, assignedDoctorId: 1 });
ClinicTreatmentSchema.index({ clinicId: 1, startDate: -1 });
