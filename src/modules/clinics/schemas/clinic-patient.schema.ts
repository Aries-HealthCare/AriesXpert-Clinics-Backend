import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ClinicPatientDocument = ClinicPatient & Document;

/**
 * ClinicPatient — Patients that belong ONLY to a registered Clinic.
 * Completely separate from HQ AriesXpertV2 home-visit patients.
 * Collection: clinic_patients
 */
@Schema({
    collection: 'clinic_patients',
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
})
export class ClinicPatient {
    @Prop({ type: Types.ObjectId, ref: 'Clinic', required: true, index: true })
    clinicId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'ClinicChain', index: true })
    chainId?: Types.ObjectId;

    /** Auto-generated: CP-{CLINIC_CODE}-{sequence} */
    @Prop({ index: true })
    patientCode: string;

    // ─── Personal Info ────────────────────────────────────────────────────────
    @Prop({ required: true, trim: true })
    firstName: string;

    @Prop({ trim: true, default: '' })
    lastName: string;

    @Prop({ required: true })
    phone: string;

    @Prop({ lowercase: true, trim: true })
    email?: string;

    @Prop({ enum: ['Male', 'Female', 'Other'] })
    gender?: string;

    @Prop()
    dob?: Date;

    @Prop()
    age?: number;

    @Prop()
    bloodGroup?: string;

    @Prop({ type: Object })
    address?: {
        line1?: string;
        line2?: string;
        city?: string;
        state?: string;
        pincode?: string;
        country?: string;
    };

    @Prop({ type: Object })
    emergencyContact?: {
        name?: string;
        phone?: string;
        relation?: string;
    };

    // ─── Medical Info ─────────────────────────────────────────────────────────
    @Prop({ type: Object, default: {} })
    medicalHistory?: {
        conditions?: string[];
        allergies?: string[];
        medications?: string[];
        surgeries?: string[];
        notes?: string;
    };

    @Prop()
    currentDiagnosis?: string;

    @Prop()
    referredBy?: string;

    @Prop()
    referralSource?: string; // 'walkin' | 'referral' | 'online' | 'lead'

    // ─── Status & Tracking ────────────────────────────────────────────────────
    @Prop({
        enum: ['active', 'inactive', 'discharged'],
        default: 'active',
    })
    status: string;

    @Prop({ type: Types.ObjectId, ref: 'ClinicUser' })
    assignedDoctorId?: Types.ObjectId;

    @Prop()
    lastVisitDate?: Date;

    @Prop({ default: 0 })
    totalSessions: number;

    @Prop({ default: 0 })
    totalBilled: number;

    @Prop({ type: Object })
    profilePhoto?: string;

    @Prop({ default: false })
    isDeleted: boolean;
}

export const ClinicPatientSchema = SchemaFactory.createForClass(ClinicPatient);

// ─── Compound Indexes ─────────────────────────────────────────────────────────
ClinicPatientSchema.index({ clinicId: 1, phone: 1 }, { unique: true });
ClinicPatientSchema.index({ clinicId: 1, status: 1 });
ClinicPatientSchema.index({ clinicId: 1, lastVisitDate: -1 });
ClinicPatientSchema.index({ clinicId: 1, isDeleted: 1 });
ClinicPatientSchema.index(
    { clinicId: 1, firstName: 'text', lastName: 'text', phone: 'text' },
    { name: 'clinic_patient_search' }
);
