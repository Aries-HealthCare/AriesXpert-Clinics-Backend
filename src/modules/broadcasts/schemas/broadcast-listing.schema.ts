import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type BroadcastListingDocument = BroadcastListing & Document;

@Schema({ collection: "broadcast_listings", timestamps: true })
export class BroadcastListing {
  @Prop({ type: Types.ObjectId, ref: "Broadcast", required: true })
  broadcast: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  therapist: Types.ObjectId;

  @Prop({ enum: ["PENDING", "ACCEPTED", "REJECTED", "EXPIRED"], default: "PENDING" })
  therapistResponse: string;

  @Prop()
  viewedAt: Date;

  @Prop()
  respondedAt: Date;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isDeleted: boolean;
}

export const BroadcastListingSchema =
  SchemaFactory.createForClass(BroadcastListing);
BroadcastListingSchema.index({ broadcast: 1, therapist: 1 });
