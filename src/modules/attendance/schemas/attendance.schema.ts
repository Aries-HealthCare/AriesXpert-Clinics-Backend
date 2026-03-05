import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Schema as MongooseSchema } from "mongoose";

export type AttendanceDocument = Attendance & Document;

export enum AttendanceStatus {
    PRESENT = "present",
    ABSENT = "absent",
    LEAVE = "leave",
    HALF_DAY = "half_day"
}

@Schema({ timestamps: true })
export class Attendance {
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: "Clinic", required: true })
    clinicId: string;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: "User", required: true })
    staffId: string;

    @Prop({ required: true })
    date: Date;

    @Prop({ enum: AttendanceStatus, required: true })
    status: string;

    @Prop()
    checkInTime?: Date;

    @Prop()
    checkOutTime?: Date;

    @Prop()
    notes?: string;
}

export const AttendanceSchema = SchemaFactory.createForClass(Attendance);

// unique combination of date and staffId
AttendanceSchema.index({ staffId: 1, date: 1 }, { unique: true });
