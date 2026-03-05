import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type TherapistDocument = Therapist & Document;

@Schema({ _id: false })
export class Location {
  @Prop()
  city: string;
  @Prop()
  state: string;
  @Prop({ default: "India" })
  country: string;
}

@Schema({ _id: false })
export class LiveLocation {
  @Prop({ required: true })
  latitude: number;
  @Prop({ required: true })
  longitude: number;
  @Prop({ default: Date.now })
  lastUpdated: Date;
}

@Schema({ _id: false })
export class DigitalId {
  @Prop()
  idNumber: string;
  @Prop()
  issueDate: Date;
  @Prop()
  expiryDate: Date;
}

@Schema({ _id: false })
export class BankDetails {
  @Prop()
  accountHolderName: string;
  @Prop()
  bankName: string;
  @Prop()
  accountNumber: string;
  @Prop()
  ifscCode: string;
  @Prop()
  branchName: string;
  @Prop()
  upiId: string;
  @Prop()
  cancelledChequeUrl: string;
  @Prop({ enum: ["pending", "approved", "rejected"], default: "pending" })
  bankVerificationStatus: string;
  @Prop()
  rejectionReason: string;
  @Prop({ type: Types.ObjectId, ref: "User" })
  verifiedBy: Types.ObjectId;
  @Prop()
  verifiedAt: Date;
  @Prop({ default: Date.now })
  updatedAt: Date;

  @Prop()
  panNumber: string;
  @Prop({ type: Object })
  panCard: {
    name: string;
    url: string;
    status: "pending" | "approved" | "rejected";
    reason?: string;
  };

  @Prop()
  businessName: string;
  @Prop()
  accountType: string;
}

@Schema({ _id: false })
export class NationalId {
  @Prop()
  type: string;
  @Prop()
  number: string;
  @Prop({ type: Object })
  docUrl: {
    url: string;
    status: "pending" | "approved" | "rejected";
    reason?: string;
  };
  @Prop()
  secondaryType: string;
  @Prop()
  secondaryNumber: string;
  @Prop({ type: Object })
  secondaryDocUrl: {
    url: string;
    status: "pending" | "approved" | "rejected";
    reason?: string;
  };
}

@Schema({ _id: false })
export class ProfessionalInfo {
  @Prop()
  professionalRole: string;
  @Prop([String])
  extraCertifications: string[];
  @Prop()
  otherExtraCertification: string;
  @Prop([String])
  qualificationAndSpecializations: string[];
  @Prop()
  otherQualificationAndSpecialization: string;
  @Prop()
  currentlyWorking: string;
  @Prop()
  experience: string;
  @Prop()
  experienceInMonth: string;
  @Prop([String])
  serviceTypes: string[];
  @Prop()
  licenseNumber: string;
  @Prop({
    type: {
      name: String,
      url: String,
      status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
      reason: String,
    },
  })
  license: {
    name: string;
    url: string;
    status: "pending" | "approved" | "rejected";
    reason?: string;
  };
  @Prop({
    type: {
      name: String,
      url: String,
      status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
      reason: String,
    },
  })
  cvResume: {
    name: string;
    url: string;
    status: "pending" | "approved" | "rejected";
    reason?: string;
  };
  @Prop({
    type: {
      name: String,
      url: String,
      status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
      reason: String,
    },
  })
  degreeCertificate: {
    name: string;
    url: string;
    status: "pending" | "approved" | "rejected";
    reason?: string;
  };
  @Prop([
    {
      name: String,
      url: String,
      status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
      reason: String,
    },
  ])
  certifications: {
    name: string;
    url: string;
    status: "pending" | "approved" | "rejected";
    reason?: string;
  }[];
  @Prop()
  isEstablishment: boolean;
  @Prop()
  establishmentName: string;
  @Prop()
  establishmentDuration: string;
}

@Schema({ _id: false })
export class AreaOfServiceInfo {
  @Prop()
  city: string;
  @Prop()
  cityId: string;
  @Prop([String])
  areas: string[];
}

