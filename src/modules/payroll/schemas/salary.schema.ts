import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type SalaryDocument = Salary & Document;

@Schema({ timestamps: true })
export class Salary {
    @Prop({ type: Types.ObjectId, ref: "Clinic", required: true })
    clinicId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: "User", required: true })
    staffId: Types.ObjectId;

    @Prop({ required: true })
    month: number; // 1-12

    @Prop({ required: true })
    year: number;

    @Prop({ required: true })
    baseSalary: number;

    @Prop({ default: 0 })
    allowances: number;

    @Prop({ default: 0 })
    deductions: number;

    @Prop({ default: 0 })
    bonuses: number;

    @Prop({ required: true })
    netSalary: number;

    @Prop({ enum: ["Pending", "Paid"], default: "Pending" })
    status: string;

    @Prop()
    paymentDate: Date;

    @Prop()
    paymentMethod: string;

    @Prop()
    transactionId: string;

    @Prop()
    payslipUrl: string;
}

export const SalarySchema = SchemaFactory.createForClass(Salary);

SalarySchema.index({ clinicId: 1, staffId: 1, year: 1, month: 1 }, { unique: true });
