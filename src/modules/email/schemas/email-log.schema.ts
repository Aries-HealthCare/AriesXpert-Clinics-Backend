import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type EmailLogDocument = EmailLog & Document;

@Schema({ timestamps: true })
export class EmailLog {
    @Prop({ required: true })
    recipient: string;

    @Prop({ required: true })
    subject: string;

    @Prop({ required: true, enum: ['success', 'failed'] })
    status: string;

    @Prop()
    error_message: string;
}

export const EmailLogSchema = SchemaFactory.createForClass(EmailLog);
