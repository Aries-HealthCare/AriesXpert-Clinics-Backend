import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type EmailSettingDocument = EmailSetting & Document;

@Schema({ timestamps: true })
export class EmailSetting {
    @Prop({ required: true })
    host: string;

    @Prop({ required: true })
    port: number;

    @Prop({ required: true })
    username: string;

    @Prop({ required: true })
    password_encrypted: string;

    @Prop({ default: false })
    tls: boolean;

    @Prop({ default: true })
    ssl: boolean;

    @Prop({ required: true })
    from_name: string;

    @Prop({ required: true })
    from_email: string;

    @Prop()
    reply_to: string;

    @Prop()
    updated_by: string;
}

export const EmailSettingSchema = SchemaFactory.createForClass(EmailSetting);
