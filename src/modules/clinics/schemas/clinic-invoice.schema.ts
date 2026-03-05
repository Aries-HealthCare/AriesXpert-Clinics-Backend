import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ClinicInvoiceDocument = ClinicInvoice & Document;

/**
 * ClinicInvoice — Billing records for clinic patients.
 * Completely separate from HQ invoices collection.
 * Collection: clinic_invoices
 */
@Schema({
    collection: 'clinic_invoices',
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
})
export class ClinicInvoice {
    @Prop({ type: Types.ObjectId, ref: 'Clinic', required: true, index: true })
    clinicId: Types.ObjectId;

    /** Auto-generated: INV-{CLINIC_CODE}-{sequence} */
    @Prop({ index: true })
    invoiceNumber: string;

    @Prop({ type: Types.ObjectId, ref: 'ClinicPatient', required: true, index: true })
    patientId: Types.ObjectId;

    @Prop() patientName?: string; // denormalized for fast reads

    @Prop({ type: Types.ObjectId, ref: 'ClinicAppointment' })
    appointmentId?: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'ClinicTreatment' })
    treatmentId?: Types.ObjectId;

    @Prop({ default: Date.now })
    issueDate: Date;

    @Prop()
    dueDate?: Date;

    // ─── Line Items ───────────────────────────────────────────────────────────
    @Prop({
        type: [{
            description: String,
            category: {
                type: String,
                enum: ['consultation', 'treatment', 'procedure', 'medicine', 'package', 'lab', 'other'],
                default: 'consultation',
            },
            quantity: { type: Number, default: 1 },
            unitPrice: { type: Number, default: 0 },
            discount: { type: Number, default: 0 },
            gstRate: { type: Number, default: 0 },
            total: { type: Number, default: 0 },
        }],
        default: [],
    })
    lineItems: Array<{
        description: string;
        category: string;
        quantity: number;
        unitPrice: number;
        discount: number;
        gstRate: number;
        total: number;
    }>;

    // ─── Totals ───────────────────────────────────────────────────────────────
    @Prop({ default: 0 })
    subtotal: number;

    @Prop({ default: 0 })
    discountTotal: number;

    @Prop({ default: 0 })
    taxAmount: number;

    @Prop({ default: 0 })
    totalAmount: number;

    @Prop({ default: 0 })
    paidAmount: number;

    // Computed: totalAmount - paidAmount
    @Prop({ default: 0 })
    balanceAmount: number;

    // ─── Status ───────────────────────────────────────────────────────────────
    @Prop({
        enum: ['draft', 'pending', 'paid', 'partially_paid', 'overdue', 'cancelled'],
        default: 'pending',
        index: true,
    })
    status: string;

    // ─── Payment History ──────────────────────────────────────────────────────
    @Prop({
        type: [{
            amount: Number,
            method: { type: String, enum: ['cash', 'card', 'upi', 'insurance', 'online'] },
            date: Date,
            reference: String,
            recordedBy: Types.ObjectId,
        }],
        default: [],
    })
    paymentHistory: Array<{
        amount: number;
        method: string;
        date: Date;
        reference?: string;
        recordedBy?: Types.ObjectId;
    }>;

    @Prop()
    notes?: string;

    @Prop({ type: Types.ObjectId, ref: 'ClinicUser' })
    generatedBy?: Types.ObjectId;

    @Prop({ default: false })
    isDeleted: boolean;
}

export const ClinicInvoiceSchema = SchemaFactory.createForClass(ClinicInvoice);

// ─── Compound Indexes ─────────────────────────────────────────────────────────
ClinicInvoiceSchema.index({ clinicId: 1, status: 1 });
ClinicInvoiceSchema.index({ clinicId: 1, patientId: 1 });
ClinicInvoiceSchema.index({ clinicId: 1, issueDate: -1 });
ClinicInvoiceSchema.index({ clinicId: 1, totalAmount: 1, status: 1 });
