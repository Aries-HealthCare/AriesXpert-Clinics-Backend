import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Schema as MongooseSchema } from "mongoose";

export type FranchiseDocument = Franchise & Document;

@Schema({ timestamps: true })
export class Franchise {
  @Prop({ required: true, trim: true, unique: true })
  name: string; // Company Name

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "User" })
  ownerId: string; // Link to User for login

  // Owner Details (Snapshot or specific fields)
  @Prop()
  ownerName: string;

  @Prop()
  ownerEmail: string;

  @Prop()
  ownerPhone: string;

  @Prop()
  ownerPhoto: string;

  @Prop()
  companyAddress: string;

  // Location Hierarchy
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "Country" })
  countryId: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "State" })
  stateId: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "City" })
  cityId: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "Territory" })
  territoryId: string;

  // Franchise Details
  @Prop({
    type: String,
    enum: ["Single", "Multi", "Master"],
    default: "Single",
  })
  type: string;

  @Prop({ required: true, min: 0, max: 100 })
  royaltyPercentage: number;

  @Prop()
  franchiseFee: number;

  @Prop()
  agreementStartDate: Date;

  @Prop()
  agreementEndDate: Date;

  @Prop({
    type: String,
    enum: ["Active", "Suspended", "Inactive"],
    default: "Active",
  })
  status: string;

  // Documents
  @Prop({ type: [{ type: Object }] })
  documents: {
    type: string; // Agreement, License, Insurance
    url: string;
    expiryDate?: Date;
    status: "Valid" | "Expired" | "Pending";
  }[];

  @Prop({ type: Object, default: {} })
  settings: {
    pricingOverride?: boolean;
    salaryVisibility?: boolean;
    financialAccess?: boolean;
  };

  @Prop({ type: Date })
  contractDate: Date;
}

export const FranchiseSchema = SchemaFactory.createForClass(Franchise);
