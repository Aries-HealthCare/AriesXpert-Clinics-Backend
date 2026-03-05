import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type ClinicAccountDocument = ClinicAccount & Document;

export enum AccountType {
    INCOME = "INCOME",
    EXPENSE = "EXPENSE",
}

export enum AccountCategory {
    WALK_IN = "Walk-in revenue",
    HOME_VISIT = "Home visit revenue",
    CONSULTATION = "Consultation charges",
    PACKAGE = "Package sales",
    SALARY = "Salary paid",
    RENT = "Rent",
    EQUIPMENT = "Equipment",
    UTILITY = "Utility bills",
    MARKETING = "Marketing",
    OTHER = "Other",
}

@Schema({ timestamps: true })
export class ClinicAccount {
    @Prop({ type: Types.ObjectId, ref: "Clinic", required: true })
    clinicId: Types.ObjectId;

    @Prop({ required: true, enum: AccountType })
    type: AccountType;

    @Prop({ required: true, enum: AccountCategory })
    category: AccountCategory;

    @Prop({ required: true })
    amount: number;

    @Prop({ required: true })
    date: Date;

    @Prop()
    description: string;

    @Prop()
    referenceId: string; // E.g. Invoice ID, Staff ID, etc.

    @Prop({ type: Types.ObjectId, ref: "User" }) // The person who recorded this
    recordedBy: Types.ObjectId;
}

export const ClinicAccountSchema = SchemaFactory.createForClass(ClinicAccount);

// Indexes
ClinicAccountSchema.index({ clinicId: 1, type: 1, date: -1 });
