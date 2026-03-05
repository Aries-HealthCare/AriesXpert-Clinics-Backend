import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true })
export class Notification {
    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    userId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'Therapist' })
    therapistId: Types.ObjectId;

    @Prop({ required: true })
    title: string;

    @Prop({ required: true })
    message: string;

    @Prop({
        default: 'general',
        enum: ['general', 'lead', 'broadcast', 'appointment', 'visit', 'payment', 'wallet', 'withdrawal', 'sos', 'admin', 'announcement', 'chat'],
    })
    type: string;

    @Prop({ default: false })
    isRead: boolean;

    @Prop({ type: Object })
    meta: Record<string, any>;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ therapistId: 1, createdAt: -1 });
