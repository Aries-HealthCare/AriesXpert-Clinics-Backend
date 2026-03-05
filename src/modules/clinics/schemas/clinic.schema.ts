import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Schema as MongooseSchema } from "mongoose";

export type ClinicDocument = Clinic & Document;

@Schema({ timestamps: true })
export class Clinic {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ unique: true })
  clinicCode: string; // Auto-generated

  @Prop({
    type: String,
    enum: ["COMPANY_OWNED", "CO_BRAND", "FULLY_BRAND", "OWN_BRAND", "FRANCHISE_BRAND", "CO_BRANDED"],
    default: "CO_BRAND",
  })
  type: string;

  @Prop()
  displayName: string;

  @Prop()
  landline: string;

  @Prop()
  yearEstablished: number;

  @Prop({ type: [String], default: [] })
  services: string[];

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "Franchise" })
  franchiseId: string;

  // Location Hierarchy
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "Country" })
  countryId: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "State" })
  stateId: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "City" })
  cityId: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "Territory" })
  territoryId: string;

  @Prop({ type: Object })
  address: {
    line1?: string;
    line2?: string;
    street?: string;
    landmark?: string;
    country?: string;
    state?: string;
    city?: string;
    area?: string;
    pincode?: string;
    coordinates?: { lat: number; lng: number }; // Google Map
  };

  @Prop()
  phone: string;

  @Prop()
  email: string;

  @Prop()
  taxNumber: string; // GST/VAT

  @Prop({
    type: String,
    enum: ["active", "inactive", "coming_soon", "suspended", "pending_approval", "rejected", "info_required"],
    default: "pending_approval",
  })
  status: string;

  @Prop()
  ownerName?: string;

  @Prop()
  staffCount?: number;

  @Prop()
  yearsInOperation?: number;

  @Prop({ type: Object, default: {} })
  documents?: {
    registrationCert?: string;
    gstCert?: string;
    ownerIdProof?: string;
    ownerAddressProof?: string;
    ownerPhoto?: string;
    clinicPhotos?: string[];
    degreeCert?: string;
  };

  @Prop()
  approvedAt?: Date;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "User" })
  approvedBy?: string;

  @Prop({ type: Object, default: {} })
  settings: {
    allowCityWideHomeVisits?: boolean;
    pricingOverride?: boolean;
    salaryVisibility?: boolean;
    tempPassword?: string;
  };
}

export const ClinicSchema = SchemaFactory.createForClass(Clinic);

// Auto-generate Clinic Code
ClinicSchema.pre("save", async function (next) {
  if (!this.clinicCode) {
    const count = await this.collection.countDocuments();
    this.clinicCode = `APC-${1000 + count}`;
  }
  next();
});
