import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Schema as MongooseSchema } from "mongoose";

export type RoyaltyDocument = Royalty & Document;

@Schema({ timestamps: true })
export class Royalty {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: "Franchise",
    required: true,
  })
  franchiseId: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "Clinic", required: true })
  clinicId: string;

  @Prop({ required: true })
  month: string; // YYYY-MM

  @Prop({ required: true })
  totalRevenue: number;

  @Prop({ required: true })
  royaltyPercentage: number;

  @Prop({ required: true })
  royaltyAmount: number;

  @Prop({
    type: String,
    enum: ["Pending", "Paid", "Overdue", "Waived"],
    default: "Pending",
  })
  status: string;

  @Prop()
  paidDate: Date;

  @Prop()
  transactionId: string;

  @Prop()
  remarks: string;
}

export const RoyaltySchema = SchemaFactory.createForClass(Royalty);
