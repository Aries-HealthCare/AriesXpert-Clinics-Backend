import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema({ timestamps: true })
export class Role extends Document {
  @Prop({ required: true, trim: true })
  roleName: string;

  @Prop({ type: [String], default: [] })
  accessForThisRole: string[];

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isDeleted: boolean;
}

export const RoleSchema = SchemaFactory.createForClass(Role);
