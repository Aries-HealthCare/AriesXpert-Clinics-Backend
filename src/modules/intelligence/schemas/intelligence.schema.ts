import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PatientLocationDocument = PatientLocation & Document;

@Schema({ timestamps: true })
export class PatientLocation {
    @Prop({ type: Types.ObjectId, ref: 'Patient', required: true, unique: true })
    patientId: Types.ObjectId;

    @Prop({ required: true })
    latitude: number;

    @Prop({ required: true })
    longitude: number;

    @Prop({ default: 100 }) // Default 100 meters radius
    geoRadius: number;

    @Prop({ default: true })
    isActive: boolean;
}

export const PatientLocationSchema = SchemaFactory.createForClass(PatientLocation);
PatientLocationSchema.index({ latitude: 1, longitude: 1 });

@Schema({ timestamps: true })
export class TherapistLocationLog {
    @Prop({ type: Types.ObjectId, ref: 'Therapist', required: true })
    therapistId: Types.ObjectId;

    @Prop({ required: true })
    latitude: number;

    @Prop({ required: true })
    longitude: number;

    @Prop()
    accuracy: number;

    @Prop()
    batteryLevel: number;

    @Prop()
    networkType: string;

    @Prop({ default: Date.now })
    timestamp: Date;
}

export const TherapistLocationLogSchema = SchemaFactory.createForClass(TherapistLocationLog);
TherapistLocationLogSchema.index({ therapistId: 1, timestamp: -1 });

@Schema({ timestamps: true })
export class VisitIntegrityLog {
    @Prop({ type: Types.ObjectId, ref: 'Therapist', required: true })
    therapistId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'Patient', required: true })
    patientId: Types.ObjectId;

    @Prop({
        required: true,
        enum: ['VALID_VISIT', 'UNAUTHORIZED_DETECTION', 'CLOSED_CASE_VISIT', 'FORM_SUBMISSION_DELAY']
    })
    eventType: string;

    @Prop()
    durationMinutes: number;

    @Prop({ type: Object })
    metadata: any; // Extra info like battery, accuracy etc.

    @Prop({ default: Date.now })
    timestamp: Date;
}

export const VisitIntegrityLogSchema = SchemaFactory.createForClass(VisitIntegrityLog);
VisitIntegrityLogSchema.index({ therapistId: 1, patientId: 1, eventType: 1 });

@Schema({ timestamps: true })
export class LeakageFlag {
    @Prop({ type: Types.ObjectId, ref: 'Therapist', required: true })
    therapistId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'Patient', required: true })
    patientId: Types.ObjectId;

    @Prop({ required: true })
    reason: string;

    @Prop({ enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'MEDIUM' })
    severityLevel: string;

    @Prop({ default: false })
    isResolved: boolean;

    @Prop()
    resolvedAt: Date;

    @Prop({ type: Types.ObjectId, ref: 'User' })
    resolvedBy: Types.ObjectId;

    @Prop()
    notes: string;
}

export const LeakageFlagSchema = SchemaFactory.createForClass(LeakageFlag);
LeakageFlagSchema.index({ therapistId: 1, severityLevel: 1 });