@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class Therapist {
  @Prop({ type: Types.ObjectId, ref: "User", required: true, unique: true })
  userId: Types.ObjectId;

  @Prop({ default: false })
  isProfileComplete: boolean;

  @Prop([
    {
      field: String,
      issue: String,
      expected: String,
      received: String,
    },
  ])
  validationErrors: {
    field: string;
    issue: string;
    expected: string;
    received: string;
  }[];

  @Prop()
  phone: string;

  @Prop()
  countryCode: string;

  @Prop({ trim: true })
  firstName: string;

  @Prop({ trim: true })
  lastName: string;

  @Prop({ unique: true, sparse: true, uppercase: true })
  referralCode: string;

  @Prop({ trim: true })
  email: string;

  @Prop({ default: false })
  email_verified: boolean;

  @Prop()
  email_verified_at: Date;

  @Prop({ default: false })
  mobile_verified: boolean;

  @Prop()
  mobile_verified_at: Date;

  @Prop()
  profilePhoto: string;

  @Prop({ trim: true })
  streetAddress: string;

  @Prop([String])
  emergencyContacts: string[];

  @Prop({ trim: true })
  addressLineTwo: string;

  @Prop({ trim: true })
  zipCode: string;

  @Prop({ trim: true })
  city: string;

  @Prop({ trim: true })
  state: string;

  @Prop({ trim: true })
  area: string;

  @Prop({ trim: true })
  aadharNumber: string;

  @Prop({ type: Object })
  aadharCard: {
    url: string;
    status: "pending" | "approved" | "rejected";
    reason?: string;
  };

  @Prop({ type: Object })
  aadharCardBack: {
    url: string;
    status: "pending" | "approved" | "rejected";
    reason?: string;
  };

  @Prop({ enum: ["Male", "Female", "Other"] })
  gender: string;

  @Prop()
  dob: Date;

  @Prop()
  deviceBrand: string;

  @Prop()
  deviceModel: string;

  @Prop()
  osVersion: string;

  @Prop()
  osType: string;

  @Prop()
  fcmToken: string;

  @Prop({
    enum: [
      "physiotherapy",
      "occupational_therapy",
      "speech_therapy",
      "nursing",
    ],
  })
  specialization: string;

  @Prop([String])
  subSpecialties: string[];

  @Prop({ unique: true, sparse: true })
  licenseNumber: string;

  @Prop({ type: Types.ObjectId, ref: "User" })
  managerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User" })
  teamLeaderId: Types.ObjectId;

  @Prop()
  experience: number;

  @Prop({ type: Location })
  location: Location;

  @Prop({ type: LiveLocation })
  liveLocation: LiveLocation;

  @Prop([String])
  serviceAreas: string[];

  @Prop([String])
  pincodes: string[];

  @Prop({
    enum: ["ACTIVE", "UNDER_REVIEW", "REJECTED", "SUSPENDED", "DRAFT", "INCOMPLETE"],
    default: "INCOMPLETE",
  })
  status: string;

  @Prop()
  statusReason: string;

  @Prop({ type: Types.ObjectId, ref: "User" })
  statusUpdatedBy: Types.ObjectId;

  @Prop()
  statusUpdatedAt: Date;

  @Prop({
    enum: ["ACTIVE", "UNDER_REVIEW", "REJECTED", "SUSPENDED", "DRAFT", "INCOMPLETE"],
    default: "INCOMPLETE",
  })
  onboardingStatus: string;

  @Prop()
  rejectionReason: string;

  @Prop({ enum: ["Available", "Busy", "Offline"], default: "Offline" })
  availability: string;

  @Prop({ min: 0, max: 5, default: 0 })
  rating: number;

  @Prop({ default: 0 })
  totalReviews: number;

  @Prop({
    type: Object,
    default: { balance: 0, currency: "INR", totalEarned: 0 },
  })
  wallet: {
    balance: number;
    currency: string;
    totalEarned: number;
  };

  @Prop({ default: 0 })
  totalEarnings: number;

  @Prop({ default: 0 })
  walletBalance: number;

  @Prop({ default: 0 })
  penaltyBalance: number;

  @Prop({ default: 0 })
  totalPenalties: number;

  @Prop({ default: 0 })
  fraudCount: number;

  @Prop({ default: 0 })
  fraudScore: number;

  @Prop([String])
  documentUrls: string[];

  @Prop({ type: DigitalId })
  digitalId: DigitalId;

  @Prop({ type: BankDetails })
  bankDetails: BankDetails;

  @Prop({ type: BankDetails })
  bankInfo: BankDetails;

  @Prop({ type: NationalId })
  nationalId: NationalId;

  @Prop({ type: ProfessionalInfo })
  professionalInfo: ProfessionalInfo;

  @Prop({ type: AreaOfServiceInfo })
  areaOfServiceInfo: AreaOfServiceInfo;

  @Prop()
  onboardingStep: string;

  @Prop({ type: Types.ObjectId, ref: "Clinic" })
  clinicId: Types.ObjectId;

  @Prop({ default: "therapist" })
  role: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop({ select: false })
  verification_token: string;

  @Prop({ default: 0 })
  otp_attempt_count: number;

  @Prop()
  otp_expiry_time: Date;
}

export const TherapistSchema = SchemaFactory.createForClass(Therapist);

TherapistSchema.pre("save", function (next) {
  if (this.bankInfo && !this.bankDetails) {
    this.bankDetails = this.bankInfo;
  }
  next();
});

TherapistSchema.index({ licenseNumber: 1 }, { unique: true, sparse: true });
TherapistSchema.index({ email: 1 });
TherapistSchema.index({ phone: 1 });
TherapistSchema.index({ city: 1 });
TherapistSchema.index({ onboardingStatus: 1 });
