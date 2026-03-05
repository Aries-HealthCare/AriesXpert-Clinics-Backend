import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type BroadcastDocument = Broadcast & Document;

@Schema({ timestamps: true })
export class Broadcast {
  @Prop({ type: Types.ObjectId, ref: "Patient", required: true })
  patient: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Clinic" })
  clinicId: Types.ObjectId;

  @Prop({ trim: true })
  medicalConcern: string;

  @Prop({ required: true })
  professionalRole: string;

  @Prop([String])
  serviceTypes: string[];

  @Prop({ required: true })
  preferredAppointmentTime: string;

  @Prop({ required: true, trim: true })
  preferredAppointmentDate: string;

  @Prop({ required: true, trim: true })
  expiresIn: string;

  @Prop({
    type: {
      city: {
        type: String,
        required: true,
      },
      cityId: {
        type: String,
        required: true,
      },
      areas: [String],
      lat: Number,
      lng: Number,
      radius: { type: Number, default: 10 }, // km
    },
    required: true,
  })
  location: {
    city: string;
    cityId: string;
    areas: string[];
    lat?: number;
    lng?: number;
    radius?: number;
  };

  @Prop({ required: true })
  therapistExperience: string;

  @Prop([String])
  therapists: string[];

  @Prop({ enum: ["ACTIVE", "CLOSED", "EXPIRED"], default: "ACTIVE" })
  broadcastStatus: string;

  @Prop({ trim: true })
  amountPerSession: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isDeleted: boolean;
}

export const BroadcastSchema = SchemaFactory.createForClass(Broadcast);

// Index for faster queries
BroadcastSchema.index({ patient: 1, isDeleted: 1 });
BroadcastSchema.index({ broadcastStatus: 1 });
BroadcastSchema.index({ "location.city": 1 });
BroadcastSchema.index({ createdAt: -1 });
