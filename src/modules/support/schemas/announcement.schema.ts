import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AnnouncementDocument = Announcement & Document;

@Schema({ timestamps: true })
export class Announcement {
    @Prop({ required: true })
    title: string;

    @Prop({ required: true })
    content: string;

    @Prop({ type: Types.ObjectId, ref: 'User' })
    createdBy: Types.ObjectId;

    @Prop([String])
    recipients: string[];

    @Prop({
        enum: ['Active', 'Archived'],
        default: 'Active',
    })
    status: string;

    @Prop({ type: Object })
    metadata: Record<string, any>;
}

export const AnnouncementSchema = SchemaFactory.createForClass(Announcement);
