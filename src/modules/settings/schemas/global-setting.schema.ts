import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type GlobalSettingDocument = GlobalSetting & Document;

@Schema({ timestamps: true })
export class GlobalSetting {
  @Prop({ required: true, unique: true })
  key: string;

  @Prop({ type: Object, required: true })
  value: any;

  @Prop()
  description: string;
}

export const GlobalSettingSchema = SchemaFactory.createForClass(GlobalSetting);
