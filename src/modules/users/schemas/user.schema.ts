import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Schema as MongooseSchema } from "mongoose";
import * as bcrypt from "bcrypt";

export type UserDocument = User & Document;

export enum UserRole {
  THERAPIST = "therapist",
  ADMIN = "admin",
  COORDINATOR = "coordinator",
  MANAGER = "manager",
  TEAM_LEADER = "team_leader",
  DOCTOR = "doctor",
  SUPER_ADMIN = "super_admin", // Added for founder mock
  FOUNDER = "founder",
  COO = "coo",
  CFO = "cfo",
  CMO = "cmo",
  BDM = "bdm",
  COUNTRY_MANAGER = "countryManager",
  STATE_MANAGER = "stateManager",
  CITY_MANAGER = "cityManager",
  AREA_MANAGER = "areaManager",
  FIELD_EXECUTIVE = "fieldExecutive",
  CLINIC_OWNER = "clinic_owner",
  CLINIC_ADMIN = "clinic_admin",
  RECEPTIONIST = "receptionist",
  PHYSIOTHERAPIST = "physiotherapist",
  ACCOUNTS_MANAGER = "accounts_manager",
}

@Schema({ _id: false })
export class Hierarchy {
  @Prop({ default: "India" })
  country: string;

  @Prop()
  state: string;

  @Prop()
  city: string;

  @Prop()
  area: string;
}

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, trim: true })
  firstName: string;

  @Prop({ required: true, trim: true })
  lastName: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true, minlength: 8, select: false })
  password: string;

  @Prop({ unique: true, sparse: true })
  phone: string;

  @Prop()
  status: string; // PENDING_APPROVAL, ACTIVE, REJECTED, SUSPENDED

  @Prop({ type: Object })
  professionalDetails?: {
    qualification?: string;
    specialisation?: string[];
    experienceYears?: number;
    licenseNumber?: string;
    licenseAuthority?: string;
    clinicRole?: string; // Owner, Clinical Head, Employee
  };

  @Prop({ type: Object })
  documents?: {
    idProof?: string;
    addressProof?: string;
    licenseCert?: string;
    degreeCert?: string;
    experienceCert?: string;
    additionalCert?: string;
  };

  @Prop({ enum: UserRole, default: UserRole.THERAPIST })
  role: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "Clinic" })
  clinicId: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "Franchise" })
  franchiseId: string;

  @Prop({ type: Hierarchy })
  hierarchy: Hierarchy;

  @Prop({ default: "+91" })
  countryCode: string;

  @Prop({ enum: ["Male", "Female", "Other"] })
  gender: string;

  @Prop()
  dob: Date;

  @Prop()
  address: string;

  @Prop()
  profileImage: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isVerified: boolean;

  @Prop({ type: Object, default: {} })
  salaryConfig: {
    type: "fixed" | "commission" | "per-visit" | "hybrid";
    fixedAmount?: number;
    commissionPercentage?: number;
    perVisitRate?: number;
    referralBonus?: number;
  };

  @Prop()
  fcmToken: string;

  @Prop()
  lastLogin: Date;

  // Verification & Security
  @Prop({ default: false })
  email_verified: boolean;

  @Prop({ default: false })
  mobile_verified: boolean;

  @Prop()
  email_verified_at: Date;

  @Prop()
  mobile_verified_at: Date;

  @Prop({ select: false })
  verification_token: string;

  @Prop({ default: 0 })
  otp_attempt_count: number;

  @Prop()
  otp_expiry_time: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Hash password hook
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(12);
    this["password"] = await bcrypt.hash(this["password"], salt);
    next();
  } catch (err) {
    next(err);
  }
});
