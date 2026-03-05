import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SosSessionDocument = SosSession & Document;

@Schema({ timestamps: true })
export class SosSession {
    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    userId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'Therapist', required: true })
    therapistId: Types.ObjectId;

    @Prop({ required: true })
    therapistName: string;

    @Prop({ required: true })
    phone: string;

    @Prop({ enum: ['ACTIVE', 'RESOLVED', 'ESCALATED', 'CANCELLED'], default: 'ACTIVE' })
    status: string;

    @Prop()
    resolutionPin: string;

    @Prop({ type: Object })
    startLocation: {
        latitude: number;
        longitude: number;
        accuracy?: number;
    };

    @Prop({ type: Object })
    lastLocation: {
        latitude: number;
        longitude: number;
        accuracy?: number;
        batteryLevel?: number;
        networkStrength?: string;
        updatedAt: Date;
    };

    @Prop()
    liveAudioUrl: string;

    @Prop()
    liveVideoUrl: string;

    @Prop()
    resolvedAt: Date;

    @Prop()
    escalatedAt: Date;

    @Prop({ type: Types.ObjectId, ref: 'User' })
    resolvedByAdminId: Types.ObjectId;

    @Prop()
    notes: string;
}

export const SosSessionSchema = SchemaFactory.createForClass(SosSession);
SosSessionSchema.index({ userId: 1, status: 1 });
SosSessionSchema.index({ therapistId: 1 });
SosSessionSchema.index({ createdAt: -1 });

@Schema({ timestamps: true })
export class SosLocationLog {
    @Prop({ type: Types.ObjectId, ref: 'SosSession', required: true })
    sosId: Types.ObjectId;

    @Prop({ required: true })
    latitude: number;

    @Prop({ required: true })
    longitude: number;

    @Prop()
    accuracy: number;

    @Prop()
    batteryLevel: number;

    @Prop()
    networkStrength: string;

    @Prop({ default: Date.now })
    timestamp: Date;
}

export const SosLocationLogSchema = SchemaFactory.createForClass(SosLocationLog);
SosLocationLogSchema.index({ sosId: 1, timestamp: -1 });

@Schema({ timestamps: true })
export class SosActivityLog {
    @Prop({ type: Types.ObjectId, ref: 'SosSession', required: true })
    sosId: Types.ObjectId;

    @Prop({ required: true, enum: ['ACTIVATED', 'PIN_GENERATED', 'RESOLVED', 'ESCALATED', 'STREAM_STARTED', 'SIGNAL_LOST'] })
    eventType: string;

    @Prop()
    performedBy: string; // userId or 'SYSTEM' or 'THERAPIST'

    @Prop()
    details: string;

    @Prop({ default: Date.now })
    timestamp: Date;
}

export const SosActivityLogSchema = SchemaFactory.createForClass(SosActivityLog);
SosActivityLogSchema.index({ sosId: 1, timestamp: -1 });
