import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type AnnouncementDocument = Announcement & Document;

@Schema({ collection: "announcements", timestamps: true })
export class Announcement {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop({ enum: ["General", "Urgent", "Lead"], default: "General" })
  type: string;

  @Prop({ type: Types.ObjectId, ref: "User" })
  createdBy: Types.ObjectId;

  @Prop({ enum: ["Active", "Closed", "Expired"], default: "Active" })
  status: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: "Therapist" }] })
  interestedTherapists: Types.ObjectId[];

  @Prop({ type: Object })
  metadata: Record<string, any>;
}

export const AnnouncementSchema = SchemaFactory.createForClass(Announcement);
