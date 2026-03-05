import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Schema as MongooseSchema } from "mongoose";

@Schema({ timestamps: true })
export class Message extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "Chat", required: true })
  chatId: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "User", required: true })
  senderId: string;

  @Prop({ required: true })
  content: string;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: "User" }] })
  readBy: string[];
}

export const MessageSchema = SchemaFactory.createForClass(Message);
