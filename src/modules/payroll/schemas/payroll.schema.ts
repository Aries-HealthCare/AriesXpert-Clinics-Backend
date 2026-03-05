import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Schema as MongooseSchema } from "mongoose";

export type PayrollDocument = Payroll & Document;

@Schema({ timestamps: true })
export class Payroll {
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: "Clinic", required: true })
    clinicId: string;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: "User", required: true })
    staffId: string;

    @Prop({ required: true })
    month: string; // e.g., '2023-10'

    @Prop({ required: true })
    basicSalary: number;

    @Prop({ default: 0 })
    bonus: number;

    @Prop({ default: 0 })
    deductions: number;

    @Prop({ required: true })
    finalSalary: number;

    @Prop({ default: "pending", enum: ["pending", "paid"] })
    status: string;

    @Prop()
    paymentDate?: Date;

    @Prop()
    notes?: string;
}

export const PayrollSchema = SchemaFactory.createForClass(Payroll);

// unique combination of month and staffId
PayrollSchema.index({ staffId: 1, month: 1 }, { unique: true });
