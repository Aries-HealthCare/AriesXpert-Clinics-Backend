import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type RolePermissionDocument = RolePermission & Document;

@Schema({ timestamps: true })
export class RolePermission {
    @Prop({ type: Types.ObjectId, ref: "Clinic", required: true })
    clinicId: Types.ObjectId;

    @Prop({ required: true, enum: ["clinic_owner", "clinic_admin", "receptionist", "physiotherapist", "accounts_manager"] })
    role: string;

    @Prop({ type: [String], required: true })
    permissions: string[]; // E.g. "leads.read", "leads.write", "patients.read", etc.

    @Prop({ default: true })
    isActive: boolean;
}

export const RolePermissionSchema = SchemaFactory.createForClass(RolePermission);

RolePermissionSchema.index({ clinicId: 1, role: 1 }, { unique: true });
