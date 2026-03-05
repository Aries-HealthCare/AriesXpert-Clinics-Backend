import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type RegisteredClinicDocument = RegisteredClinic & Document;

@Schema({ timestamps: true, collection: 'registered_clinics' })
export class RegisteredClinic {
    @Prop({ required: true, unique: true })
    clinicId: string; // Original ID from main database

    @Prop({ required: true })
    clinicName: string;

    @Prop({ required: true, unique: true })
    clinicCode: string;

    @Prop({ required: true })
    ownerId: string;

    @Prop()
    clinicChainId: string;

    @Prop({ required: true, unique: true })
    databaseName: string;

    @Prop({ default: 'active' })
    status: string;
}

export const RegisteredClinicSchema = SchemaFactory.createForClass(RegisteredClinic);
