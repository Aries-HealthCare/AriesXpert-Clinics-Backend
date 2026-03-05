import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, ObjectId } from "mongoose";
import * as mongoose from "mongoose";

export enum OTPStatus {
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
}

@Schema({ timestamps: true })
export class OTPRecord extends Document {
  @Prop({ required: true })
  mobile: string;

  @Prop({ required: true })
  countryCode: string;

  @Prop({ type: String, enum: OTPStatus, required: true })
  status: OTPStatus;

  @Prop()
  requestId: string;

  @Prop({ type: Object })
  log: any;

  @Prop({ default: 0 })
  resendCount: number;

  @Prop({ default: false })
  isVerified: boolean;

  @Prop()
  verifiedAt: Date;

  @Prop()
  expiresAt: Date;

  createdAt: Date;
  updatedAt: Date;
}

export const OTPRecordSchema = SchemaFactory.createForClass(OTPRecord);
