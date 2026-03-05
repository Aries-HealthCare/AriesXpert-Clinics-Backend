import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type WalletDocument = Wallet & Document;

@Schema({ timestamps: true })
export class Wallet {
  @Prop({ required: true, unique: true })
  userId: string;

  @Prop({ default: 0 })
  pendingBalance: number; // Not yet locked

  @Prop({ default: 0 })
  lockedBalance: number; // Ready for payout

  @Prop({ default: 0 })
  liabilityBalance: number; // Cash held by user

  @Prop({ default: "INR" })
  currency: string;
}

export const WalletSchema = SchemaFactory.createForClass(Wallet);
