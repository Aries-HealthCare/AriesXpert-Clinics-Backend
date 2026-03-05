import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Schema as MongooseSchema } from "mongoose";

@Schema({ timestamps: true })
export class Chat extends Document {
  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: "User" }] })
  participants: string[];

  @Prop({ default: "direct" })
  type: string; // 'direct' | 'group'

  @Prop({ type: Object })
  lastMessage: {
    content: string;
    senderId: string;
    createdAt: Date;
  };

  @Prop()
  department: string; // Optional: to categorize chats if needed
}

export const ChatSchema = SchemaFactory.createForClass(Chat);
