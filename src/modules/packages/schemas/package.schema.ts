import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type PackageDocument = Package & Document;

@Schema({ timestamps: true })
export class Package {
  @Prop({ type: Types.ObjectId, ref: "Clinic" })
  clinicId: Types.ObjectId;
  @Prop({ required: true, trim: true })
  packageName: string;

  @Prop({ trim: true })
  description: string;

  @Prop({ required: true })
  numberOfSessions: number;

  @Prop({ trim: true })
  duration: string;

  @Prop({ required: true })
  price: number;

  @Prop()
  discountedPrice: number;

  @Prop()
  offerAmount: number;

  @Prop()
  country: string;

  @Prop()
  state: string;

  @Prop()
  city: string;

  @Prop({ type: [String], default: [] })
  areas: string[];

  @Prop({ type: [String], default: [] })
  pincodes: string[];

  @Prop({ default: "Medium" })
  popularity: string;

  @Prop({ type: [String] })
  visitFrequency: string[];

  @Prop({ default: "Active" })
  status: string;

  @Prop()
  treatmentPlan: string;

  @Prop({ type: [String], default: [] })
  features: string[];

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop({ default: true })
  isActive: boolean;
}

export const PackageSchema = SchemaFactory.createForClass(Package);
