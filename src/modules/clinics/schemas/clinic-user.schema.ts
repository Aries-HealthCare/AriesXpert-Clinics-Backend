import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import * as bcrypt from "bcrypt";

export type ClinicUserDocument = ClinicUser & Document;

/**
 * ClinicUser - Users that belong SPECIFICALLY to a registered Clinic.
 * These are completely separate from Core AriesXpert network users.
 * Collection: clinic_users
 */
@Schema({
    collection: "clinic_users",
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
})
export class ClinicUser {
    // === Clinic Association ===
    @Prop({ type: Types.ObjectId, ref: "Clinic", required: true, index: true })
    clinicId: Types.ObjectId;

    // === Personal Info ===
    @Prop({ required: true, trim: true })
    firstName: string;

    @Prop({ trim: true, default: "" })
    lastName: string;

    @Prop({ lowercase: true, trim: true })
    email: string;

    @Prop({ select: false })
    password: string;

    @Prop()
    phone: string;

    @Prop()
    countryCode: string;

    @Prop()
    profileImage: string;

    @Prop({ enum: ["Male", "Female", "Other"] })
    gender: string;

    @Prop()
    dob: Date;

    @Prop()
    address: string;

    // === Role ===
    @Prop({
        required: true,
        enum: [
            "clinic_owner",
            "clinic_admin",
            "clinic_therapist",
            "receptionist",
            "nurse",
            "physiotherapist",
            "accountant",
        ],
        default: "clinic_therapist",
    })
    role: string;

    // === Status ===
    @Prop({
        enum: ["pending_approval", "active", "rejected", "suspended", "inactive"],
        default: "pending_approval",
    })
    status: string;

    @Prop({ default: false })
    isActive: boolean;

    @Prop({ default: false })
    isVerified: boolean;

    // === Professional Details (for Clinic Therapists) ===
    @Prop({ type: Object })
    professionalDetails?: {
        qualification?: string;
        specialisation?: string | string[];
        experienceYears?: number;
        licenseNumber?: string;
        licenseAuthority?: string;
        clinicRole?: string;
    };

    // === Documents ===
    @Prop({ type: Object })
    documents?: {
        idProof?: string;
        addressProof?: string;
        licenseCert?: string;
        degreeCert?: string;
        experienceCert?: string;
        additionalCert?: string;
    };

    // === Auth ===
    @Prop()
    fcmToken: string;

    @Prop()
    lastLogin: Date;

    @Prop({ default: false })
    isDeleted: boolean;
}

export const ClinicUserSchema = SchemaFactory.createForClass(ClinicUser);

// Hash password on save
ClinicUserSchema.pre("save", async function (next) {
    if (!this.isModified("password") || !this["password"]) return next();
    try {
        const salt = await bcrypt.genSalt(12);
        this["password"] = await bcrypt.hash(this["password"], salt);
        next();
    } catch (err) {
        next(err);
    }
});

// Indexes
ClinicUserSchema.index({ clinicId: 1, role: 1 });
ClinicUserSchema.index({ clinicId: 1, isDeleted: 1 });
ClinicUserSchema.index({ email: 1 });
ClinicUserSchema.index({ phone: 1 });
