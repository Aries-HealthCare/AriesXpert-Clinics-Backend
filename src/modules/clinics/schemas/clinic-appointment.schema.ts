import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ClinicAppointmentDocument = ClinicAppointment & Document;

/**
 * ClinicAppointment — In-clinic appointment bookings.
 * Completely separate from HQ home-visit system (visits collection).
 * Collection: clinic_appointments
 */
@Schema({
    collection: 'clinic_appointments',
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
})
export class ClinicAppointment {
    @Prop({ type: Types.ObjectId, ref: 'Clinic', required: true, index: true })
    clinicId: Types.ObjectId;

    /** Auto-generated: APT-{YYYY}-{sequence} */
    @Prop({ index: true })
    appointmentNumber: string;

    @Prop({ type: Types.ObjectId, ref: 'ClinicPatient', required: true, index: true })
    patientId: Types.ObjectId;

    // Denormalized for fast reads
    @Prop() patientName?: string;
    @Prop() patientPhone?: string;

    @Prop({ type: Types.ObjectId, ref: 'ClinicUser', index: true })
    assignedToId?: Types.ObjectId;

    @Prop() assignedToName?: string; // denormalized

    @Prop({
        enum: ['first_consultation', 'follow_up', 'treatment_session', 'online', 'emergency'],
        default: 'first_consultation',
    })
    appointmentType: string;

    @Prop({
        enum: ['in_clinic', 'online', 'home_visit'],
        default: 'in_clinic',
    })
    visitMode: string;

    @Prop({ required: true })
    scheduledDate: Date;

    @Prop({ default: '' })
    scheduledTime: string; // "10:00 AM"

    @Prop({ default: 30 })
    duration: number; // minutes

    @Prop()
    chiefComplaint?: string;

    @Prop({
        enum: ['scheduled', 'confirmed', 'arrived', 'in_progress', 'completed', 'cancelled', 'no_show'],
        default: 'scheduled',
        index: true,
    })
    status: string;

    @Prop()
    cancellationReason?: string;

    // ─── Post-Visit Fields ────────────────────────────────────────────────────
    @Prop()
    consultationNotes?: string;

    @Prop()
    diagnosis?: string;

    @Prop({ type: [Object], default: [] })
    prescriptions?: Array<{
        medicine: string;
        dosage: string;
        frequency: string;
        duration: string;
    }>;

    @Prop()
    nextAppointmentDate?: Date;

    @Prop({ type: Types.ObjectId, ref: 'ClinicTreatment' })
    treatmentId?: Types.ObjectId;

    // ─── Billing ──────────────────────────────────────────────────────────────
    @Prop({ default: 0 })
    amount: number;

    @Prop({
        enum: ['pending', 'paid', 'partially_paid', 'waived'],
        default: 'pending',
    })
    paymentStatus: string;

    @Prop({ enum: ['cash', 'card', 'upi', 'insurance', 'online'], default: 'cash' })
    paymentMethod?: string;

    @Prop({ type: Types.ObjectId, ref: 'ClinicInvoice' })
    invoiceId?: Types.ObjectId;

    // ─── Metadata ─────────────────────────────────────────────────────────────
    @Prop({ type: Types.ObjectId, ref: 'ClinicUser' })
    recordedBy?: Types.ObjectId;

    @Prop()
    notes?: string; // Internal admin notes

    @Prop({ default: false })
    isDeleted: boolean;
}

export const ClinicAppointmentSchema = SchemaFactory.createForClass(ClinicAppointment);

// ─── Compound Indexes ─────────────────────────────────────────────────────────
ClinicAppointmentSchema.index({ clinicId: 1, scheduledDate: 1, status: 1 });
ClinicAppointmentSchema.index({ clinicId: 1, patientId: 1 });
ClinicAppointmentSchema.index({ clinicId: 1, assignedToId: 1, scheduledDate: 1 });
ClinicAppointmentSchema.index({ clinicId: 1, status: 1, scheduledDate: -1 });
